const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function issueToken(res, userId) {
  const token = jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
  res.cookie("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "username, email, and password are required" });
  }

  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) {
    return res.status(409).json({ error: "Username or email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ username, email, passwordHash });

  issueToken(res, user._id.toString());
  res.status(201).json({ id: user._id, username: user.username });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  issueToken(res, user._id.toString());
  res.json({ id: user._id, username: user.username });
});

router.post("/logout", (req, res) => {
  res.clearCookie("token");
  res.status(204).send();
});

// Lets the frontend check "am I logged in" on page load without
// storing anything itself — the httpOnly cookie is the only state.
router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.userId).select("username email");
  if (!user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  res.json({ id: user._id, username: user.username, email: user.email });
});

module.exports = router;
