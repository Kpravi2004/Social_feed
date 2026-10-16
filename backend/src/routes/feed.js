const express = require("express");
const Feed = require("../models/Feed");
const Post = require("../models/Post");
const Follow = require("../models/Follow");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");
const redis = require("../config/redis");

const router = express.Router();

const PAGE_SIZE = 20;
const CACHE_TTL_SECONDS = 30;

// The read half of the hybrid fan-out. Precomputed entries come from the
// Feed document (written by the consumer for normal authors). Celebrity
// authors were skipped at write time, so their posts get queried and
// merged in here.
async function fetchCelebrityPosts(userId, before) {
  const celebrityIds = await redis.smembers("celebrities");
  if (!celebrityIds.length) return [];

  const followed = await Follow.find({
    followerId: userId,
    followeeId: { $in: celebrityIds },
  })
    .select("followeeId")
    .lean();

  if (!followed.length) return [];

  const query = { authorId: { $in: followed.map((f) => f.followeeId) } };
  if (before) query.createdAt = { $lt: before };

  const posts = await Post.find(query)
    .sort({ createdAt: -1 })
    .limit(PAGE_SIZE)
    .select("_id authorId createdAt")
    .lean();

  return posts.map((p) => ({
    postId: p._id,
    authorId: p.authorId,
    score: 0,
    insertedAt: p.createdAt,
  }));
}

// The Feed document only stores postId/authorId/insertedAt — a pointer,
// not the rendered content. This hydrates one page of pointers into full
// post objects the frontend can actually display, in a single batched
// query rather than N+1 lookups.
async function hydrate(entries) {
  if (!entries.length) return [];

  const postIds = entries.map((e) => e.postId);
  const authorIds = [...new Set(entries.map((e) => e.authorId.toString()))];

  const [posts, authors] = await Promise.all([
    Post.find({ _id: { $in: postIds } }).select("content mediaUrl likeCount commentCount").lean(),
    User.find({ _id: { $in: authorIds } }).select("username").lean(),
  ]);

  const postMap = new Map(posts.map((p) => [p._id.toString(), p]));
  const authorMap = new Map(authors.map((u) => [u._id.toString(), u.username]));

  return entries
    .map((e) => {
      const post = postMap.get(e.postId.toString());
      if (!post) return null; // post was deleted after the pointer was written
      return {
        postId: e.postId,
        authorId: e.authorId,
        authorUsername: authorMap.get(e.authorId.toString()) || "unknown",
        content: post.content,
        mediaUrl: post.mediaUrl,
        likeCount: post.likeCount,
        commentCount: post.commentCount,
        insertedAt: e.insertedAt,
      };
    })
    .filter(Boolean);
}

router.get("/", requireAuth, async (req, res) => {
  const { cursor } = req.query;
  const cacheKey = `feed:${req.userId}:${cursor || "start"}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      return res.json(JSON.parse(cached));
    }
  } catch (err) {
    console.error("Cache read failed, falling back to Mongo:", err.message);
  }

  res.setHeader("X-Cache", "MISS");

  const before = cursor ? new Date(cursor) : null;

  const [feedDoc, celebrityEntries] = await Promise.all([
    Feed.findOne({ userId: req.userId }).lean(),
    fetchCelebrityPosts(req.userId, before),
  ]);

  let precomputed = feedDoc?.entries || [];
  if (before) {
    precomputed = precomputed.filter((e) => new Date(e.insertedAt) < before);
  }

  const mergedPointers = [...precomputed, ...celebrityEntries]
    .sort((a, b) => new Date(b.insertedAt) - new Date(a.insertedAt))
    .slice(0, PAGE_SIZE);

  const entries = await hydrate(mergedPointers);

  const nextCursor =
    mergedPointers.length === PAGE_SIZE ? mergedPointers[mergedPointers.length - 1].insertedAt : null;
  const result = { entries, nextCursor };

  try {
    await redis.set(cacheKey, JSON.stringify(result), "EX", CACHE_TTL_SECONDS);
  } catch (err) {
    console.error("Cache write failed:", err.message);
  }

  res.json(result);
});

module.exports = router;
