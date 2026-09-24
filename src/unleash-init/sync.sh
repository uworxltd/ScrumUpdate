#!/bin/sh
# sync.sh — one-shot Unleash init/sync job (KFX-931).
#
# Part of the docker compose stack. Runs AFTER the Unleash server is healthy and:
#   - creates any feature flags missing from features-map.json,
#   - enforces each feature's `defaultEnabled` state (the map is the source of
#     truth — manual admin-UI toggles are reverted on the next `docker compose up`),
#   - ensures the required custom context fields exist.
#
# Admin credentials are passed via environment (UNLEASH_ADMIN_USERNAME /
# UNLEASH_ADMIN_PASSWORD) and consumed only by this short-lived job — they are
# never placed in a long-running application container.
#
# Requires: curl, jq. POSIX sh only (runs under busybox ash in the container).
# The container exits non-zero on any hard failure so that `docker compose up`
# surfaces problems.
set -eu

BASE_URL="${UNLEASH_URL:-http://unleash:4242}"
ADMIN_USERNAME="${UNLEASH_ADMIN_USERNAME:-admin}"
ADMIN_PASSWORD="${UNLEASH_ADMIN_PASSWORD:-unleash4all}"
PROJECT="${UNLEASH_PROJECT:-default}"
ENVIRONMENT="${UNLEASH_ENVIRONMENT:-development}"
MAP_FILE="${UNLEASH_FEATURES_MAP:-/features-map.json}"

if [ ! -f "$MAP_FILE" ]; then
  echo "FATAL: features map not found at $MAP_FILE" >&2
  exit 1
fi

# Some feature types in the map (e.g. 'experiment', 'operational') map cleanly to
# Unleash types; anything else falls back to 'release'.
type_of() {
  case "$1" in
    release|experiment|operational|kill-switch|permission) echo "$1" ;;
    *) echo "release" ;;
  esac
}

# --- Wait for Unleash to become healthy -----------------------------------
printf 'Waiting for Unleash at %s ...\n' "$BASE_URL"
ok=0
for i in $(seq 1 40); do
  if curl -fsS "$BASE_URL/health" >/dev/null 2>&1; then
    ok=1
    break
  fi
  sleep 3
done
if [ "$ok" = "0" ]; then
  echo 'Unleash did not become healthy in time.' >&2
  exit 1
fi

# --- Login as admin and capture the session cookie ------------------------
COOKIE_JAR="$(mktemp)"
FLAGS_TMP="$(mktemp)"
trap 'rm -f "$COOKIE_JAR" "$FLAGS_TMP"' EXIT

curl -fsS -c "$COOKIE_JAR" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USERNAME\",\"password\":\"$ADMIN_PASSWORD\"}" \
  "$BASE_URL/auth/simple/login" >/dev/null \
  || { echo 'Unleash login failed — is the instance healthy and are UNLEASH_ADMIN_USERNAME / UNLEASH_ADMIN_PASSWORD correct?' >&2; exit 1; }

# --- Create / toggle feature flags from features-map.json -----------------
echo "Syncing project='$PROJECT' environment='$ENVIRONMENT' from $MAP_FILE"

jq -c '.features[]' "$MAP_FILE" > "$FLAGS_TMP"

while IFS= read -r f; do
  [ -z "$f" ] && continue
  name="$(echo "$f" | jq -r '.name')"
  [ -z "$name" ] && continue
  desc="$(echo "$f" | jq -r '.description // ""')"
  ftype="$(echo "$f" | jq -r '.type // "release"')"
  want="$(echo "$f" | jq -r '.defaultEnabled // false')"
  utype="$(type_of "$ftype")"

  # Check existence via the admin feature endpoint (404 = missing).
  status="$(curl -sS -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
    "$BASE_URL/api/admin/projects/$PROJECT/features/$name")"

  if [ "$status" = "404" ]; then
    if curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
      -d "{\"name\":\"$name\",\"description\":\"$desc\",\"type\":\"$utype\",\"impressionData\":false}" \
      "$BASE_URL/api/admin/projects/$PROJECT/features" >/dev/null 2>&1; then
      echo "Created feature \"$name\""
    else
      echo "ERROR: failed to create feature \"$name\"" >&2
      exit 1
    fi
  elif [ "$status" -ge 400 ]; then
    echo "ERROR: unexpected HTTP $status fetching feature \"$name\"" >&2
    exit 1
  fi

  # Enforce desired state via the environment toggle endpoint.
  if [ "$want" = "true" ]; then
    action="on"
  else
    action="off"
  fi
  if ! curl -fsS -X POST -b "$COOKIE_JAR" \
    "$BASE_URL/api/admin/projects/$PROJECT/features/$name/environments/$ENVIRONMENT/$action" >/dev/null 2>&1; then
    echo "ERROR: failed to toggle feature \"$name\" to '$action'" >&2
    exit 1
  fi
  if [ "$want" = "true" ]; then
    echo "Feature \"$name\" -> ON"
  else
    echo "Feature \"$name\" -> OFF"
  fi
done < "$FLAGS_TMP"

# --- Ensure required custom context fields exist --------------------------
for field in userEmail instanceName; do
  encoded="$(printf '%s' "$field" | jq -sRr @uri)"
  code="$(curl -sS -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
    "$BASE_URL/api/admin/context/$encoded")"
  if [ "$code" = "404" ]; then
    if curl -fsS -b "$COOKIE_JAR" -H 'Content-Type: application/json' \
      -d "{\"name\":\"$field\"}" "$BASE_URL/api/admin/context" >/dev/null 2>&1; then
      echo "Created context field \"$field\""
    else
      echo "ERROR: failed to create context field \"$field\"" >&2
      exit 1
    fi
  elif [ "$code" -ge 400 ] && [ "$code" != "409" ]; then
    echo "ERROR: unexpected HTTP $code checking context field \"$field\"" >&2
    exit 1
  fi
done

echo 'Unleash init complete.'