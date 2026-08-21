import React, { useState } from 'react';
import { api } from '../api.js';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export const PROFESSIONS = [
  { id: 'college', label: 'College', icon: 'school' },
  { id: 'school', label: 'School', icon: 'book' },
  { id: 'company', label: 'Company', icon: 'work' },
  { id: 'personal', label: 'Personal', icon: 'person' },
];

const orgLabel = (id) =>
  id === 'college' ? 'college' : id === 'school' ? 'school' : id === 'company' ? 'company' : '';

export default function Login({ onAuthed, showToast }) {
  const [mode, setMode] = useState('login'); // login | register | forgot
  const [forgotStep, setForgotStep] = useState(0); // 0 email, 1 otp, 2 new password
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [devOtp, setDevOtp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const [profession, setProfession] = useState('');
  const [orgName, setOrgName] = useState('');
  const [phone, setPhone] = useState('');
  const [designation, setDesignation] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);
    if (mode === 'register' && !name.trim()) return setError('Please enter your name');
    if (mode === 'register' && !profession) return setError('Please select what you plan to use this app for');
    if (mode === 'register' && profession !== 'personal' && !orgName.trim()) {
      return setError(`Please enter your ${orgLabel(profession)} name`);
    }
    if (!email.trim() || !EMAIL_RE.test(email.trim())) return setError('Enter a valid email address');
    if (mode !== 'forgot' && password.length < 6) return setError('Password must be at least 6 characters');
    setBusy(true);
    try {
      const res =
        mode === 'register'
          ? await api.register({
              name: name.trim(),
              email: email.trim(),
              password,
              profession,
              orgName: orgName.trim(),
              phone: phone.trim(),
              designation: designation.trim(),
            })
          : await api.login({ email: email.trim(), password });
      showToast(mode === 'register' ? 'Account created — welcome aboard!' : 'Welcome back!');
      onAuthed(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError(null);

    if (forgotStep === 0) {
      if (!email.trim() || !EMAIL_RE.test(email.trim())) return setError('Enter a valid email address');
      setBusy(true);
      try {
        const res = await api.forgot(email.trim());
        setDevOtp(res.devOtp || null);
        setForgotStep(1);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (forgotStep === 1) {
      if (!/^\d{6}$/.test(otp.trim())) return setError('Enter the 6-digit code from the email');
      setBusy(true);
      try {
        await api.verifyOtp(email.trim(), otp.trim());
        setForgotStep(2);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
      return;
    }

    if (forgotStep === 2) {
      if (newPass.length < 6) return setError('New password must be at least 6 characters');
      if (newPass !== confirmPass) return setError('Passwords do not match');
      setBusy(true);
      try {
        await api.resetPassword(email.trim(), otp.trim(), newPass);
        showToast('Password updated — log in with your new password');
        setMode('login');
        setForgotStep(0);
        setPassword('');
        setNewPass('');
        setConfirmPass('');
        setOtp('');
        setDevOtp(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setBusy(false);
      }
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError(null);
    setProfession('');
    setOrgName('');
    setPhone('');
    setDesignation('');
  };

  const openForgot = () => {
    setMode('forgot');
    setForgotStep(0);
    setError(null);
  };

  const backFromForgot = () => {
    if (forgotStep > 0) {
      setForgotStep(forgotStep - 1);
    } else {
      setMode('login');
      setDevOtp(null);
    }
    setError(null);
  };

  const title =
    mode === 'login'
      ? 'Welcome back'
      : mode === 'register'
        ? 'Create your account'
        : forgotStep === 0
          ? 'Forgot password'
          : forgotStep === 1
            ? 'Check your email'
            : 'Set a new password';

  const subtitle =
    mode === 'login'
      ? 'Log in to send email campaigns from your spreadsheet'
      : mode === 'register'
        ? 'Start sending personalized emails in minutes'
        : forgotStep === 0
          ? 'Enter your account email and we will send you a one-time code'
          : forgotStep === 1
            ? `We sent a 6-digit code to ${email || 'your email'}`
            : 'Choose a new password for your account';

  return (
    <div className="page auth-screen">
      <div style={{ textAlign: 'center', margin: '2.5rem 0 1.5rem' }}>
        <div className="app-logo">
          <span className="icon">{mode === 'forgot' ? (forgotStep === 2 ? 'lock_reset' : 'mark_email_read') : 'forward_to_inbox'}</span>
        </div>
        <h1 className="font-headline-lg" style={{ margin: '1rem 0 0.25rem' }}>
          {title}
        </h1>
        <p className="text-on-surface-variant" style={{ margin: 0, fontSize: '0.9375rem' }}>
          {subtitle}
        </p>
      </div>

      {mode === 'forgot' ? (
        <form className="auth-card" onSubmit={submitForgot}>
          {forgotStep === 0 && (
            <div className="field">
              <label className="field-label" htmlFor="forgot-email">
                Email
              </label>
              <input
                className="input"
                id="forgot-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          )}

          {forgotStep === 1 && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="forgot-otp">
                  One-time code
                </label>
                <input
                  className="input input-mono"
                  id="forgot-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="••••••"
                  style={{ textAlign: 'center', fontSize: '1.25rem', letterSpacing: '0.5em' }}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                />
                {devOtp && (
                  <div className="info-note" style={{ marginTop: '0.75rem' }}>
                    <span className="icon">science</span>
                    <span>
                      Test mode is on — emails are simulated. Your code is <strong>{devOtp}</strong>
                    </span>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  setDevOtp(null);
                  api.forgot(email.trim()).then((r) => setDevOtp(r.devOtp || null)).catch((err) => setError(err.message));
                }}
                style={{
                  alignSelf: 'flex-start',
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
                Resend code
              </button>
            </>
          )}

          {forgotStep === 2 && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="forgot-pass">
                  New password
                </label>
                <input
                  className="input"
                  id="forgot-pass"
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="forgot-pass2">
                  Confirm new password
                </label>
                <input
                  className="input"
                  id="forgot-pass2"
                  type="password"
                  placeholder="Repeat your new password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.8125rem',
                color: 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: 'var(--error-container)',
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--radius)',
              }}
            >
              <span className="icon" style={{ fontSize: 16 }}>
                error
              </span>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }} disabled={busy}>
            <span className="icon">{busy ? 'sync' : forgotStep === 0 ? 'mail' : forgotStep === 1 ? 'pin' : 'lock_reset'}</span>
            {busy
              ? 'Please wait...'
              : forgotStep === 0
                ? 'Send code'
                : forgotStep === 1
                  ? 'Verify code'
                  : 'Update password'}
          </button>

          <p className="text-on-surface-variant" style={{ textAlign: 'center', margin: '1rem 0 0', fontSize: '0.875rem' }}>
            <button
              type="button"
              onClick={backFromForgot}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                padding: 0,
              }}
            >
              {forgotStep === 0 ? 'Back to login' : '← Back'}
            </button>
          </p>
        </form>
      ) : (
        <form className="auth-card" onSubmit={submit}>
          {mode === 'register' && (
            <div className="field">
              <label className="field-label" htmlFor="auth-name">
                Full name
              </label>
              <input
                className="input"
                id="auth-name"
                type="text"
                placeholder="Alex Johnson"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}
          {mode === 'register' && (
            <div className="field">
              <label className="field-label">What are you using this app for?</label>
              <div className="prof-options">
                {PROFESSIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`prof-option${profession === p.id ? ' prof-option-active' : ''}`}
                    onClick={() => {
                      setProfession(p.id);
                      setError(null);
                    }}
                  >
                    <span className="icon">{p.icon}</span>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {mode === 'register' && profession && profession !== 'personal' && (
            <>
              <div className="field">
                <label className="field-label" htmlFor="auth-org-name">
                  {orgLabel(profession).charAt(0).toUpperCase() + orgLabel(profession).slice(1)} name
                </label>
                <input
                  className="input"
                  id="auth-org-name"
                  type="text"
                  placeholder={profession === 'company' ? 'e.g. Acme Corp Ltd' : 'e.g. Anna University, Chennai'}
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="auth-designation">
                  Designation / role <span className="text-on-surface-variant" style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  className="input"
                  id="auth-designation"
                  type="text"
                  placeholder={profession === 'company' ? 'e.g. Marketing Manager' : 'e.g. Student / Faculty'}
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                />
              </div>
            </>
          )}
          <div className="field">
            <label className="field-label" htmlFor="auth-phone">
              Mobile number <span className="text-on-surface-variant" style={{ fontWeight: 400 }}>(optional)</span>
            </label>
            <input
              className="input"
              id="auth-phone"
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="auth-email">
              Email
            </label>
            <input
              className="input"
              id="auth-email"
              type="email"
              placeholder={
                profession === 'college' || profession === 'school'
                  ? 'you@college.edu — use your institution email'
                  : 'you@example.com'
              }
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="auth-pass">
              Password
            </label>
            <input
              className="input"
              id="auth-pass"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {mode === 'login' && (
            <button
              type="button"
              onClick={openForgot}
              style={{
                alignSelf: 'flex-end',
                background: 'none',
                border: 'none',
                color: 'var(--secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.8125rem',
                padding: 0,
                marginTop: '0.25rem',
              }}
            >
              Forgot password?
            </button>
          )}

          {error && (
            <div
              style={{
                marginTop: '0.75rem',
                fontSize: '0.8125rem',
                color: 'var(--error)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.375rem',
                background: 'var(--error-container)',
                padding: '0.625rem 0.75rem',
                borderRadius: 'var(--radius)',
              }}
            >
              <span className="icon" style={{ fontSize: 16 }}>
                error
              </span>
              {error}
            </div>
          )}

          <button className="btn btn-primary btn-block" style={{ marginTop: '1.25rem' }} disabled={busy}>
            <span className="icon">{busy ? 'sync' : mode === 'login' ? 'login' : 'person_add'}</span>
            {busy ? 'Please wait...' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>

          <p className="text-on-surface-variant" style={{ textAlign: 'center', margin: '1rem 0 0', fontSize: '0.875rem' }}>
            {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              type="button"
              onClick={switchMode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--secondary)',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font-body)',
                fontSize: '0.875rem',
                padding: 0,
              }}
            >
              {mode === 'login' ? 'Sign up free' : 'Log in'}
            </button>
          </p>
        </form>
      )}

      <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
        <button
          className="btn"
          style={{ background: 'transparent', color: 'var(--on-surface-variant)', boxShadow: 'none' }}
          onClick={() => {
            window.location.hash = 'home';
          }}
        >
          <span className="icon" style={{ fontSize: 16 }}>
            arrow_back
          </span>
          Back to home
        </button>
      </div>
    </div>
  );
}