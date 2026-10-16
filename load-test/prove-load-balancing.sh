#!/usr/bin/env bash
# Hits /api/health repeatedly and prints which instance served each
# response. Run this while screen-recording — the alternating api-1/
# api-2 output is a direct, demonstrable artifact of Nginx round-robin
# load balancing, not just a claim in a README.
#
# Usage: ./prove-load-balancing.sh https://yourdomain.duckdns.org
set -euo pipefail

BASE_URL="${1:?Usage: ./prove-load-balancing.sh <base-url>}"

for i in $(seq 1 12); do
  served_by=$(curl -s -D - -o /dev/null "${BASE_URL}/api/health" | grep -i "x-served-by:" | tr -d '\r')
  echo "Request $i → ${served_by:-<no header found>}"
  sleep 0.3
done
