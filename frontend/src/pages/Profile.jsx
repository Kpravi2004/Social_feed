import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";
import FollowButton from "../components/FollowButton";
import PostCard from "../components/PostCard";

export default function Profile() {
  const { id } = useParams();
  const { user: viewer } = useAuth();
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    setProfile(null);
    setError(null);
    setPosts([]);
    api.getUser(id).then(setProfile).catch((err) => setError(err.message));
    api.getUserPosts(id).then((r) => setPosts(r.posts)).catch(() => {});
  }, [id]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <p className="text-muted text-sm">{error}</p>
        <Link to="/" className="text-signal text-sm hover:underline">
          Back to feed
        </Link>
      </div>
    );
  }

  if (!profile) {
    return <div className="max-w-2xl mx-auto px-6 py-16 text-center text-muted text-sm">Loading…</div>;
  }

  const isOwnProfile = viewer?.id === id;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <span className="w-14 h-14 rounded-full bg-surface border border-white/10 flex items-center justify-center text-xl text-muted font-medium shrink-0">
            {profile.username[0].toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-2xl mb-1">{profile.username}</h1>
            <div className="flex gap-4 text-sm text-muted">
              <span>{profile.followersCount} followers</span>
              <span>{profile.followingCount} following</span>
            </div>
          </div>
        </div>

        {!isOwnProfile && (
          <FollowButton
            userId={id}
            initialFollowing={profile.isFollowing}
            onChange={(following) =>
              setProfile((p) => ({
                ...p,
                followersCount: p.followersCount + (following ? 1 : -1),
              }))
            }
          />
        )}
      </div>

      <div className="mt-8">
        {posts.length === 0 ? (
          <p className="text-muted text-sm">No posts yet.</p>
        ) : (
          posts.map((post) => <PostCard key={post.postId} post={post} />)
        )}
      </div>
    </div>
  );
}
