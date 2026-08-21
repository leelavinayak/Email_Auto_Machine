import express from 'express';
import { addClient, removeClient } from '../services/events.js';

const router = express.Router();

router.get('/', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 3000\n\n');

  addClient(res);

  const ping = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(ping);
      removeClient(res);
    }
  }, 25000);

  req.on('close', () => {
    clearInterval(ping);
    removeClient(res);
  });
});

export default router;
