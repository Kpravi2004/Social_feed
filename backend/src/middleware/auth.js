const jwt = require("jsonwebtoken");

function requireAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.sub;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Sets req.userId when a valid session exists, but never blocks the
// request — for routes like a public profile page that render
// differently for a logged-in viewer (e.g. showing a Follow button)
// without requiring login to view at all.
function optionalAuth(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return next();

  try {
    req.userId = jwt.verify(token, process.env.JWT_SECRET).sub;
  } catch (err) {
    // Invalid/expired token on an optional route — proceed as anonymous
    // rather than rejecting, since the route doesn't require auth.
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
