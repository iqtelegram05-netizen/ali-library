import http from 'http';
import fs from 'fs';
import path from 'path';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<html><body><h1>Test Server Running</h1></body></html>');
});

server.listen(3000, () => console.log('Mini server on 3000'));
