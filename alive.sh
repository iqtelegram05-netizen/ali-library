#!/bin/bash
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    fuser -k 3000/tcp 2>/dev/null
    sleep 2
    nohup npx next dev -p 3000 -H 0.0.0.0 &>/tmp/dev.log &
    sleep 6
  fi
  sleep 4
done
