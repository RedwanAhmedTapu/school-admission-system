#!/bin/sh
# Writes the backend URL into config.js at container start, so it is configurable by the
# API_URL environment variable without rebuilding the image.
set -e
ESCAPED=$(printf '%s' "${API_URL:-http://localhost:8080}" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.__APP_CONFIG__ = { apiUrl: "%s" };\n' "$ESCAPED" > /usr/share/nginx/html/config.js
