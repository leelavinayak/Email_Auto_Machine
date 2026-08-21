let es = null;
const listeners = new Map();

function dispatch(type, data) {
  const set = listeners.get(type);
  if (!set) return;
  for (const cb of set) {
    try {
      cb(data);
    } catch (err) {
      console.error('event handler error', err);
    }
  }
}

function ensure() {
  if (es && (es.readyState === EventSource.OPEN || es.readyState === EventSource.CONNECTING)) return;
  es = new EventSource('/api/events');
  es.onopen = () => dispatch('connection', 'online');
  es.onerror = () => dispatch('connection', 'reconnecting');
  es.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      dispatch(msg.type, msg.data);
    } catch {
      /* keep-alive comment or malformed data */
    }
  };
}

export function subscribe(type, cb) {
  if (!listeners.has(type)) listeners.set(type, new Set());
  listeners.get(type).add(cb);
  ensure();
  return () => listeners.get(type).delete(cb);
}
