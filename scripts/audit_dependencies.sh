#!/usr/bin/env bash
# Run dependency audits for backend (pip) and frontend (npm).
# Install pip-audit: pip install pip-audit
set -e
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "=== Backend (pip audit) ==="
cd "$ROOT/backend"
if command -v pip-audit &>/dev/null; then
  pip-audit -r requirements.txt || true
else
  echo "Install with: pip install pip-audit"
  pip list --outdated 2>/dev/null || true
fi
echo ""
echo "=== Frontend (npm audit) ==="
cd "$ROOT/frontend"
npm audit --audit-level=moderate 2>/dev/null || true
echo "Done."
