#!/usr/bin/env node
import http from 'http';
import handler from 'serve-handler';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');
const PORT = process.env.PORT || 4173;

const server = http.createServer((req, res) => {
  return handler(req, res, { public: distPath });
});

server.listen(PORT, async () => {
  const url = `http://localhost:${PORT}`;
  console.log(`TAG (tag-image-labeller) is running at ${url}`);
  await open(url);
});