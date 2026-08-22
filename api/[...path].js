import app, { initializeDB } from '../server/index.js';

export default async function handler(req, res) {
  await initializeDB();
  return app(req, res);
}