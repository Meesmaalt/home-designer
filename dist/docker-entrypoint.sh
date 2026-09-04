#!/bin/sh
set -e
# Runtime config for browser (PocketBase URL)
PB_URL="${PB_PUBLIC_URL:-}"
if [ -z "$PB_URL" ]; then
  # Same host, PocketBase default port – filled by JS if empty
  PB_URL=""
fi
cat > /usr/share/nginx/html/env.js << ENVJS
window.__ENV__ = {
  PB_URL: "${PB_URL}"
};
ENVJS
echo "[kodu] env.js PB_URL=${PB_URL:-'(auto)'}"
exec "$@"
