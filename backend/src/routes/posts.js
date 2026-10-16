const express = require("express");
const Post = require("../models/Post");
const { requireAuth } = require("../middleware/auth");
const { rateLimiter } = require("../middleware/rateLimiter");
const { getProducer, TOPICS } = require("../config/kafka");
const { publishNotification } = require("../ws/notifications");

const router = express.Router();

router.post("/", requireAuth, rateLimiter({ capacity: 10, refillPerSec: 1 }), async (req, res) => {
  const { content, mediaUrl } = req.body;
  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  const post = await Post.create({ authorId: req.userId, content, mediaUrl });

  // Publish instead of writing to every follower's feed synchronously —
  // the consumer service does the fan-out asynchronously.
  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.POST_CREATED,
    messages: [{ value: JSON.stringify({ postId: post._id, authorId: req.userId, createdAt: post.createdAt }) }],
  });

  // Shaped to match hydrated feed entries so the frontend can prepend
  // this directly to the feed list without a refetch.
  // authorUsername is attached client-side from the logged-in user's own
  // session (we already have it there) rather than adding a DB lookup here.
  res.status(201).json({
    postId: post._id,
    authorId: post.authorId,
    content: post.content,
    mediaUrl: post.mediaUrl,
    likeCount: post.likeCount,
    commentCount: post.commentCount,
    insertedAt: post.createdAt,
  });
});

router.post("/:id/like", requireAuth, rateLimiter(), async (req, res) => {
  const post = await Post.findByIdAndUpdate(
    req.params.id,
    { $inc: { likeCount: 1 } },
    { new: true }
  );
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }

  const producer = await getProducer();
  await producer.send({
    topic: TOPICS.POST_LIKED,
    messages: [{ value: JSON.stringify({ postId: post._id, likedBy: req.userId }) }],
  });

  // Notify the post author in real time. Goes through Redis pub/sub so it
  // reaches them even if their socket is held by the other instance.
  if (post.authorId.toString() !== req.userId) {
    await publishNotification(post.authorId.toString(), {
      type: "like",
      postId: post._id,
      likedBy: req.userId,
    });
  }

  res.json({ likeCount: post.likeCount });
});

router.get("/:id", async (req, res) => {
  const post = await Post.findById(req.params.id).populate("authorId", "username").lean();
  if (!post) {
    return res.status(404).json({ error: "Post not found" });
  }
  res.json(post);
});

module.exports = router;
