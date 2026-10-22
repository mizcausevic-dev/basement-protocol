#!/usr/bin/env bash
# Probes the live site: the right things must load, and build-only paths must not resolve.
set -uo pipefail

BASE="${1:-https://mizcausevic-dev.github.io/basement-protocol}"
fail=0

expect() {
  local want="$1" path="$2"
  local got
  got=$(curl -s -o /dev/null -w '%{http_code}' "${BASE}${path}")
  if [[ "$got" == "$want" ]]; then
    printf 'ok   %s %s\n' "$got" "$path"
  else
    printf 'FAIL %s %s (expected %s)\n' "$got" "$path" "$want"
    fail=1
  fi
}

for p in / /article.html /media.html /pack/manifest-Cursor.json /pack/validation-report-Cursor.json \
         /pack/basement-protocol-50-bass-midi-Cursor.zip /pack/midi/BP44_acid-rain-Cursor.mid \
         /images/og-hero.jpg /sitemap.xml \
         /media/basement-protocol-commercial-16x9-Cursor.mp4 \
         /media/basement-protocol-commercial-9x16-Cursor.mp4 \
         /media/basement-protocol-commercial-1x1-Cursor.mp4 \
         /media/basement-protocol-commercial-Cursor.vtt \
         /media/media-manifest-Cursor.json \
         /media/social/posts-Cursor.json \
         /media/social/og-card-1200x630-Cursor.jpg \
         /media/social/basement-protocol-carousel-Cursor.pdf; do
  expect 200 "$p"
done

for p in /generator/basement_protocol.py /scripts/deploy-gh-pages.sh /package.json /src/main.tsx \
         /vite.config.ts /.git/config /.env; do
  expect 404 "$p"
done

exit "$fail"
