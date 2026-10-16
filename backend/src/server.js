require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const http = require("http");
const jwt = require("jsonwebtoken");
const { WebSocketServer } = require("ws");

const { connectMongo } = require("./config/db");
const { register: metricsRegister, metricsMiddleware } = require("./metrics");
const { register: registerSocket, unregister } = require("./ws/registry");
const { startNotificationBridge } = require("./ws/notifications");

const authRoutes = require("./routes/auth");
const postsRoutes = require("./routes/posts");
const feedRoutes = require("./routes/feed");
const usersRoutes = require("./routes/users");

const app = express();
const server = http.createServer(app);

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:3000", credentials: true }));
app.use(metricsMiddleware);

// Tags every response with which instance served it — this is what makes
// Nginx load balancing visibly provable in a demo recording.
app.use((req, res, next) => {
  res.setHeader("X-Served-By", process.env.INSTANCE_ID || "api");
  next();
});

app.get("/health", (req, res) => res.json({ status: "ok", instance: process.env.INSTANCE_ID }));

app.get("/metrics", async (req, res) => {
  res.set("Content-Type", metricsRegister.contentType);
  res.end(await metricsRegister.metrics());
});

app.use("/auth", authRoutes);
app.use("/posts", postsRoutes);
app.use("/feed", feedRoutes);
app.use("/users", usersRoutes);

// --- WebSocket server for live notifications ---
const wss = new WebSocketServer({ noServer: true });

// Authenticate during the HTTP upgrade handshake rather than after the
// socket opens — an unauthenticated socket never gets established at all.
server.on("upgrade", (req, socket, head) => {
  if (!req.url.startsWith("/ws/notifications")) {
    socket.destroy();
    return;
  }

  const rawCookies = req.headers.cookie || "";
  const token = rawCookies
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("token="))
    ?.slice("token=".length);

  if (!token) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  let userId;
  try {
    userId = jwt.verify(decodeURIComponent(token), process.env.JWT_SECRET).sub;
  } catch (err) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    ws.userId = userId;
    wss.emit("connection", ws, req);
  });
});

wss.on("connection", (ws) => {
  registerSocket(ws.userId, ws);
  ws.send(JSON.stringify({ type: "connected", instance: process.env.INSTANCE_ID }));

  // Heartbeat: without this, dead connections behind Nginx linger and
  // leak memory in the registry.
  ws.isAlive = true;
  ws.on("pong", () => { ws.isAlive = true; });

  ws.on("close", () => unregister(ws.userId, ws));
  ws.on("error", () => unregister(ws.userId, ws));
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);

wss.on("close", () => clearInterval(heartbeat));

const PORT = process.env.PORT || 4000;

async function start() {
  await connectMongo();
  startNotificationBridge();
  server.listen(PORT, () => {
    console.log(`[${process.env.INSTANCE_ID || "api"}] Listening on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
