#!/usr/bin/env bash
# Run ONCE on a fresh VPS (tested against Ubuntu 22.04/24.04) to prepare
# it for hosting this project. Run as root or with sudo.
#
# Usage: DOMAIN=yourname.duckdns.org EMAIL=you@example.com ./vps-setup.sh
set -euo pipefail

: "${DOMAIN:?Set DOMAIN, e.g. DOMAIN=yourname.duckdns.org}"
: "${EMAIL:?Set EMAIL for Let's Encrypt renewal notices}"

echo "==> Updating system packages"
apt-get update -y
apt-get upgrade -y

echo "==> Installing Docker"
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker
else
  echo "Docker already installed, skipping"
fi

echo "==> Installing Certbot"
apt-get install -y certbot

echo "==> Configuring firewall (ufw)"
apt-get install -y ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo "==> Requesting TLS certificate for $DOMAIN"
echo "    NOTE: this requires the domain's A record to already point at"
echo "    this server's IP, and port 80 to be free (stop any running"
echo "    nginx container first if this isn't the very first run)."
certbot certonly --standalone \
  --non-interactive --agree-tos \
  -m "$EMAIL" \
  -d "$DOMAIN"

echo "==> Symlinking cert into the project's expected path"
mkdir -p /opt/social-feed/certbot/conf
ln -sfn /etc/letsencrypt/live "/opt/social-feed/certbot/conf/live"
ln -sfn /etc/letsencrypt/archive "/opt/social-feed/certbot/conf/archive"

echo "==> Setting up auto-renewal (certbot installs a systemd timer by"
echo "    default on most distros — verifying it's active)"
systemctl list-timers | grep -i certbot || echo "WARNING: no certbot timer found, check 'certbot renew --dry-run' manually"

echo ""
echo "Done. Next steps:"
echo "  1. Clone your repo into /opt/social-feed"
echo "  2. Copy .env.example to .env and fill in real values"
echo "  3. Edit nginx.conf's server_name to $DOMAIN"
echo "  4. cd /opt/social-feed && docker compose -f docker-compose.yml up -d --build"
