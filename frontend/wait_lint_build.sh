#!/bin/bash
while true; do
  if ! pgrep -f "vite build" > /dev/null && ! pgrep -f "tsc --noEmit" > /dev/null; then
    echo "Linting & Build finished."
    break
  fi
  sleep 1
done
