#!/usr/bin/env bash
# Chaos test: kills Redis partway through a load test run to prove the
# fail-open design (cache-aside + rate limiter) actually degrades
# gracefully rather than just claiming to in a code comment.
#
# Run this FROM A SECOND TERMINAL while feed-load-test.js is running
# in the first one. It sleeps, kills Redis, sleeps again, restarts it —
# printing timestamps you'll paste into the postmortem.
#
# Usage: ./chaos-redis.sh [compose-project-dir]
set -euo pipefail

PROJECT_DIR="${1:-.}"
cd "$PROJECT_DIR"

KILL_AFTER=30    # seconds to wait before killing Redis
DOWNTIME=20       # seconds Redis stays down
COMPOSE="docker compose -f docker-compose.yml"

echo "[chaos] waiting ${KILL_AFTER}s before killing Redis — make sure"
echo "        the k6 load test is already running in another terminal"
sleep "$KILL_AFTER"

echo "[chaos] $(date -u +%H:%M:%S) UTC — killing redis container now"
$COMPOSE stop redis

echo "[chaos] redis down. Watch the k6 terminal: requests should keep"
echo "        succeeding (cache-aside falls through to Mongo, rate"
echo "        limiter fails open) rather than erroring out."
echo "[chaos] also check: docker compose logs api-1 | grep -i redis"
echo "        — you should see the caught/logged errors, not a crash"

sleep "$DOWNTIME"

echo "[chaos] $(date -u +%H:%M:%S) UTC — restarting redis"
$COMPOSE start redis

echo "[chaos] redis back up. Latency should recover once the cache"
echo "        starts warming again — worth noting in the postmortem"
echo "        whether recovery was instant or gradual."
echo "[chaos] done. Record the two timestamps above in the postmortem."
