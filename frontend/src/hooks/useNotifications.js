import { useEffect, useRef, useState, useCallback } from "react";

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 15000;

// The backend authenticates this connection during the HTTP upgrade
// handshake using the httpOnly cookie, so no token handling is needed
// here — the browser attaches the cookie to the upgrade request itself.
export function useNotifications({ enabled }) {
  const [connected, setConnected] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const wsRef = useRef(null);
  const attemptRef = useRef(0);
  const timeoutRef = useRef(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws/notifications`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      attemptRef.current = 0; // reset backoff on a clean connection
    };

    ws.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch {
        return;
      }
      if (payload.type === "connected") return; // handshake ack, not a real notification
      setNotifications((prev) => [payload, ...prev].slice(0, 20));
    };

    ws.onclose = () => {
      setConnected(false);
      // Exponential backoff — don't hammer the server if it's down, but
      // recover quickly if it was a momentary blip.
      const delay = Math.min(
        RECONNECT_DELAY_MS * 2 ** attemptRef.current,
        MAX_RECONNECT_DELAY_MS
      );
      attemptRef.current += 1;
      timeoutRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [enabled]);

  useEffect(() => {
    if (enabled) connect();
    return () => {
      clearTimeout(timeoutRef.current);
      wsRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const dismiss = useCallback((index) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return { connected, notifications, dismiss };
}
