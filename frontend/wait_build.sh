#!/bin/bash
while true; do
  if ! pgrep -f "vite build" > /dev/null; then
    echo "Build finished."
    break
  fi
  sleep 1
done
