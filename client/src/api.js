import { session } from './session.js';

const json = async (res) => {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && !String(res.url).includes('/api/auth/')) {
      session.clear();
      window.location.hash = 'login';
    }
    throw new Error(data.error || data.message || 'Something went wrong');
  }
  return data;
};

const authHeaders = () => {
  const t = session.getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
};

export const api = {
  health: () => fetch('/api/health').then(json),

  /* ---- Auth ---- */
  register: (payload) =>
    fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(json),
  login: (payload) =>
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(json),
  me: () => fetch('/api/auth/me', { headers: authHeaders() }).then(json),
  updateProfile: (payload) =>
    fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(json),
  changePassword: (payload) =>
    fetch('/api/auth/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(json),

  /* ---- Forgot password ---- */
  forgot: (email) =>
    fetch('/api/auth/forgot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(json),
  verifyOtp: (email, otp) =>
    fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    }).then(json),
  resetPassword: (email, otp, password) =>
    fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, password }),
    }).then(json),

  /* ---- Uploads (auth) ---- */
  uploadList: (file) => {
    const fd = new FormData();
    fd.append('file', file);
    return fetch('/api/upload/list', { method: 'POST', headers: authHeaders(), body: fd }).then(json);
  },

  uploadImage: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return fetch('/api/upload/image', { method: 'POST', headers: authHeaders(), body: fd }).then(json);
  },

  getList: (id) => fetch(`/api/upload/list/${id}`, { headers: authHeaders() }).then(json),

  /* ---- Campaigns (auth) ---- */
  createCampaign: (payload) =>
    fetch('/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(json),

  listCampaigns: () => fetch('/api/campaigns', { headers: authHeaders() }).then(json),

  getCampaign: (id) => fetch(`/api/campaigns/${id}`, { headers: authHeaders() }).then(json),

  deleteCampaign: (id) => fetch(`/api/campaigns/${id}`, { method: 'DELETE', headers: authHeaders() }).then(json),

  pauseCampaign: (id) => fetch(`/api/campaigns/${id}/pause`, { method: 'POST', headers: authHeaders() }).then(json),
  resumeCampaign: (id) => fetch(`/api/campaigns/${id}/resume`, { method: 'POST', headers: authHeaders() }).then(json),
  cancelCampaign: (id) => fetch(`/api/campaigns/${id}/cancel`, { method: 'POST', headers: authHeaders() }).then(json),

  /* ---- Templates (auth) ---- */
  listTemplates: () => fetch('/api/templates', { headers: authHeaders() }).then(json),
  createTemplate: (payload) =>
    fetch('/api/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(json),
  updateTemplate: (id, payload) =>
    fetch(`/api/templates/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(json),
  deleteTemplate: (id) => fetch(`/api/templates/${id}`, { method: 'DELETE', headers: authHeaders() }).then(json),

  /* ---- Settings (auth) ---- */
  getSettings: () => fetch('/api/settings', { headers: authHeaders() }).then(json),
  saveSettings: (payload) =>
    fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(payload),
    }).then(json),
  testSmtp: (smtp) =>
    fetch('/api/settings/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ smtp }),
    }).then(json),
};
