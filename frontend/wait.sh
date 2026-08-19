#!/bin/bash
while pgrep -f "vite build" > /dev/null || pgrep -f "tsc --noEmit" > /dev/null; do
  sleep 1
done
echo "Done"
