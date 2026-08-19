#!/bin/bash
while true; do
  if ! pgrep -f "tsc --noEmit" > /dev/null; then
    echo "Linting finished."
    break
  fi
  sleep 1
done
