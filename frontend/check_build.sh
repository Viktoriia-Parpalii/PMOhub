#!/bin/bash
while true; do
  if ! pgrep -f "vite build" > /dev/null; then
    echo "Done"
    break
  fi
  sleep 1
done
