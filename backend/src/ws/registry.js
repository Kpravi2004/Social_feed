// Maps userId -> Set of live WebSocket connections on THIS instance.
//
// Important limitation worth understanding: this is per-instance memory.
// If a user is connected to api-1 and the notification event is consumed
// by api-2, api-2 has no socket for them. That's why the notification
// path below goes through Redis pub/sub — every instance subscribes, and
// whichever one holds the socket delivers it.

const connections = new Map();

function register(userId, ws) {
  if (!connections.has(userId)) connections.set(userId, new Set());
  connections.get(userId).add(ws);
}

function unregister(userId, ws) {
  const set = connections.get(userId);
  if (!set) return;
  set.delete(ws);
  if (set.size === 0) connections.delete(userId);
}

function sendToUser(userId, payload) {
  const set = connections.get(userId);
  if (!set || set.size === 0) return false;

  const data = JSON.stringify(payload);
  for (const ws of set) {
    if (ws.readyState === ws.OPEN) ws.send(data);
  }
  return true;
}

module.exports = { register, unregister, sendToUser };
