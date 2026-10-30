#!/bin/sh
set -e
# Runs as root only to fix volume ownership, then drops to the unprivileged user "kk".
if [ "$(id -u)" = "0" ]; then
  chown -R kk:kk "$KK_DATA_DIR" 2>/dev/null || true
  exec setpriv --reuid=kk --regid=kk --init-groups "$0" "$@"
fi
# First start (or KK_SEED=always): load sources, example themes and demo boards.
# The seed runs in the background so the server is healthy at once; the server picks up queued references.
if [ ! -f "$KK_DATA_DIR/kiekkist.db" ] || [ "$KK_SEED" = "always" ]; then
  if [ "$KK_SEED" != "off" ]; then
    node -e "import('./src/db.js')" # create the schema before the server starts
    (node seed/seed.js $KK_SEED_FLAGS > "$KK_DATA_DIR/seed.log" 2>&1 || echo "seed failed (non-fatal)") &
  fi
fi
exec node src/server.js
