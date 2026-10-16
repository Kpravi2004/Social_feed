import { useState, useRef, useEffect } from "react";

function describeNotification(n) {
  if (n.type === "like") return "Someone liked your post";
  return "New activity";
}

export default function NotificationBell({ notifications, dismiss }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative text-muted hover:text-cream transition-colors"
        aria-label="Notifications"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-signal" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 bg-surface border border-white/10 rounded-lg shadow-xl overflow-hidden">
          {notifications.length === 0 ? (
            <p className="text-sm text-muted px-4 py-6 text-center">Nothing new</p>
          ) : (
            notifications.map((n, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 text-sm border-b border-white/5 last:border-0"
              >
                <span>{describeNotification(n)}</span>
                <button
                  onClick={() => dismiss(i)}
                  className="text-muted hover:text-cream text-xs"
                  aria-label="Dismiss"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
