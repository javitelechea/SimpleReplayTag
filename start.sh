#!/bin/bash
# Simple Replay Tag — Launch Script
PORT=8081
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Simple Replay Tag — http://localhost:$PORT"
echo "   Press Ctrl+C to stop."
echo ""

if command -v python3 &> /dev/null; then
  open "http://localhost:$PORT"
  cd "$DIR" && python3 -m http.server $PORT
elif command -v php &> /dev/null; then
  open "http://localhost:$PORT"
  php -S "localhost:$PORT" -t "$DIR"
elif command -v ruby &> /dev/null; then
  open "http://localhost:$PORT"
  ruby -run -e httpd "$DIR" -p $PORT
elif command -v python &> /dev/null; then
  open "http://localhost:$PORT"
  cd "$DIR" && python -m SimpleHTTPServer $PORT
else
  echo "Error: No se encontró PHP ni Python."
  exit 1
fi
