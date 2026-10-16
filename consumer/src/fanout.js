const Follow = require("./models/Follow");
const Feed = require("./models/Feed");
const User = require("./models/User");
const redis = require("./config/redis");

// --- The central design decision of this project ---
//
// Fan-out-on-write: when a user posts, immediately push that post into
// every follower's precomputed Feed document. Reads become dead simple
// (one document lookup), but a post by someone with 1M followers means
// 1M writes. Fine for normal users, catastrophic for celebrities.
//
// Fan-out-on-read: don't precompute anything. At read time, look up who
// the user follows and query their recent posts. Writes are cheap, reads
// are expensive. Fine for celebrities, wasteful for everyone else.
//
// Hybrid: use fan-out-on-write below the threshold, and mark high-follower
// accounts as "celebrity" so their posts are merged in at read time instead.
// This is how Twitter and Instagram actually solved it.

const CELEBRITY_FOLLOWER_THRESHOLD = 10000;
const FANOUT_BATCH_SIZE = 500;
const MAX_FEED_ENTRIES = 1000;

async function isCelebrity(authorId) {
  const user = await User.findById(authorId).select("followersCount").lean();
  return (user?.followersCount || 0) >= CELEBRITY_FOLLOWER_THRESHOLD;
}

async function fanOutPost({ postId, authorId, createdAt }) {
  if (await isCelebrity(authorId)) {
    // Skip the write fan-out entirely. Mark the author in Redis so the
    // feed read path knows to pull their posts in at query time.
    await redis.sadd("celebrities", authorId.toString());
    console.log(`[fanout] ${authorId} is a celebrity — deferring to read-time merge`);
    return { strategy: "read", followersWritten: 0 };
  }

  const entry = {
    postId,
    authorId,
    score: 0,
    insertedAt: createdAt ? new Date(createdAt) : new Date(),
  };

  let written = 0;
  let lastId = null;

  // Batch through followers rather than loading them all into memory —
  // keeps memory flat regardless of follower count.
  while (true) {
    const query = { followeeId: authorId };
    if (lastId) query._id = { $gt: lastId };

    const batch = await Follow.find(query)
      .sort({ _id: 1 })
      .limit(FANOUT_BATCH_SIZE)
      .select("followerId")
      .lean();

    if (batch.length === 0) break;

    const ops = batch.map((f) => ({
      updateOne: {
        filter: { userId: f.followerId },
        update: {
          $push: {
            entries: {
              $each: [entry],
              $sort: { insertedAt: -1 },
              // Cap the stored feed so documents don't grow unbounded
              // and hit MongoDB's 16MB document limit.
              $slice: MAX_FEED_ENTRIES,
            },
          },
        },
        upsert: true,
      },
    }));

    await Feed.bulkWrite(ops, { ordered: false });
    written += batch.length;
    lastId = batch[batch.length - 1]._id;

    // Invalidate cached feed pages for these followers so they see the
    // new post instead of waiting out the 30s TTL.
    const keys = batch.map((f) => `feed:${f.followerId}:start`);
    if (keys.length) await redis.del(...keys);
  }

  // Authors should see their own posts in their own feed too. Followers
  // are the only recipients above, so write the author's copy separately.
  await Feed.updateOne(
    { userId: authorId },
    { $push: { entries: { $each: [entry], $sort: { insertedAt: -1 }, $slice: MAX_FEED_ENTRIES } } },
    { upsert: true }
  );
  await redis.del(`feed:${authorId}:start`);

  console.log(`[fanout] post ${postId} written to ${written} feeds (+ author's own)`);
  return { strategy: "write", followersWritten: written };
}

async function handleLike({ postId, likedBy }) {
  // Likes don't change feed membership, only ranking signals. Bump a
  // counter in Redis that the scoring logic can read later.
  await redis.zincrby("post:engagement", 1, postId.toString());
  console.log(`[like] post ${postId} liked by ${likedBy}`);
}

module.exports = { fanOutPost, handleLike, CELEBRITY_FOLLOWER_THRESHOLD };
