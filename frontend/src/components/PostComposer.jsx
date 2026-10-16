import { useState } from "react";
import { api } from "../api/client";

const MAX_LENGTH = 2000;

export default function PostComposer({ onPosted }) {
  const [content, setContent] = useState("");
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim()) return;

    setPosting(true);
    setError(null);
    try {
      const post = await api.createPost({ content });
      setContent("");
      onPosted(post);
    } catch (err) {
      setError(err.message);
    } finally {
      setPosting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-white/10 rounded-lg p-4 mb-6 bg-surface/50">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        maxLength={MAX_LENGTH}
        placeholder="What's happening?"
        rows={3}
        className="w-full bg-transparent text-cream placeholder:text-muted text-sm resize-none outline-none"
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-muted">{content.length}/{MAX_LENGTH}</span>
        {error && <span className="text-xs text-red-400">{error}</span>}
        <button
          type="submit"
          disabled={posting || !content.trim()}
          className="bg-signal text-ink text-sm font-medium rounded-md px-4 py-1.5 hover:bg-signal/90 disabled:opacity-40 transition-colors"
        >
          {posting ? "Posting…" : "Post"}
        </button>
      </div>
    </form>
  );
}
