// k6 load test for the feed read path — the endpoint whose latency the
// Redis cache-aside layer is actually meant to improve.
//
// Run against a LIVE deployment only (needs the VPS up):
//   k6 run -e BASE_URL=https://yourdomain.duckdns.org load-test/feed-load-test.js
//
// Install k6: https://k6.io/docs/get-started/installation/
//
// Two runs are the actual deliverable, not one:
//   1. Right after deploy (cache cold / mostly empty) — captures worst case
//   2. Immediately re-run (cache warm) — captures the number that actually
//      matters, since cache-aside's whole point is repeat-read latency
// Compare the two p95/p99 numbers in your README — that delta IS the
// proof the caching layer does something, not just a claim that it exists.

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost";

// Custom trend so cache-hit vs cache-miss latency can be compared
// separately, not just lumped into one aggregate number.
const feedLatency = new Trend("feed_latency", true);

export const options = {
  scenarios: {
    ramping_load: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },  // ramp up
        { duration: "1m", target: 50 },   // sustained load
        { duration: "30s", target: 100 }, // spike
        { duration: "30s", target: 0 },   // ramp down
      ],
    },
  },
  thresholds: {
    // Fails the run (non-zero exit) if these aren't met — makes this
    // usable as a real pass/fail gate, not just an observational script.
    http_req_duration: ["p(95)<500", "p(99)<1000"],
    http_req_failed: ["rate<0.01"],
  },
};

// Each VU registers its own user once, then hammers /feed — this
// mirrors a real access pattern (many reads per write) rather than
// creating unrealistic write load.
export function setup() {
  const suffix = Math.random().toString(36).slice(2, 8);
  const creds = { username: `loadtest_${suffix}`, email: `loadtest_${suffix}@example.com`, password: "loadtest123" };

  const res = http.post(`${BASE_URL}/api/auth/register`, JSON.stringify(creds), {
    headers: { "Content-Type": "application/json" },
  });

  check(res, { "setup: registered": (r) => r.status === 201 });

  const cookie = res.cookies.token ? res.cookies.token[0].value : null;
  return { cookie };
}

export default function (data) {
  const params = {
    headers: { Cookie: `token=${data.cookie}` },
  };

  const res = http.get(`${BASE_URL}/api/feed`, params);

  feedLatency.add(res.timings.duration);

  check(res, {
    "status is 200": (r) => r.status === 200,
    "has entries field": (r) => {
      try {
        return "entries" in JSON.parse(r.body);
      } catch {
        return false;
      }
    },
  });

  sleep(1); // roughly one feed refresh per second per simulated user
}
