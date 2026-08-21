import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { subscribe } from '../events.js';

const C = 282.7;

export default function Progress({ campaignId, onDone, showToast }) {
  const [campaign, setCampaign] = useState(null);
  const [current, setCurrent] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const fetchedOnce = useRef(false);

  useEffect(() => {
    fetchedOnce.current = false;
    let alive = true;

    const fetchDetail = async () => {
      try {
        const res = await api.getCampaign(campaignId);
        if (!alive) return;
        setCampaign(res.campaign);
        const pending = res.recipients.find((r) => r.status === 'pending');
        if (pending) setCurrent(pending.data);
      } catch {
        /* server restarting — SSE will resync */
      }
    };
    fetchDetail();

    const unsubUpdate = subscribe('campaign', (payload) => {
      if (!alive) return;
      if (payload.id !== String(campaignId)) return;
      if (payload.cancelling) setCancelling(true);
      if (payload.campaign) {
        fetchedOnce.current = true;
        setCampaign(payload.campaign);
        if (payload.campaign.status === 'sending' && payload.campaign.sent > 0 && payload.current) {
          setCurrent(payload.current);
        }
      }
    });

    const unsubConn = subscribe('connection', (status) => {
      if (status === 'online' && !fetchedOnce.current) fetchDetail();
    });

    return () => {
      alive = false;
      unsubUpdate();
      unsubConn();
    };
  }, [campaignId]);

  if (!campaign) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="icon" style={{ fontSize: 28, color: 'var(--secondary)', animation: 'bounce 1.2s ease-in-out infinite' }}>
          sync
        </span>
      </div>
    );
  }

  const total = campaign.total || 0;
  const done = campaign.sent + campaign.failed;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const finished = campaign.status === 'completed' || campaign.status === 'failed';
  const offset = C * (1 - pct / 100);
  const fullyFailed = total > 0 && campaign.failed === total && campaign.sent === 0;
  const paused = campaign.status === 'paused';

  const handlePause = async () => {
    try {
      if (paused) {
        await api.resumeCampaign(campaignId);
        showToast('Campaign resumed');
      } else {
        await api.pauseCampaign(campaignId);
        showToast('Campaign paused');
      }
    } catch (err) {
      showToast(err.message);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this campaign? Sending will stop and remaining emails will be marked as failed.')) return;
    try {
      setCancelling(true);
      await api.cancelCampaign(campaignId);
      showToast('Campaign cancelled');
    } catch (err) {
      setCancelling(false);
      showToast(err.message);
    }
  };

  return (
    <div className="page" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        {finished ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 88,
                height: 88,
                margin: '0 auto 1rem',
                borderRadius: 9999,
                background: fullyFailed ? 'var(--error-container)' : 'var(--success-bg)',
                color: fullyFailed ? 'var(--on-error-container)' : 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span className="icon" style={{ fontSize: 44 }}>
                {fullyFailed ? 'error' : 'check_circle'}
              </span>
            </div>
            <h1 className="font-headline-lg" style={{ margin: 0 }}>
              {fullyFailed ? 'Campaign Failed' : 'Campaign Complete'}
            </h1>
            <p className="text-on-surface-variant" style={{ fontSize: '0.9375rem', margin: '0.375rem 0 0' }}>
              {fullyFailed ? 'Every email failed to send. Check your SMTP settings.' : `All done — ${campaign.sent} of ${total} emails delivered.`}
            </p>
            {fullyFailed && campaign.error && (
              <p
                className="info-note"
                style={{ maxWidth: 360, margin: '0.75rem auto 0', textAlign: 'left', color: 'var(--error)' }}
              >
                <span className="icon" style={{ fontSize: 16 }}>
                  error
                </span>
                <span>{campaign.error}</span>
              </p>
            )}
            {campaign.simulated && finished && !fullyFailed && (
              <p
                className="info-note"
                style={{ maxWidth: 360, margin: '0.75rem auto 0', textAlign: 'left', color: 'var(--secondary)' }}
              >
                <span className="icon" style={{ fontSize: 16 }}>
                  science
                </span>
                <span>
                  Test mode was ON — the emails were <strong>simulated, not delivered</strong>. Turn off{" "}
                  <strong>Test mode</strong> in Profile → Send Mode to send real emails.
                </span>
              </p>
            )}
          </div>
        ) : (
          <>
            <h1 className="font-headline-lg" style={{ margin: 0, textAlign: 'center' }}>
              {cancelling ? 'Cancelling...' : 'Campaign in Progress'}
            </h1>
            <p className="text-on-surface-variant" style={{ textAlign: 'center', margin: '0.5rem 0 0' }}>
              {paused ? 'Campaign is paused.' : campaign.simulated ? 'Simulation in progress — no emails will be delivered.' : 'Your emails are being dispatched.'}
            </p>
          </>
        )}

        {/* Progress ring */}
        <div className="ring">
          <div className="ring-pulse" style={{ animationPlayState: finished || paused || cancelling ? 'paused' : undefined }} />
          <div
            className="ring-ping"
            style={{
              animationPlayState: finished || paused || cancelling ? 'paused' : undefined,
              opacity: finished || paused || cancelling ? 0 : undefined,
            }}
          />
          <svg viewBox="0 0 100 100">
            <circle className="ring-track" cx="50" cy="50" r="45" />
            <circle
              className="ring-progress"
              cx="50"
              cy="50"
              r="45"
              strokeDasharray={C}
              strokeDashoffset={offset}
              stroke={fullyFailed && finished ? 'var(--error)' : undefined}
            />
          </svg>
          <div className="ring-inner">
            <span className="font-headline-lg" style={{ fontWeight: 700 }}>
              {pct}%
            </span>
            <span className="font-label-md text-on-surface-variant" style={{ marginTop: '0.25rem' }}>
              Completed
            </span>
          </div>
        </div>

        {/* Real-time status */}
        {!finished && (
          <div className="now-wrap">
            <div className="now-card">
              <div className="now-icon">
                <span className="icon">{paused ? 'pause' : 'send'}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p className="font-label-md text-on-surface-variant" style={{ margin: 0, marginBottom: '0.25rem' }}>
                  {paused ? 'Paused at:' : 'Sending to:'}
                </p>
                <p style={{ margin: 0, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {current?.Name || current?.name || '...'}
                </p>
                <p className="font-label-md text-on-surface-variant" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {current?.Email || current?.email || ''}
                </p>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <div className="bounce-dot" style={{ animationDelay: '0s', animationPlayState: paused ? 'paused' : undefined, opacity: paused ? 0.3 : undefined }} />
                <div className="bounce-dot" style={{ animationDelay: '0.2s', animationPlayState: paused ? 'paused' : undefined, opacity: paused ? 0.3 : undefined }} />
                <div className="bounce-dot" style={{ animationDelay: '0.4s', animationPlayState: paused ? 'paused' : undefined, opacity: paused ? 0.3 : undefined }} />
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1.5rem', marginTop: '1rem' }}>
          <div className="stat-col">
            <span className="stat-value">{campaign.sent}</span>
            <span className="stat-label">Sent</span>
          </div>
          <div className="divider-v" />
          <div className="stat-col">
            <span className="stat-value">{total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="divider-v" />
          <div className="stat-col">
            <span className="stat-value text-error">{campaign.failed}</span>
            <span className="stat-label">Failed</span>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={{ padding: '1rem', width: '100%' }}>
        {!finished ? (
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn btn-outline" onClick={handlePause} disabled={cancelling}>
              <span className="icon" style={{ fontSize: 18 }}>
                {paused ? 'play_arrow' : 'pause'}
              </span>
              {paused ? 'Resume' : 'Pause'}
            </button>
            <button className="btn btn-danger-outline" onClick={handleCancel} disabled={cancelling}>
              <span className="icon" style={{ fontSize: 18 }}>
                close
              </span>
              {cancelling ? 'Cancelling...' : 'Cancel'}
            </button>
          </div>
        ) : (
          <button className="btn btn-primary btn-block" onClick={onDone}>
            <span className="icon">history</span>
            View History
          </button>
        )}
      </div>
    </div>
  );
}
