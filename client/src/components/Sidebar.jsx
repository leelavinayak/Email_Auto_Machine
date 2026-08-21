import React from 'react';

const items = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'guide', icon: 'school', label: 'Guide' },
  { id: 'composer', icon: 'edit_note', label: 'Composer' },
  { id: 'templates', icon: 'palette', label: 'Design' },
  { id: 'history', icon: 'history', label: 'History' },
  { id: 'profile', icon: 'person', label: 'Profile' },
];

export default function Sidebar({ tab, setTab, user, onSignOut }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="app-logo" style={{ width: 40, height: 40, borderRadius: 12, margin: 0 }}>
          <span className="icon" style={{ fontSize: 20 }}>
            forward_to_inbox
          </span>
        </div>
        <div style={{ minWidth: 0 }}>
          <div className="sidebar-title">Email Auto Machine</div>
          <div className="sidebar-tag">Spreadsheet email campaigns</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {items.map((it) => (
          <button
            key={it.id}
            className={`sidebar-item ${tab === it.id ? 'sidebar-item-active' : ''}`}
            onClick={() => setTab(it.id)}
          >
            <span className="icon">{it.icon}</span>
            {it.label}
          </button>
        ))}
      </nav>

      <div className="sidebar-foot">
        <div className="sidebar-user">
          <div className="hero-avatar">{user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}</div>
          <div style={{ minWidth: 0 }}>
            <div className="sidebar-user-name">{user?.name || 'Not signed in'}</div>
            <div className="sidebar-user-email">{user?.email || ''}</div>
          </div>
        </div>
        {user ? (
          <button className="btn sidebar-signout" onClick={onSignOut}>
            <span className="icon" style={{ fontSize: 18, color: 'var(--error)' }}>
              logout
            </span>
            Sign out
          </button>
        ) : (
          <button className="btn sidebar-signout" onClick={() => setTab('login')}>
            <span className="icon" style={{ fontSize: 18 }}>
              login
            </span>
            Sign in
          </button>
        )}
      </div>
    </aside>
  );
}
