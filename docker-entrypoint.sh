#!/bin/sh
# Runs as root for a few milliseconds, then hands off to the unprivileged `node` user.
#
# A container volume is mounted by the host and is not governed by the image's ownership: on a
# fresh deploy a mounted disk arrives owned by root, while the app runs as `node`. Uploads would
# then fail with EACCES on a service that looks perfectly healthy — /ready is green, the site
# serves, and only the first image upload breaks. Chowning at start removes that failure mode
# without giving up running the app unprivileged.
set -e

for dir in "${UPLOAD_DIR:-/app/server/uploads}" "${PRIVATE_UPLOAD_DIR:-/app/server/uploads-private}"; do
  case "$dir" in
    /*) target="$dir" ;;
    *) target="/app/server/$dir" ;; # relative paths resolve against WORKDIR, same as the app
  esac
  mkdir -p "$target"
  chown -R node:node "$target"
done

exec su-exec node "$@"
