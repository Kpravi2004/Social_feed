import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "../api/client";

export function useInfiniteFeed() {
  const [posts, setPosts] = useState([]);
  const [cursor, setCursor] = useState(undefined); // undefined = not loaded yet
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const loadingRef = useRef(false); // guards against duplicate concurrent loads

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await api.getFeed(cursor || undefined);
      setPosts((prev) => [...prev, ...result.entries]);
      setCursor(result.nextCursor);
      setHasMore(Boolean(result.nextCursor));
    } catch (err) {
      setError(err.message);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [cursor, hasMore]);

  // Initial load
  useEffect(() => {
    loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const prependPost = useCallback((post) => {
    setPosts((prev) => [post, ...prev]);
  }, []);

  return { posts, loading, hasMore, error, loadMore, prependPost };
}
