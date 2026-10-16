#!/usr/bin/env bash
# Certbot's default renewal only restarts a systemd-managed nginx — it
# has no idea our Nginx is a Docker container. This hook fixes that.
#
# Install once, on the VPS:
#   cp renew-hook.sh /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
#   chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
# Certbot runs everything in renewal-hooks/deploy/ automatically after
# any successful renewal — no crontab or extra config needed.
set -euo pipefail
cd /opt/social-feed
docker compose -f docker-compose.yml exec nginx nginx -s reload
