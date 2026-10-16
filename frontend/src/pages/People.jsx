import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import FollowButton from "../components/FollowButton";

export default function People() {
  const [people, setPeople] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getPeople().then((r) => setPeople(r.users)).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="max-w-2xl mx-auto px-6 py-16 text-center text-sm text-red-400">{error}</p>;
  if (!people) return <p className="max-w-2xl mx-auto px-6 py-16 text-center text-sm text-muted">Loading…</p>;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="font-display text-2xl mb-6">People</h1>

      {people.length === 0 && (
        <p className="text-muted text-sm">No one else has joined yet. Register a second account to try following.</p>
      )}

      {people.map((p) => (
        <div key={p.id} className="flex items-center justify-between border-b border-white/10 py-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-surface border border-white/10 flex items-center justify-center text-sm text-muted font-medium">
              {p.username[0].toUpperCase()}
            </span>
            <div>
              <Link to={`/u/${p.id}`} className="text-sm font-medium hover:text-signal transition-colors">
                {p.username}
              </Link>
              <p className="text-xs text-muted">{p.followersCount} followers</p>
            </div>
          </div>
          <FollowButton userId={p.id} initialFollowing={p.isFollowing} />
        </div>
      ))}
    </div>
  );
}
