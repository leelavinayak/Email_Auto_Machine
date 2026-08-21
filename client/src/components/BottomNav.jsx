import React from 'react';

const items = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'guide', icon: 'school', label: 'Guide' },
  { id: 'composer', icon: 'edit_note', label: 'Composer' },
  { id: 'templates', icon: 'palette', label: 'Design' },
  { id: 'history', icon: 'history', label: 'History' },
  { id: 'profile', icon: 'person', label: 'Profile' },
];

export default function BottomNav({ tab, setTab }) {
  return (
    <nav className="bottom-nav">
      <div style={{ display: 'flex', justifyContent: 'space-around' }}>
        {items.map((it) => (
          <button
            key={it.id}
            className={`nav-item ${tab === it.id ? 'nav-item-active' : ''}`}
            onClick={() => setTab(it.id)}
          >
            <span className="icon">{it.icon}</span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
