#!/bin/bash
cd /home/z/my-project
while true; do
  if ! curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "Server down, restarting at $(date)" >> /home/z/my-project/keepalive.log
    fuser -k 3000/tcp 2>/dev/null
    sleep 2
    NODE_ENV=production node .next/standalone/server.js > /home/z/my-project/server.log 2>&1 &
    echo "Started PID: $!" >> /home/z/my-project/keepalive.log
    sleep 5
  fi
  sleep 8
done
