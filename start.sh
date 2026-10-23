#!/bin/sh
set -eu

cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "[ERROR] Node.js not found. Install Node.js 14.17 or newer." >&2
  exit 1
fi

PORT="${QMTSW_PORT:-3211}"
URL="http://127.0.0.1:${PORT}"
echo "Starting server at ${URL}"

if [ "${QMTSW_NO_BROWSER:-0}" != "1" ]; then
  (
    sleep 1
    if command -v open >/dev/null 2>&1; then
      open "${URL}"
    elif command -v xdg-open >/dev/null 2>&1; then
      xdg-open "${URL}"
    fi
  ) &
fi

exec node server.js
