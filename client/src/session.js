const TOKEN_KEY = 'vemu_token';
const USER_KEY = 'vemu_user';

export const session = {
  setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  },
  getToken() {
    return localStorage.getItem(TOKEN_KEY) || null;
  },
  setUser(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  getUser() {
    try {
      return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
    } catch {
      return null;
    }
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
