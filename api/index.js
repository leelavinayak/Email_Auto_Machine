import app, { initializeDB } from '../server/index.js';

export default async function handler(req, res) {
    await initializeDB();

    const queryPath = new URL(req.url, 'http://localhost').searchParams.get('path');
    const pathValue = Array.isArray(req.query?.path) ? req.query.path.join('/') : req.query?.path || queryPath;
    if (pathValue) req.url = `/api/${pathValue}`;

    if (req.url.startsWith('/api/index/')) {
        req.url = `/api/${req.url.slice('/api/index/'.length)}`;
    }

    if (!req.url.startsWith('/api')) {
        req.url = `/api${req.url.startsWith('/') ? '' : '/'}${req.url}`;
    }

    return app(req, res);
}