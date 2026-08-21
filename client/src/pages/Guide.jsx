import React from 'react';

const STEPS = [
  {
    num: '01',
    icon: 'person_add',
    title: 'Create your account',
    body: 'Open Login → “Sign up free”. Use a real email — it doubles as your login and your password-reset address.',
    tag: '2 minutes',
  },
  {
    num: '02',
    icon: 'dns',
    title: 'Connect your SMTP',
    body: 'Go to Profile → SMTP Server and enter your mail provider details. Press “Test Connection” — it must say everything looks good before you send.',
    tag: 'The most important step',
    highlight: true,
  },
  {
    num: '03',
    icon: 'upload_file',
    title: 'Upload your list',
    body: 'In Composer, hit “Connect” and choose a .csv or .xlsx file. Make sure the header row has an Email column — every row becomes one personalized email.',
    tag: '.csv / .xlsx',
  },
  {
    num: '04',
    icon: 'edit_note',
    title: 'Compose & personalize',
    body: 'Write your subject and message, then insert {{Name}}, {{Company}} or any column as variables. Optionally add a poster image for a premium look.',
    tag: 'Use {{variables}}',
  },
  {
    num: '05',
    icon: 'send',
    title: 'Send & track live',
    body: 'Press “Send Emails” and watch the live progress ring. When it finishes, open History to review every recipient: sent, failed and the exact reason.',
    tag: 'Live progress',
  },
];

const PROVIDERS = [
  { name: 'Gmail', host: 'smtp.gmail.com', port: 587, secure: 'Off', pass: 'App password required' },
  { name: 'Outlook / Office 365', host: 'smtp.office365.com', port: 587, secure: 'Off', pass: 'Your password or app password' },
  { name: 'Yahoo', host: 'smtp.mail.yahoo.com', port: 587, secure: 'Off', pass: 'App password required' },
  { name: 'Zoho', host: 'smtp.zoho.com', port: 465, secure: 'On', pass: 'Your password' },
];

const FAQS = [
  {
    q: 'Why did the campaign say “sent” but nobody received it?',
    a: 'Test mode was ON. In Profile → Send Mode, turn off “Test mode (no real emails)”. Test mode simulates every send so you can practice risk-free — nothing is actually delivered.',
  },
  {
    q: 'Why does every email fail with “Check your SMTP settings”?',
    a: 'Real sending needs a working SMTP account. Add your provider details in Profile → SMTP Server, then press Test Connection. If there is no SMTP configured anywhere, campaigns fail by design — the server cannot send mail without one.',
  },
  {
    q: 'Gmail asks for an “App Password” — what is that?',
    a: 'Gmail does not allow normal passwords for SMTP when 2-Step Verification is on. Go to Google Account → Security → App passwords, create one for “Mail”, and paste it into the SMTP Password field.',
  },
  {
    q: 'Which port and SSL setting should I use?',
    a: 'Use port 587 with Secure off (STARTTLS) — it works with almost every provider. Use port 465 only with Secure on. Port 25 is usually blocked by ISPs and providers.',
  },
  {
    q: 'Why does Gmail reject my mail with “From address not verified”?',
    a: 'The From Email must be the same address as your SMTP Username (or an address you own in that Gmail account). Change it in Profile → SMTP Server → From Email and save.',
  },
  {
    q: 'Which columns can I use as variables?',
    a: 'Any column from your spreadsheet. Insert them from the chips above the editor — {{Name}}, {{Company}}, {{Discount}}… If a cell is empty, the placeholder stays as written, so keep an eye on required fields.',
  },
];

export default function Guide() {
  return (
    <div className="page">
      {/* Hero */}
      <div className="guide-hero">
        <div className="guide-hero-glow" />
        <div className="guide-hero-inner">
          <span className="guide-kicker">
            <span className="icon" style={{ fontSize: 15 }}>
              school
            </span>
            Quick start guide
          </span>
          <h1 className="font-headline-lg" style={{ margin: '0.75rem 0 0.375rem' }}>
            Set up & send your
            <br />
            first campaign
          </h1>
          <p style={{ margin: 0, fontSize: '0.9375rem', opacity: 0.85, maxWidth: 420, lineHeight: 1.6 }}>
            From account to inbox in five steps. Follow the order below — each step is required for the next.
          </p>
        </div>
      </div>

      {/* Steps */}
      <div className="guide-steps">
        {STEPS.map((s) => (
          <div className={`guide-step ${s.highlight ? 'guide-step-highlight' : ''}`} key={s.num}>
            <div className="guide-step-num">{s.num}</div>
            <div className="guide-step-icon">
              <span className="icon">{s.icon}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                <h3 className="font-headline-md" style={{ margin: 0, fontSize: '1.0625rem' }}>
                  {s.title}
                </h3>
                <span className={`guide-tag ${s.highlight ? 'guide-tag-hot' : ''}`}>{s.tag}</span>
              </div>
              <p className="text-on-surface-variant" style={{ margin: '0.375rem 0 0', fontSize: '0.875rem', lineHeight: 1.6 }}>
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* SMTP cheat sheet */}
      <div className="card-section" style={{ margin: '0 1rem 1rem' }}>
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            SMTP cheat sheet
          </h2>
          <span className="icon text-secondary">dns</span>
        </div>
        <div className="card-pad" style={{ paddingTop: '0.75rem' }}>
          {PROVIDERS.map((p) => (
            <div className="guide-provider" key={p.name}>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', minWidth: 0 }}>{p.name}</div>
              <div className="guide-provider-code">{p.host}</div>
              <div className="guide-provider-meta">
                <span className="recipient-pill">
                  Port <strong>{p.port}</strong>
                </span>
                <span className="recipient-pill">SSL {p.secure}</span>
                <span className="recipient-pill" style={{ maxWidth: '100%' }}>
                  <span className="icon" style={{ fontSize: 13 }}>
                    key
                  </span>
                  {p.pass}
                </span>
              </div>
            </div>
          ))}
          <div className="info-note" style={{ marginTop: '0.75rem' }}>
            <span className="icon">tips_and_updates</span>
            <span>
              Username is always your <strong>full email address</strong>, and From Email should match it. Save, then press{' '}
              <strong>Test Connection</strong>.
            </span>
          </div>
        </div>
      </div>

      {/* Test mode */}
      <div className="guide-banner">
        <div className="guide-banner-icon">
          <span className="icon">science</span>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>New here? Try test mode first</h3>
          <p style={{ margin: '0.375rem 0 0', fontSize: '0.8125rem', lineHeight: 1.55, opacity: 0.9 }}>
            With Test mode ON (Profile → Send Mode) you can practice the entire flow — no emails are delivered and no SMTP
            is needed. When you are ready, turn it off and send for real.
          </p>
        </div>
      </div>

      {/* FAQ */}
      <div className="card-section" style={{ margin: '0 1rem 1.5rem' }}>
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            Fixing common issues
          </h2>
          <span className="icon text-secondary">quiz</span>
        </div>
        <div className="guide-faq">
          {FAQS.map((f) => (
            <details className="guide-faq-item" key={f.q}>
              <summary>
                <span style={{ flex: 1, minWidth: 0 }}>{f.q}</span>
                <span className="icon guide-faq-chev">expand_more</span>
              </summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </div>
  );
}
