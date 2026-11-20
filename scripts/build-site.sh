#!/usr/bin/env bash
# Builds the public website into dist/ for Cloudflare Pages.
# SITE_MODE (file at repo root) = "maintenance" → only the Back-soon page + build board
#                               = "live"        → the full public site
# Internal files (docs, handbook, admin page, script code) are never copied.
set -euo pipefail
cd "$(dirname "$0")/.."

MODE="$(tr -d '[:space:]' < SITE_MODE)"
rm -rf dist && mkdir -p dist

if [ "$MODE" = "maintenance" ]; then
  cp maintenance.html dist/maintenance.html
  cp maintenance.html dist/index.html
  cp maintenance.html dist/404.html
  cp build.html dist/build.html
else
  for f in *.html robots.txt; do
    case "$f" in
      admin.html|handbook.html|maintenance.html) ;;
      *) cp "$f" dist/ ;;
    esac
  done
  cp -R assets js dist/
  rm -f dist/js/admin.js dist/js/payment-fixed.js dist/assets/images/key-holder.jpg
  cp maintenance.html dist/maintenance.html
fi

cp cloudflare/_headers dist/_headers
echo "Built dist/ in $MODE mode: $(find dist -type f | wc -l | tr -d ' ') files"
