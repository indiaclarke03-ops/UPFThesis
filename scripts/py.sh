#!/bin/sh
# Run a pipeline script with the project venv if present, else system python3.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ -x "$DIR/.venv/bin/python" ]; then PY="$DIR/.venv/bin/python"; else PY=python3; fi
exec "$PY" "$@"
