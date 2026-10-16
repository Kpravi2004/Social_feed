import { useAuth } from "../context/AuthContext";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed";
import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";
import ScrollSentinel from "../components/ScrollSentinel";

export default function Feed() {
  const { user } = useAuth();
  const { posts, loading, hasMore, error, loadMore, prependPost } = useInfiniteFeed();

  function handlePosted(post) {
    prependPost({ ...post, authorUsername: user.username });
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <PostComposer onPosted={handlePosted} />

      {posts.length === 0 && !loading && (
        <div className="text-center py-16">
          <p className="font-display text-lg mb-1">Nothing here yet</p>
          <p className="text-muted text-sm">Follow people or post something to get your feed going.</p>
        </div>
      )}

      <div>
        {posts.map((post) => (
          <PostCard key={post.postId} post={post} />
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-400 text-center py-4">
          Couldn't load more — <button onClick={loadMore} className="underline">try again</button>
        </p>
      )}

      {loading && <p className="text-sm text-muted text-center py-4">Loading…</p>}

      <ScrollSentinel onVisible={loadMore} disabled={!hasMore || loading} />
    </div>
  );
}
