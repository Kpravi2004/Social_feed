# Incident Postmortem: Redis Outage Under Load (Deliberate)

*This was a deliberate chaos test, not a real incident — run to verify
the fail-open design actually works under real conditions, not just in
a code comment.*

## Summary

<!-- One or two sentences: what was tested, what happened. -->

## Timeline (UTC)

| Time | Event |
|---|---|
|  | Load test started (`k6 run feed-load-test.js`) |
|  | Redis killed (`chaos-redis.sh`) |
|  | First observed effect (fill in: latency change? error rate? nothing?) |
|  | Redis restarted |
|  | Latency/error rate returned to baseline |

## What was expected to happen

- `/feed` reads: cache-aside try/catch should fall through to MongoDB
  on a Redis error — requests succeed, just slower (no cache hit).
- Rate limiter: fails open on Redis error — requests are allowed
  through rather than rejected.
- No 5xx spike, no dropped connections attributable to Redis itself.

## What actually happened

<!--
Fill in from the k6 output and docker compose logs during the window:
- Did http_req_failed stay near 0, or spike?
- Did p95/p99 latency rise (expected — no cache) or did requests
  start failing outright (not expected — would mean fail-open has a bug)?
- Any errors in `docker compose logs api-1 api-2` during the window
  that look like unhandled crashes rather than the caught/logged
  "Cache read failed, falling back to Mongo" lines?
-->

## Metrics comparison

| Metric | Before (Redis up) | During (Redis down) | After (Redis restored) |
|---|---|---|---|
| p50 latency |  |  |  |
| p95 latency |  |  |  |
| p99 latency |  |  |  |
| Error rate |  |  |  |

## Root cause

N/A — deliberate test, not a failure. (If anything DID break that
wasn't supposed to, document the actual bug here and treat it as a
real finding, not a footnote.)

## What this proves (or disproves)

<!--
Be honest here — this is worth more in an interview if it's genuine.
Did the fail-open design work as intended? Did recovery happen
automatically once Redis came back, or did anything need a manual
restart? Was there a gap between "Redis is back" and "cache is warm
again" that's worth noting?
-->

## Follow-ups

<!-- Anything you'd change based on this test. -->
