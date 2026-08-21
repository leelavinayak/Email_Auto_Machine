import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';
import { session } from './session.js';
import { subscribe } from './events.js';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Composer from './pages/Composer.jsx';
import Templates from './pages/Templates.jsx';
import Progress from './pages/Progress.jsx';
import History from './pages/History.jsx';
import Settings from './pages/Settings.jsx';
import Guide from './pages/Guide.jsx';
import BottomNav from './components/BottomNav.jsx';
import Sidebar from './components/Sidebar.jsx';

const TABS = ['home', 'composer', 'templates', 'history', 'profile', 'login', 'guide'];
const PUBLIC_TABS = ['home', 'login', 'guide'];

export default function App() {
  const [tab, setTab] = useState(() => {
    const h = window.location.hash.replace('#', '');
    return TABS.includes(h) ? h : 'home';
  });
  const [user, setUser] = useState(() => session.getUser());
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [toast, setToast] = useState(null);
  const [serverUp, setServerUp] = useState(true);

  const authed = !!user;

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace('#', '');
      if (TABS.includes(h)) setTab(h);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    const token = session.getToken();
    if (token && !user) {
      api
        .me()
        .then((res) => {
          session.setUser(res.user);
          setUser(res.user);
        })
        .catch(() => session.clear());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    api
      .health()
      .then(() => setServerUp(true))
      .catch(() => setServerUp(false));
    const unsub = subscribe('connection', (status) => {
      if (status === 'online') setServerUp(true);
    });
    return unsub;
  }, []);

  const goTab = (t) => {
    if (t === 'home') {
      setTab('home');
      window.location.hash = 'home';
      return;
    }
    if (t === 'login') {
      setTab('login');
      window.location.hash = 'login';
      return;
    }
    if (t === 'guide') {
      setTab('guide');
      window.location.hash = 'guide';
      return;
    }
    if (!authed) {
      setTab('login');
      window.location.hash = 'login';
      return;
    }
    setTab(t);
    window.location.hash = t;
  };

  const handleAuthed = (res) => {
    session.setToken(res.token);
    session.setUser(res.user);
    setUser(res.user);
    showToast(`Welcome, ${res.user.name || 'friend'}!`);
    goTab('composer');
  };

  const handleLogout = () => {
    session.clear();
    setUser(null);
    setTab('home');
    window.location.hash = 'home';
  };

  const handleUserUpdate = (updatedUser) => {
    session.setUser(updatedUser);
    setUser(updatedUser);
  };

  const openCampaign = (campaign) => {
    setActiveCampaign(campaign);
    setTab('composer');
  };

  const closeCampaign = () => {
    setActiveCampaign(null);
    goTab('history');
  };

  const showLogin = !authed && tab !== 'home';

  return (
    <div className="app-shell">
      {!serverUp && (
        <div
          style={{
            background: 'var(--error-container)',
            color: 'var(--on-error-container)',
            padding: '0.5rem 1rem',
            fontSize: '0.8125rem',
            textAlign: 'center',
          }}
        >
          Server unreachable. Make sure the backend is running (npm start in /server).
        </div>
      )}

      <main className="app-main">
        {activeCampaign ? (
          <Progress campaignId={activeCampaign._id} onDone={closeCampaign} showToast={showToast} />
        ) : tab === 'home' ? (
          <Home user={user} />
        ) : tab === 'guide' ? (
          <Guide />
        ) : showLogin ? (
          <Login onAuthed={handleAuthed} showToast={showToast} />
        ) : tab === 'composer' ? (
          <Composer onSend={(c) => setActiveCampaign(c)} showToast={showToast} />
        ) : tab === 'templates' ? (
          <Templates goComposer={() => goTab('composer')} showToast={showToast} />
        ) : tab === 'history' ? (
          <History openCampaign={openCampaign} goComposer={() => goTab('composer')} showToast={showToast} />
        ) : (
          <Settings user={user} onSignOut={handleLogout} onUserUpdate={handleUserUpdate} showToast={showToast} />
        )}
      </main>

      {!activeCampaign && <Sidebar tab={tab} setTab={goTab} user={user} onSignOut={handleLogout} />}
      {!activeCampaign && <BottomNav tab={tab} setTab={goTab} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
