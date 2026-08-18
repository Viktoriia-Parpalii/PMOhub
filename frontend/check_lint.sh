#!/bin/bash
if ! pgrep -f "tsc --noEmit" > /dev/null; then
  echo "Done"
fi
