#!/usr/bin/env bash
# Builds the site, guards dist/, and publishes it to the gh-pages branch without force-pushing.
#
#   GH_DEPLOY_TOKEN=<token with contents:write on the repo> npm run deploy
#
# The token is read from the environment by an inline git credential helper, so it is never
# written to .git/config, a remote URL, or the command line.
set -euo pipefail

REPO="${DEPLOY_REPO:-mizcausevic-dev/basement-protocol}"
BRANCH="gh-pages"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIST="$ROOT/dist"

if [[ -z "${GH_DEPLOY_TOKEN:-}" ]]; then
  echo "GH_DEPLOY_TOKEN is not set." >&2
  exit 1
fi
export GH_DEPLOY_TOKEN
export GIT_TERMINAL_PROMPT=0

cd "$ROOT"
python3 generator/basement_protocol.py
python3 generator/validate.py
node scripts/validate-tonejs.mjs
npm run build

echo "== preflight: extension allowlist"
ALLOWED='html|js|css|svg|webp|jpg|png|ico|woff|woff2|json|csv|mid|zip|txt|md|xml|mp4|vtt|pdf'
bad=$(find "$DIST" -type f ! -name '.nojekyll' | grep -Ev "\.(${ALLOWED})$" || true)
if [[ -n "$bad" ]]; then
  echo "Refusing to deploy files outside the allowlist:" >&2
  echo "$bad" >&2
  exit 1
fi

echo "== preflight: no source, config, or secrets in dist"
leaks=$(find "$DIST" -type f \( -name '*.py' -o -name '*.sh' -o -name '*.map' -o -name '.env*' -o -name 'package*.json' -o -name 'tsconfig*' \) || true)
if [[ -n "$leaks" ]]; then
  echo "Refusing to deploy build-only files:" >&2
  echo "$leaks" >&2
  exit 1
fi
if grep -rIlE 'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}' "$DIST"; then
  echo "Refusing to deploy: something that looks like a GitHub token is in dist." >&2
  exit 1
fi

SHA="$(git rev-parse --short HEAD 2>/dev/null || echo local)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

git_auth() {
  git -c credential.helper= \
      -c credential.helper='!f() { echo username=x-access-token; echo "password=${GH_DEPLOY_TOKEN}"; }; f' "$@"
}

URL="https://github.com/${REPO}.git"
if git_auth ls-remote --exit-code --heads "$URL" "$BRANCH" >/dev/null 2>&1; then
  git_auth clone --quiet --depth 1 --branch "$BRANCH" "$URL" "$WORK/site"
  find "$WORK/site" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
else
  git init --quiet "$WORK/site"
  git -C "$WORK/site" checkout --quiet --orphan "$BRANCH"
  git -C "$WORK/site" remote add origin "$URL"
fi

cp -R "$DIST"/. "$WORK/site/"
cd "$WORK/site"
git add -A
if git diff --cached --quiet; then
  echo "gh-pages already matches this build."
  exit 0
fi
git -c user.name="$(git -C "$ROOT" config user.name)" -c user.email="$(git -C "$ROOT" config user.email)" \
  commit --quiet -m "Deploy ${SHA}"
git_auth push --quiet origin "HEAD:${BRANCH}"
echo "Pushed ${SHA} to ${REPO}@${BRANCH}"
echo "After Pages finishes building, verify with: bash scripts/verify-live.sh"
