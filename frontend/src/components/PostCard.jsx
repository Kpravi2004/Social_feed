import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export default function PostCard({ post }) {
  // Optimistic UI: flip the visual state and count immediately, roll
  // back only if the request actually fails. The user never waits on
  // network latency to see feedback.
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [pending, setPending] = useState(false);

  async function handleLike() {
    if (pending) return;
    const wasLiked = liked;

    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setPending(true);

    try {
      await api.likePost(post.postId || post._id);
    } catch (err) {
      // Roll back on failure
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="border-b border-white/10 py-5">
      <div className="flex items-center gap-2.5 mb-2">
        <span className="w-7 h-7 rounded-full bg-surface border border-white/10 flex items-center justify-center text-xs text-muted font-medium shrink-0">
          {(post.authorUsername || "?")[0].toUpperCase()}
        </span>
        <Link to={`/u/${post.authorId}`} className="text-sm font-medium hover:text-signal transition-colors">
          {post.authorUsername || "user"}
        </Link>
        <span className="text-muted text-sm">· {timeAgo(post.insertedAt || post.createdAt)}</span>
      </div>

      <p className="text-[15px] leading-relaxed mb-3">{post.content}</p>

      <button
        onClick={handleLike}
        className={`flex items-center gap-1.5 text-sm transition-colors ${
          liked ? "text-signal" : "text-muted hover:text-cream"
        }`}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={liked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        {likeCount > 0 && likeCount}
      </button>
    </article>
  );
}
