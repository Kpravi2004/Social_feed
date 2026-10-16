import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell";

export default function NavBar({ connected, notifications, dismiss }) {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-white/10 sticky top-0 bg-ink/95 backdrop-blur z-10">
      <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-display text-xl tracking-tight">Signal</Link>
          {user && (
            <nav className="flex items-center gap-4 text-sm">
              {[
                ["/", "Home"],
                ["/people", "People"],
                [`/u/${user.id}`, "Profile"],
              ].map(([to, label]) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  className={({ isActive }) =>
                    isActive ? "text-cream" : "text-muted hover:text-cream transition-colors"
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5 text-xs text-muted" title={connected ? "Live" : "Reconnecting…"}>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-signal animate-pulse-live" : "bg-muted"
              }`}
            />
            {connected ? "Live" : "Offline"}
          </div>

          {user && <NotificationBell notifications={notifications} dismiss={dismiss} />}

          {user && (
            <button onClick={logout} className="text-sm text-muted hover:text-cream transition-colors">
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
