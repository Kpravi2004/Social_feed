import { useState } from "react";
import { api } from "../api/client";

export default function FollowButton({ userId, initialFollowing, onChange }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, setPending] = useState(false);

  async function toggle() {
    if (pending) return;
    const was = following;
    setFollowing(!was);
    setPending(true);

    try {
      if (was) {
        await api.unfollow(userId);
      } else {
        await api.follow(userId);
      }
      onChange?.(!was);
    } catch (err) {
      setFollowing(was); // roll back on failure, same pattern as the like button
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={pending}
      className={`text-sm font-medium rounded-md px-4 py-1.5 transition-colors disabled:opacity-50 ${
        following
          ? "border border-white/15 text-cream hover:border-red-400/50 hover:text-red-400"
          : "bg-signal text-ink hover:bg-signal/90"
      }`}
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
