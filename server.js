import http from 'http';
import fs from 'fs';
import { WebSocketServer } from 'ws';

const PORT = 3001;

const server = http.createServer((req, res) => {
  // The chat page loads its client script from this same server
  const isScript = req.url.split('?')[0] === '/script.js';
  const file = isScript ? './public/script.js' : './public/index.html';
  const contentType = isScript ? 'text/javascript' : 'text/html';

  fs.readFile(new URL(file, import.meta.url), (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });

function broadcast(payload) {
  const message = JSON.stringify(payload);
  wss.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(message);
    }
  });
}

wss.on('connection', (socket, req) => {
  const username = new URL(req.url, 'http://localhost').searchParams.get('username');

  broadcast({ type: 'system', text: `${username} joined` });

  socket.on('message', (data) => {
    try {
      const { username, text } = JSON.parse(data.toString());
      broadcast({ type: 'chat', username, text });
    } catch {
      // Ignore messages that are not valid JSON
    }
  });

  socket.on('close', () => {
    broadcast({ type: 'system', text: `${username} left` });
  });
});

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});
