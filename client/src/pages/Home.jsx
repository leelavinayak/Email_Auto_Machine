import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

const FEATURES = [
  {
    icon: 'table_chart',
    title: 'Spreadsheet powered',
    text: 'Upload a .csv or .xlsx file with your contacts and turn every row into a personalized email — no mail-merge skills needed.',
  },
  {
    icon: 'image',
    title: 'Poster images',
    text: 'Attach a branded poster image that sits at the top of every email, so your campaign looks polished in any inbox.',
  },
  {
    icon: 'data_object',
    title: 'Smart variables',
    text: 'Insert {{Name}}, {{Company}} and any of your spreadsheet columns right into the subject or body. Every email feels hand-written.',
  },
  {
    icon: 'bolt',
    title: 'Real-time sending',
    text: 'Watch your campaign unfold live — a progress ring, current recipient, and sent/failed counters that update in real time.',
  },
  {
    icon: 'history',
    title: 'Full history',
    text: 'Every campaign is saved with per-recipient results, error messages and rates, so you always know exactly what happened.',
  },
  {
    icon: 'shield_lock',
    title: 'Your SMTP, your data',
    text: 'Connect your own SMTP server and keep control of deliverability. Or flip on test mode and try everything risk-free.',
  },
];

const STEPS = [
  { icon: 'upload_file', title: 'Upload your list', text: 'Connect a spreadsheet with an Email column — contacts, leads or customers.' },
  { icon: 'edit_note', title: 'Compose & personalize', text: 'Write your email, drop in {{variables}} and add a poster image.' },
  { icon: 'send', title: 'Send & track live', text: 'Hit send and watch real-time progress, then review it all in History.' },
];

export default function Home({ user }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!user) return;
    api
      .listCampaigns()
      .then((list) => {
        setStats({
          campaigns: list.length,
          emails: list.reduce((a, c) => a + (c.sent || 0), 0),
          recipients: list.reduce((a, c) => a + (c.total || 0), 0),
        });
      })
      .catch(() => {});
  }, [user]);

  const start = () => {
    if (!user) {
      window.location.hash = 'login';
    } else {
      window.location.hash = 'composer';
    }
  };

  return (
    <div className="page">
      {/* Hero */}
      <div className="hero">
        <div className="hero-glow" />
        <div className="hero-inner">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="hero-brand">
              <div className="app-logo" style={{ width: 44, height: 44, borderRadius: 14, margin: 0 }}>
                <span className="icon" style={{ fontSize: 22 }}>
                  forward_to_inbox
                </span>
              </div>
              <span className="hero-brand-name">Email Auto Machine</span>
            </div>
            {!user && (
              <button className="btn hero-chip" onClick={() => (window.location.hash = 'login')}>
                <span className="icon" style={{ fontSize: 16 }}>
                  login
                </span>
                Log in
              </button>
            )}
          </div>

          <h1 className="hero-title">
            Send personalized emails
            <br />
            from a <span className="hero-accent">spreadsheet</span>
          </h1>
          <p className="hero-sub">
            Upload your contacts, compose once, and Email Auto Machine sends a tailored message to every single person —
            with poster images, live progress and complete sending history.
          </p>

          <div className="hero-cta">
            <button className="btn btn-primary btn-block hero-cta-main" onClick={start}>
              <span className="icon">{user ? 'edit_note' : 'rocket_launch'}</span>
              {user ? 'Start a campaign' : 'Get started — it’s free'}
            </button>
            <a className="hero-cta-link" href="#features">
              See how it works
              <span className="icon" style={{ fontSize: 16 }}>
                arrow_downward
              </span>
            </a>
          </div>

          <div className="hero-points">
            <span>✓ No credit card</span>
            <span>✓ Works with any SMTP</span>
            <span>✓ Test mode built in</span>
          </div>
        </div>
      </div>

      {/* Real stats if logged in */}
      {user && stats && (
        <div className="stat-band">
          <div className="stat-col">
            <span className="stat-value">{stats.campaigns}</span>
            <span className="stat-label">Campaigns</span>
          </div>
          <div className="divider-v" />
          <div className="stat-col">
            <span className="stat-value">{stats.emails}</span>
            <span className="stat-label">Emails sent</span>
          </div>
          <div className="divider-v" />
          <div className="stat-col">
            <span className="stat-value">{stats.recipients}</span>
            <span className="stat-label">Recipients</span>
          </div>
        </div>
      )}

      {/* Features */}
      <div className="home-section" id="features">
        <h2 className="font-headline-lg home-section-title">Everything you need to send at scale</h2>
        <p className="home-section-sub">A complete email automator in one simple app — designed for speed.</p>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">
                <span className="icon">{f.icon}</span>
              </div>
              <h3 className="font-headline-md" style={{ margin: 0, fontSize: '1.0625rem' }}>
                {f.title}
              </h3>
              <p className="text-on-surface-variant" style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', lineHeight: 1.55 }}>
                {f.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* How it works */}
      <div className="home-section" style={{ background: 'var(--surface-container-low)' }}>
        <h2 className="font-headline-lg home-section-title">Three steps to send</h2>
        <div className="steps">
          {STEPS.map((s, i) => (
            <div className="step" key={s.title}>
              <div className="step-badge">{i + 1}</div>
              <div className="step-icon">
                <span className="icon">{s.icon}</span>
              </div>
              <h3 style={{ margin: '0.75rem 0 0.25rem', fontSize: '1rem' }}>{s.title}</h3>
              <p className="text-on-surface-variant" style={{ margin: 0, fontSize: '0.8125rem', lineHeight: 1.55 }}>
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA band */}
      <div className="cta-band">
        <h2 className="font-headline-lg" style={{ margin: 0 }}>
          Ready to send smarter emails?
        </h2>
        <p style={{ margin: '0.5rem 0 1.25rem', fontSize: '0.9375rem', opacity: 0.85 }}>
          {user ? 'Your contacts are waiting — start your next campaign.' : 'Create a free account and send your first campaign today.'}
        </p>
        <button className="btn cta-band-btn" onClick={start}>
          <span className="icon">{user ? 'edit_note' : 'rocket_launch'}</span>
          {user ? 'Start a campaign' : 'Get started free'}
        </button>
      </div>

      {/* Footer */}
      <div className="home-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'center', marginBottom: '0.5rem' }}>
          <span className="icon" style={{ fontSize: 18, color: 'var(--secondary)' }}>
            forward_to_inbox
          </span>
          <span style={{ fontWeight: 600 }}>Email Auto Machine</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.75rem' }}>
          Spreadsheet-powered email campaigns • Made with ♥
        </p>
      </div>
    </div>
  );
}
