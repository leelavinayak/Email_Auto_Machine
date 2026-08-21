import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PROFESSIONS } from './Login.jsx';

const HELP_EMAIL = 'leelavinayakbussiness@gmail.com';

const professionLabel = (pid) => PROFESSIONS.find((p) => p.id === pid)?.label || '';

const orgLabel = (pid) =>
  pid === 'college' ? 'College' : pid === 'school' ? 'School' : pid === 'company' ? 'Company' : '';

const formatDate = (d) => {
  if (!d) return null;
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
};

export default function Settings({ user, onSignOut, onUserUpdate, showToast }) {
  const [form, setForm] = useState({
    smtp: { host: '', port: 587, user: '', pass: '', secure: false, fromName: '', fromEmail: '' },
    testMode: true,
  });
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    profession: user?.profession || '',
    orgName: user?.orgName || '',
    designation: user?.designation || '',
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  const [passOpen, setPassOpen] = useState(false);
  const [passStep, setPassStep] = useState(0); // 0 send email, 1 enter otp, 2 new password
  const [passEmail, setPassEmail] = useState(user?.email || '');
  const [passOtp, setPassOtp] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passDevOtp, setPassDevOtp] = useState(null);
  const [passBusy, setPassBusy] = useState(false);
  const [passError, setPassError] = useState(null);

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setForm(s))
      .catch((e) => showToast(e.message))
      .finally(() => setLoaded(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));
  const setSmtp = (key, val) => setForm((f) => ({ ...f, smtp: { ...f.smtp, [key]: val } }));

  const saveProfile = async () => {
    if (!profile.name.trim()) return showToast('Name cannot be empty');
    if (!/^\S+@\S+\.\S+$/.test(profile.email.trim())) return showToast('Enter a valid email address');
    if (!profile.profession) return showToast('Please select what you plan to use this app for');
    if (profile.profession !== 'personal' && !profile.orgName.trim()) {
      return showToast(`Please enter your ${orgLabel(profile.profession).toLowerCase()} name`);
    }
    setSavingProfile(true);
    try {
      const res = await api.updateProfile({
        name: profile.name.trim(),
        email: profile.email.trim(),
        phone: profile.phone.trim(),
        profession: profile.profession,
        orgName: profile.orgName.trim(),
        designation: profile.designation.trim(),
      });
      onUserUpdate?.(res.user);
      setProfile((p) => ({
        ...p,
        name: res.user.name,
        email: res.user.email,
        phone: res.user.phone || '',
        profession: res.user.profession || '',
        orgName: res.user.orgName || '',
        designation: res.user.designation || '',
      }));
      setEditingProfile(false);
      showToast('Profile updated');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const openPasswordFlow = () => {
    setPassOpen(true);
    setPassStep(0);
    setPassEmail(user?.email || '');
    setPassOtp('');
    setPassNew('');
    setPassConfirm('');
    setPassDevOtp(null);
    setPassError(null);
  };

  const sendOtp = async () => {
    if (passBusy) return;
    setPassError(null);
    if (!passEmail.trim() || !/^\S+@\S+\.\S+$/.test(passEmail.trim())) return setPassError('Enter a valid email address');
    setPassBusy(true);
    try {
      const res = await api.forgot(passEmail.trim());
      setPassDevOtp(res.devOtp || null);
      setPassOtp('');
      setPassStep(1);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassBusy(false);
    }
  };

  const verifyOtp = async () => {
    if (passBusy) return;
    setPassError(null);
    if (!/^\d{6}$/.test(passOtp.trim())) return setPassError('Enter the 6-digit code from the email');
    setPassBusy(true);
    try {
      await api.verifyOtp(passEmail.trim(), passOtp.trim());
      setPassNew('');
      setPassConfirm('');
      setPassStep(2);
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassBusy(false);
    }
  };

  const submitNewPassword = async () => {
    if (passBusy) return;
    setPassError(null);
    if (passNew.length < 6) return setPassError('New password must be at least 6 characters');
    if (passNew !== passConfirm) return setPassError('Passwords do not match');
    setPassBusy(true);
    try {
      await api.resetPassword(passEmail.trim(), passOtp.trim(), passNew);
      setPassOpen(false);
      showToast('Password updated');
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassBusy(false);
    }
  };

  const backInPasswordFlow = () => {
    setPassError(null);
    if (passStep > 0) {
      setPassStep(passStep - 1);
    } else {
      setPassOpen(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.saveSettings(form);
      showToast('Settings saved');
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await api.testSmtp(form.smtp);
      setTestResult(res);
      if (!res.ok) showToast(res.message);
    } catch (err) {
      setTestResult({ ok: false, message: err.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="page settings-page" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
      <div className="profile-header">
        <div
          className="profile-header-icon"
        >
          <span className="icon" style={{ fontSize: 28 }}>
            person
          </span>
        </div>
        <div>
          <h1 className="font-headline-lg" style={{ margin: 0 }}>
            Profile
          </h1>
          <p className="text-on-surface-variant" style={{ margin: '0.25rem 0 0', fontSize: '0.875rem' }}>
            Your account, SMTP server and send preferences
          </p>
        </div>
      </div>

      <section className="card-section">
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            Account Details
          </h2>
          <button
            className="btn"
            onClick={() => {
              setEditingProfile((v) => !v);
              setProfile({
                name: user?.name || '',
                email: user?.email || '',
                phone: user?.phone || '',
                profession: user?.profession || '',
                orgName: user?.orgName || '',
                designation: user?.designation || '',
              });
            }}
            title={editingProfile ? 'Close editor' : 'Edit profile'}
          >
            <span className="icon">{editingProfile ? 'close' : 'edit'}</span>
            {editingProfile ? 'Close' : 'Edit'}
          </button>
        </div>
        <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div className="hero-avatar" style={{ width: 56, height: 56, fontSize: '1.5rem' }}>
              {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || 'My Account'}
              </div>
              <div className="text-on-surface-variant" style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              {user?.phone && (
                <div className="text-on-surface-variant" style={{ fontSize: '0.8125rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.phone}
                </div>
              )}
            </div>
            <button className="btn" onClick={onSignOut} title="Sign out" style={{ flexShrink: 0 }}>
              <span className="icon" style={{ fontSize: 18, color: 'var(--error)' }}>
                logout
              </span>
              Sign out
            </button>
          </div>

          <div className="info-note" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.25rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="icon">calendar_month</span>
              Member since {formatDate(user?.createdAt) || '—'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="icon">badge</span>
              Account ID: {user?._id || '—'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="icon">{user?.phone ? 'call' : 'phone_disabled'}</span>
              Phone: {user?.phone || 'Not added'}
            </span>
            <span
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                width: '100%',
                borderTop: '1px solid var(--outline-variant)',
                paddingTop: '0.5rem',
                marginTop: '0.25rem',
                fontWeight: 600,
              }}
            >
              <span className="icon" style={{ color: 'var(--secondary)' }}>
                work_outline
              </span>
              Using for: {professionLabel(user?.profession) || 'Purpose not set'}
            </span>
            {user?.profession && user.profession !== 'personal' && (
              <>
                {user?.orgName && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="icon">domain</span>
                    {orgLabel(user.profession)}: {user.orgName}
                  </span>
                )}
                {user?.designation && (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span className="icon">badge</span>
                    Role: {user.designation}
                  </span>
                )}
              </>
            )}
          </div>

          {editingProfile && (
            <div
              className="settings-fields"
              style={{ borderTop: '1px solid var(--outline-variant)', paddingTop: '1rem' }}
            >
              <div className="field span-2">
                <label className="field-label" htmlFor="profile-name">
                  Full name
                </label>
                <input
                  className="input"
                  id="profile-name"
                  placeholder="Alex Johnson"
                  value={profile.name}
                  onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                />
              </div>
              <div className="field span-2">
                <label className="field-label" htmlFor="profile-email">
                  Email address
                </label>
                <input
                  className="input input-mono"
                  id="profile-email"
                  type="email"
                  placeholder="you@example.com"
                  value={profile.email}
                  onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div className="field span-2">
                <label className="field-label" htmlFor="profile-phone">
                  Mobile number
                </label>
                <input
                  className="input input-mono"
                  id="profile-phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={profile.phone}
                  onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div className="field span-2">
                <label className="field-label">What are you using this app for?</label>
                <div className="prof-options">
                  {PROFESSIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`prof-option${profile.profession === p.id ? ' prof-option-active' : ''}`}
                      onClick={() => setProfile((prev) => ({ ...prev, profession: p.id }))}
                    >
                      <span className="icon">{p.icon}</span>
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              {profile.profession && profile.profession !== 'personal' && (
                <>
                  <div className="field span-2">
                    <label className="field-label" htmlFor="profile-org-name">
                      {orgLabel(profile.profession)} name
                    </label>
                    <input
                      className="input"
                      id="profile-org-name"
                      placeholder="e.g. Anna University, Chennai"
                      value={profile.orgName}
                      onChange={(e) => setProfile((p) => ({ ...p, orgName: e.target.value }))}
                    />
                  </div>
                  <div className="field span-2">
                    <label className="field-label" htmlFor="profile-designation">
                      Designation / role{' '}
                      <span className="text-on-surface-variant" style={{ fontWeight: 400 }}>
                        (optional)
                      </span>
                    </label>
                    <input
                      className="input"
                      id="profile-designation"
                      placeholder={profile.profession === 'company' ? 'e.g. Marketing Manager' : 'e.g. Student / Faculty'}
                      value={profile.designation}
                      onChange={(e) => setProfile((p) => ({ ...p, designation: e.target.value }))}
                    />
                  </div>
                </>
              )}
              <div className="card-footer span-2">
                <span className="text-on-surface-variant" style={{ fontSize: '0.8125rem' }}>
                  Changes are applied to your account immediately
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn"
                    onClick={() => {
                      setEditingProfile(false);
                      setProfile({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        profession: user?.profession || '',
                        orgName: user?.orgName || '',
                        designation: user?.designation || '',
                      });
                    }}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={saveProfile}
                    disabled={savingProfile || !user}
                    style={{ display: 'flex' }}
                  >
                    <span className="icon">{savingProfile ? 'sync' : 'save'}</span>
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card-section">
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            Change Password
          </h2>
          <button className="btn" onClick={() => (passOpen ? setPassOpen(false) : openPasswordFlow())} title="Change password">
            <span className="icon">{passOpen ? 'close' : 'lock_reset'}</span>
            {passOpen ? 'Close' : 'Change Password'}
          </button>
        </div>

        {!passOpen ? (
          <div className="card-pad">
            <div className="info-note">
              <span className="icon">info</span>
              <span>
                We will email a one-time code to your account address. Enter the code to set a new password.
              </span>
            </div>
          </div>
        ) : (
          <div className="card-pad settings-fields">
            {passStep === 0 && (
              <>
                <div className="field span-2">
                  <label className="field-label" htmlFor="pass-email">
                    Email address
                  </label>
                  <input
                    className="input input-mono"
                    id="pass-email"
                    type="email"
                    placeholder="you@example.com"
                    value={passEmail}
                    onChange={(e) => setPassEmail(e.target.value)}
                  />
                </div>
                <div className="card-footer span-2">
                  <span className="text-on-surface-variant" style={{ fontSize: '0.8125rem' }}>
                    A one-time code will be sent to this inbox
                  </span>
                  <button className="btn btn-primary" onClick={sendOtp} disabled={passBusy} style={{ display: 'flex' }}>
                    <span className="icon">{passBusy ? 'sync' : 'mail'}</span>
                    {passBusy ? 'Sending...' : 'Send Code'}
                  </button>
                </div>
              </>
            )}

            {passStep === 1 && (
              <>
                <div className="field span-2">
                  <label className="field-label" htmlFor="pass-otp">
                    One-time code sent to {passEmail}
                  </label>
                  <input
                    className="input input-mono"
                    id="pass-otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5em' }}
                    value={passOtp}
                    onChange={(e) => setPassOtp(e.target.value.replace(/\D/g, ''))}
                  />
                  {passDevOtp && (
                    <div className="info-note" style={{ marginTop: '0.75rem' }}>
                      <span className="icon">science</span>
                      <span>
                        Test mode is on — emails are simulated. Your code is <strong>{passDevOtp}</strong>
                      </span>
                    </div>
                  )}
                </div>
                <div className="card-footer span-2">
                  <span className="text-on-surface-variant" style={{ fontSize: '0.8125rem' }}>
                    Check {passEmail} for your code
                  </span>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className="btn"
                      onClick={() => {
                        setPassDevOtp(null);
                        setPassError(null);
                        sendOtp();
                      }}
                      disabled={passBusy}
                    >
                      Resend
                    </button>
                    <button className="btn btn-primary" onClick={verifyOtp} disabled={passBusy} style={{ display: 'flex' }}>
                      <span className="icon">{passBusy ? 'sync' : 'pin'}</span>
                      {passBusy ? 'Verifying...' : 'Verify Code'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {passStep === 2 && (
              <>
                <div className="field span-2">
                  <label className="field-label" htmlFor="pass-new">
                    New password
                  </label>
                  <input
                    className="input input-mono"
                    id="pass-new"
                    type="password"
                    placeholder="At least 6 characters"
                    value={passNew}
                    onChange={(e) => setPassNew(e.target.value)}
                  />
                </div>
                <div className="field span-2">
                  <label className="field-label" htmlFor="pass-confirm">
                    Confirm new password
                  </label>
                  <input
                    className="input input-mono"
                    id="pass-confirm"
                    type="password"
                    placeholder="Repeat your new password"
                    value={passConfirm}
                    onChange={(e) => setPassConfirm(e.target.value)}
                  />
                </div>
                <div className="card-footer span-2">
                  <span className="text-on-surface-variant" style={{ fontSize: '0.8125rem' }}>
                    Use a strong password you don&apos;t use elsewhere
                  </span>
                  <button
                    className="btn btn-primary"
                    onClick={submitNewPassword}
                    disabled={passBusy}
                    style={{ display: 'flex' }}
                  >
                    <span className="icon">{passBusy ? 'sync' : 'lock_reset'}</span>
                    {passBusy ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </>
            )}

            {passError && (
              <div className="info-note span-2" style={{ color: 'var(--error)', background: 'var(--error-container)' }}>
                <span className="icon">error</span>
                <span>{passError}</span>
              </div>
            )}

            <div className="span-2">
              <button
                type="button"
                onClick={backInPasswordFlow}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--secondary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'var(--font-body)',
                  fontSize: '0.8125rem',
                  padding: 0,
                }}
              >
                {passStep === 0 ? 'Close' : '← Back'}
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="card-section">
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            SMTP Server
          </h2>
          <span className="icon text-secondary">dns</span>
        </div>
        <div className="card-pad settings-fields">
          <div className="field span-2">
            <label className="field-label">SMTP Host</label>
            <input
              className="input input-mono"
              placeholder="smtp.gmail.com"
              value={form.smtp.host}
              onChange={(e) => setSmtp('host', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">Port</label>
            <input
              className="input input-mono"
              type="number"
              placeholder="587"
              value={form.smtp.port}
              onChange={(e) => setSmtp('port', Number(e.target.value))}
            />
          </div>
          <div className="field">
            <label className="field-label">Username</label>
            <input
              className="input input-mono"
              placeholder="you@gmail.com"
              value={form.smtp.user}
              onChange={(e) => setSmtp('user', e.target.value)}
            />
          </div>
          <div className="field span-2">
            <label className="field-label">Password / App Password</label>
            <input
              className="input input-mono"
              type="password"
              placeholder="••••••••"
              value={form.smtp.pass}
              onChange={(e) => setSmtp('pass', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">From Name</label>
            <input
              className="input"
              placeholder="The Team"
              value={form.smtp.fromName}
              onChange={(e) => setSmtp('fromName', e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label">From Email</label>
            <input
              className="input input-mono"
              placeholder="you@gmail.com"
              value={form.smtp.fromEmail}
              onChange={(e) => setSmtp('fromEmail', e.target.value)}
            />
          </div>
          <label className="field-inline span-2" style={{ padding: '0.5rem 0' }}>
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Use secure connection (SSL/TLS)</div>
              <div className="text-on-surface-variant" style={{ fontSize: '0.75rem' }}>
                Recommended for port 465
              </div>
            </div>
            <span className="switch">
              <input
                type="checkbox"
                checked={form.smtp.secure}
                onChange={(e) => setSmtp('secure', e.target.checked)}
              />
              <span className="track" />
              <span className="thumb" />
            </span>
          </label>
        </div>
      </section>

      <section className="card-section">
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            Send Mode
          </h2>
          <span className="icon text-secondary">rocket_launch</span>
        </div>
        <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <label className="field-inline">
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Test mode (no real emails)</div>
              <div className="text-on-surface-variant" style={{ fontSize: '0.75rem' }}>
                Simulates sending — great for trying things out
              </div>
            </div>
            <span className="switch">
              <input
                type="checkbox"
                checked={form.testMode}
                onChange={(e) => set('testMode', e.target.checked)}
              />
              <span className="track" />
              <span className="thumb" />
            </span>
          </label>
          <div className="info-note">
            <span className="icon">info</span>
            <span>
              {form.testMode
                ? 'Emails are simulated. Nothing is delivered, but every step of the pipeline is exercised. Turn this off to send real emails through your SMTP server.'
                : 'Real emails will be sent through your SMTP server. Double-check the recipient list before sending.'}
            </span>
          </div>
          {!form.testMode && !form.smtp.host && (
            <div className="info-note" style={{ color: 'var(--error)', background: 'var(--error-container)' }}>
              <span className="icon">error</span>
              <span>
                No SMTP host is configured here — real emails will fail unless the server has a system SMTP (SMTP_HOST in server/.env). Add your SMTP Server fields above.
              </span>
            </div>
          )}
        </div>
        <div className="card-footer">
          <span className="text-on-surface-variant" style={{ fontSize: '0.8125rem' }}>
            Changes apply to your next campaign
          </span>
          <button className="btn btn-primary" onClick={save} disabled={saving || !loaded} style={{ display: 'flex' }}>
            <span className="icon">{saving ? 'sync' : 'save'}</span>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </section>

      <section className="card-section">
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            Connection Test
          </h2>
          <span className="icon text-secondary">wifi_tethering</span>
        </div>
        <div className="card-pad">
          <button className="btn btn-primary btn-block" onClick={test} disabled={testing || !loaded}>
            <span className="icon">{testing ? 'sync' : 'terminal'}</span>
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          {testResult && (
            <p
              style={{
                margin: '0.75rem 0 0',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                color: testResult.ok ? 'var(--success)' : 'var(--error)',
              }}
            >
              <span className="icon" style={{ fontSize: 16 }}>
                {testResult.ok ? 'check_circle' : 'error'}
              </span>
              {testResult.message}
            </p>
          )}
        </div>
      </section>

      <section className="card-section">
        <div className="card-header">
          <h2 className="font-headline-md" style={{ margin: 0 }}>
            Need Help?
          </h2>
          <span className="icon text-secondary">support_agent</span>
        </div>
        <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div className="info-note">
            <span className="icon">mail</span>
            <span>
              Stuck with SMTP setup, campaigns or your account? Write to us and our team will get back to you.
            </span>
          </div>
          <div className="field-inline">
            <div>
              <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>Help line email</div>
              <div className="text-on-surface-variant" style={{ fontSize: '0.75rem' }}>
                We usually reply within 24 hours
              </div>
            </div>
          </div>
          <div className="help-email-box">
            <span className="icon">alternate_email</span>
            <span className="help-email-text">{HELP_EMAIL}</span>
            <button
              className="btn"
              title="Send us an email"
              onClick={() => {
                const mailtoUrl = `mailto:${HELP_EMAIL}?subject=${encodeURIComponent('Support request — Email Auto Machine')}&body=${encodeURIComponent(
                  'Hi team,\n\nI need help with:\n\n'
                )}`;
                window.open(mailtoUrl, '_blank');
              }}
              style={{ flexShrink: 0 }}
            >
              <span className="icon" style={{ fontSize: 18 }}>
                send
              </span>
              Email Us
            </button>
            <button
              className="btn"
              title="Copy email address"
              onClick={() => {
                navigator.clipboard
                  ?.writeText(HELP_EMAIL)
                  .then(() => showToast('Help email copied'))
                  .catch(() => showToast('Could not copy'));
              }}
              style={{ flexShrink: 0 }}
            >
              <span className="icon" style={{ fontSize: 18 }}>
                content_copy
              </span>
              Copy
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
