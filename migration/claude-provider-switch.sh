#!/usr/bin/env bash
set -euo pipefail

CLAUDE_DIR="${HOME}/.claude"
SETTINGS_FILE="${CLAUDE_DIR}/settings.json"
PROFILE_FILE="${CLAUDE_DIR}/gateway_profile.json"

mkdir -p "${CLAUDE_DIR}"

usage() {
  cat <<'EOF'
Usage:
  claude-provider-switch.sh status
  claude-provider-switch.sh official
  claude-provider-switch.sh gateway [BASE_URL] [API_KEY]
  claude-provider-switch.sh save-gateway <BASE_URL> <API_KEY>
  claude-provider-switch.sh toggle
  claude-provider-switch.sh test

Commands:
  status        Show current provider mode and endpoint
  official      Switch to official Claude auth (remove API key + base URL from env settings)
  gateway       Switch to third-party gateway
                - with args: use and save BASE_URL/API_KEY
                - no args : use saved values from gateway_profile.json
  save-gateway  Save gateway profile only, do not switch
  toggle        Toggle between official and gateway (requires saved gateway profile)
  test          Run a quick non-interactive Claude call to verify connectivity
EOF
}

ensure_settings_file() {
  if [[ ! -f "${SETTINGS_FILE}" ]]; then
    cat > "${SETTINGS_FILE}" <<'JSON'
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "env": {}
}
JSON
  fi
}

backup_settings() {
  if [[ -f "${SETTINGS_FILE}" ]]; then
    cp "${SETTINGS_FILE}" "${SETTINGS_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
  fi
}

save_gateway_profile() {
  local base_url="$1"
  local api_key="$2"
  python3 - "$PROFILE_FILE" "$base_url" "$api_key" <<'PY'
import json
import os
import sys

profile_file, base_url, api_key = sys.argv[1], sys.argv[2], sys.argv[3]
os.makedirs(os.path.dirname(profile_file), exist_ok=True)
with open(profile_file, "w", encoding="utf-8") as f:
    json.dump({"base_url": base_url, "api_key": api_key}, f, ensure_ascii=False, indent=2)
print("Saved gateway profile:", profile_file)
PY
  chmod 600 "$PROFILE_FILE"
}

switch_official() {
  ensure_settings_file
  backup_settings
  python3 - "$SETTINGS_FILE" <<'PY'
import json
import sys

settings_file = sys.argv[1]
with open(settings_file, "r", encoding="utf-8") as f:
    data = json.load(f)

env = data.setdefault("env", {})
for k in [
    "ANTHROPIC_BASE_URL",
    "ANTHROPIC_API_KEY",
    "CLAUDE_CODE_USE_VERTEX",
    "CLAUDE_CODE_USE_BEDROCK",
    "CLAUDE_CODE_USE_FOUNDRY",
    "ANTHROPIC_VERTEX_PROJECT_ID",
    "AWS_REGION",
    "ANTHROPIC_FOUNDRY_RESOURCE",
    "ANTHROPIC_FOUNDRY_BASE_URL",
]:
    env.pop(k, None)

with open(settings_file, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("Switched to official provider")
PY
  chmod 600 "$SETTINGS_FILE"
}

switch_gateway() {
  local base_url="$1"
  local api_key="$2"

  ensure_settings_file
  backup_settings
  python3 - "$SETTINGS_FILE" "$base_url" "$api_key" <<'PY'
import json
import sys

settings_file, base_url, api_key = sys.argv[1], sys.argv[2], sys.argv[3]
with open(settings_file, "r", encoding="utf-8") as f:
    data = json.load(f)

env = data.setdefault("env", {})
env["ANTHROPIC_BASE_URL"] = base_url
env["ANTHROPIC_API_KEY"] = api_key
env["CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS"] = "1"
env["DISABLE_INTERLEAVED_THINKING"] = "1"
env.setdefault("DISABLE_TELEMETRY", "1")

with open(settings_file, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print("Switched to gateway provider")
PY
  chmod 600 "$SETTINGS_FILE"
}

read_gateway_profile() {
  if [[ ! -f "$PROFILE_FILE" ]]; then
    echo "Gateway profile not found: $PROFILE_FILE" >&2
    echo "Run: $0 save-gateway <BASE_URL> <API_KEY>" >&2
    exit 1
  fi

  python3 - "$PROFILE_FILE" <<'PY'
import json
import sys

p = sys.argv[1]
with open(p, "r", encoding="utf-8") as f:
    data = json.load(f)
base_url = data.get("base_url", "")
api_key = data.get("api_key", "")
if not base_url or not api_key:
    print("INVALID_PROFILE")
else:
    print(base_url)
    print(api_key)
PY
}

status_cmd() {
  ensure_settings_file
  python3 - "$SETTINGS_FILE" <<'PY'
import json
import sys

settings_file = sys.argv[1]
with open(settings_file, "r", encoding="utf-8") as f:
    data = json.load(f)

env = data.get("env", {})
base = env.get("ANTHROPIC_BASE_URL")
key = env.get("ANTHROPIC_API_KEY")
if base and key:
    masked = key[:6] + "..." + key[-4:] if len(key) >= 12 else "***"
    print("mode=gateway")
    print("base_url=" + base)
    print("api_key=" + masked)
else:
    print("mode=official")
PY
}

test_cmd() {
  API_TIMEOUT_MS=30000 timeout 45s claude -p "Reply OK only" --output-format text --model sonnet < /dev/null
}

main() {
  local cmd="${1:-}"
  case "$cmd" in
    status)
      status_cmd
      ;;
    official)
      switch_official
      status_cmd
      ;;
    save-gateway)
      if [[ $# -ne 3 ]]; then
        echo "save-gateway requires <BASE_URL> <API_KEY>" >&2
        exit 1
      fi
      save_gateway_profile "$2" "$3"
      ;;
    gateway)
      local base_url=""
      local api_key=""
      if [[ $# -eq 3 ]]; then
        base_url="$2"
        api_key="$3"
        save_gateway_profile "$base_url" "$api_key"
      elif [[ $# -eq 1 ]]; then
        mapfile -t profile < <(read_gateway_profile)
        if [[ "${profile[0]:-}" == "INVALID_PROFILE" || -z "${profile[0]:-}" || -z "${profile[1]:-}" ]]; then
          echo "Gateway profile is invalid. Re-save it first." >&2
          exit 1
        fi
        base_url="${profile[0]}"
        api_key="${profile[1]}"
      else
        echo "gateway accepts either 0 or 2 args" >&2
        exit 1
      fi
      switch_gateway "$base_url" "$api_key"
      status_cmd
      ;;
    toggle)
      local mode
      mode="$(python3 - "$SETTINGS_FILE" <<'PY'
import json
import os
import sys

settings_file = sys.argv[1]
if not os.path.exists(settings_file):
    print("official")
    raise SystemExit(0)
with open(settings_file, "r", encoding="utf-8") as f:
    data = json.load(f)
env = data.get("env", {})
print("gateway" if env.get("ANTHROPIC_BASE_URL") and env.get("ANTHROPIC_API_KEY") else "official")
PY
)"
      if [[ "$mode" == "gateway" ]]; then
        switch_official
      else
        mapfile -t profile < <(read_gateway_profile)
        if [[ "${profile[0]:-}" == "INVALID_PROFILE" || -z "${profile[0]:-}" || -z "${profile[1]:-}" ]]; then
          echo "Gateway profile is invalid. Re-save it first." >&2
          exit 1
        fi
        switch_gateway "${profile[0]}" "${profile[1]}"
      fi
      status_cmd
      ;;
    test)
      test_cmd
      ;;
    -h|--help|help|"")
      usage
      ;;
    *)
      echo "Unknown command: $cmd" >&2
      usage
      exit 1
      ;;
  esac
}

main "$@"
