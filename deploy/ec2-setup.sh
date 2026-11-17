#!/usr/bin/env bash
set -euo pipefail

# SecureChat EC2 Ubuntu 24.04 Bootstrap Script
DOMAIN="${1:-18-140-114-212.sslip.io}"

echo "==> Installing Docker, Nginx, and Certbot..."
curl -fsSL https://get.docker.com | sudo sh
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Configuring Nginx site for ${DOMAIN}..."
sudo cp deploy/nginx-securechat.conf /etc/nginx/sites-available/securechat
sudo sed -i "s/18-140-114-212.sslip.io/${DOMAIN}/g" /etc/nginx/sites-available/securechat
sudo ln -sf /etc/nginx/sites-available/securechat /etc/nginx/sites-enabled/securechat
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

if [ ! -f .env ]; then
  echo "ERROR: Create .env from .env.example before running docker compose!"
  exit 1
fi

echo "==> Starting SecureChat Docker containers..."
sudo docker compose up -d --build

echo "==> Requesting Let's Encrypt HTTPS certificate for ${DOMAIN}..."
sudo certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos --register-unsafely-without-email --redirect

echo "==> SecureChat deployment complete: https://${DOMAIN}"
