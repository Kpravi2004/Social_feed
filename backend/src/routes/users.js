const express = require("express");
const mongoose = require("mongoose");
const Follow = require("../models/Follow");
const User = require("../models/User");
const Post = require("../models/Post");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rateLimiter");

const router = express.Router();

router.post("/:id/follow", requireAuth, rateLimiter(), async (req, res) => {
  const followeeId = req.params.id;
  if (followeeId === req.userId) {
    return res.status(400).json({ error: "Cannot follow yourself" });
  }

  const followee = await User.findById(followeeId).select("_id");
  if (!followee) {
    return res.status(404).json({ error: "User not found" });
  }

  // The unique index on (followerId, followeeId) is what actually
  // prevents duplicate follows under concurrent requests — a find-then-
  // insert check would race. We let the DB enforce it and catch E11000.
  try {
    await Follow.create({ followerId: req.userId, followeeId });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Already following" });
    }
    throw err;
  }

  await Promise.all([
    User.updateOne({ _id: followeeId }, { $inc: { followersCount: 1 } }),
    User.updateOne({ _id: req.userId }, { $inc: { followingCount: 1 } }),
  ]);

  res.status(201).json({ following: true });
});

router.delete("/:id/follow", requireAuth, rateLimiter(), async (req, res) => {
  const result = await Follow.deleteOne({ followerId: req.userId, followeeId: req.params.id });
  if (result.deletedCount === 0) {
    return res.status(404).json({ error: "Not following" });
  }

  await Promise.all([
    User.updateOne({ _id: req.params.id }, { $inc: { followersCount: -1 } }),
    User.updateOne({ _id: req.userId }, { $inc: { followingCount: -1 } }),
  ]);

  res.status(204).send();
});

router.get("/:id/followers", async (req, res) => {
  const { cursor, limit = 50 } = req.query;
  const query = { followeeId: req.params.id };
  if (cursor) query._id = { $gt: new mongoose.Types.ObjectId(cursor) };

  const follows = await Follow.find(query)
    .sort({ _id: 1 })
    .limit(Math.min(parseInt(limit, 10), 100))
    .populate("followerId", "username followersCount")
    .lean();

  const nextCursor = follows.length ? follows[follows.length - 1]._id : null;
  res.json({ followers: follows.map((f) => f.followerId), nextCursor });
});

// Discovery: lets users find each other, since there is no search yet.
// Must be declared before "/:id" or Express would treat "people" as an id.
router.get("/", requireAuth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.userId } })
    .select("username followersCount")
    .sort({ createdAt: -1 })
    .limit(50)
    .lean();

  // One query for "who do I already follow" instead of one per user (N+1).
  const follows = await Follow.find({
    followerId: req.userId,
    followeeId: { $in: users.map((u) => u._id) },
  })
    .select("followeeId")
    .lean();
  const followingSet = new Set(follows.map((f) => f.followeeId.toString()));

  res.json({
    users: users.map((u) => ({
      id: u._id,
      username: u.username,
      followersCount: u.followersCount,
      isFollowing: followingSet.has(u._id.toString()),
    })),
  });
});

router.get("/:id/posts", async (req, res) => {
  const posts = await Post.find({ authorId: req.params.id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();
  const author = await User.findById(req.params.id).select("username").lean();

  res.json({
    posts: posts.map((p) => ({
      postId: p._id,
      authorId: p.authorId,
      authorUsername: author?.username || "unknown",
      content: p.content,
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      insertedAt: p.createdAt,
    })),
  });
});

router.get("/:id", optionalAuth, async (req, res) => {
  const user = await User.findById(req.params.id)
    .select("username followersCount followingCount createdAt")
    .lean();
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  let isFollowing = false;
  if (req.userId && req.userId !== req.params.id) {
    const follow = await Follow.exists({ followerId: req.userId, followeeId: req.params.id });
    isFollowing = Boolean(follow);
  }

  res.json({ ...user, isFollowing });
});

module.exports = router;
