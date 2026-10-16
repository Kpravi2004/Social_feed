// Thin fetch wrapper. `credentials: "include"` is what makes the
// httpOnly JWT cookie ride along automatically — no token handling
// needed in JS at all, which is the point of httpOnly cookies.
const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  register: (data) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  logout: () => request("/auth/logout", { method: "POST" }),
  me: () => request("/auth/me"),

  getFeed: (cursor) => request(`/feed${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`),
  createPost: (data) => request("/posts", { method: "POST", body: JSON.stringify(data) }),
  likePost: (id) => request(`/posts/${id}/like`, { method: "POST" }),

  follow: (id) => request(`/users/${id}/follow`, { method: "POST" }),
  unfollow: (id) => request(`/users/${id}/follow`, { method: "DELETE" }),
  getUser: (id) => request(`/users/${id}`),
  getPeople: () => request("/users"),
  getUserPosts: (id) => request(`/users/${id}/posts`),
};
