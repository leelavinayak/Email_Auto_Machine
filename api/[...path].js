import app, { initializeDB } from '../server/index.js';

export default async function handler(req, res) {
  await initializeDB();

  if (!req.url.startsWith('/api')) {
    req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
  }

  return app(req, res);
}