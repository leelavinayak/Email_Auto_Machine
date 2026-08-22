import app, { initializeDB } from '../server/index.js';

export default async function handler(req, res) {
  await initializeDB();

  if (req.url.startsWith('/api/index/')) {
    req.url = `/api/${req.url.slice('/api/index/'.length)}`;
  }

  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}