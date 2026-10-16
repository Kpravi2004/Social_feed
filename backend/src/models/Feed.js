const mongoose = require("mongoose");

// This is the pre-computed, read-optimized copy the fan-out consumer
// keeps in sync. Kept separate from Post (source of truth) on purpose.
const feedEntrySchema = new mongoose.Schema(
  {
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, default: 0 },
    insertedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const feedSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    entries: [feedEntrySchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feed", feedSchema);
