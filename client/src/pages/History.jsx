import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api.js';
import { subscribe } from '../events.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'inprogress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
  { id: 'scheduled', label: 'Scheduled' },
];

const SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'name', label: 'A → Z' },
  { id: 'sent', label: 'Most sent' },
];

function statusInfo(c) {
  const nothingSent = c.sent === 0 && c.failed > 0;
  if (c.status === 'sending') return { label: 'Sending', cls: 'status-sending', icon: 'sync' };
  if (c.status === 'paused') return { label: 'Paused', cls: 'status-paused', icon: 'pause' };
  if (c.status === 'scheduled') return { label: 'Scheduled', cls: 'status-scheduled', icon: 'schedule' };
  if (c.status === 'failed' || nothingSent) return { label: 'Failed', cls: 'status-failed', icon: 'error' };
  if (c.sent > 0 && c.failed > 0) return { label: 'Partial', cls: 'status-scheduled', icon: 'warning' };
  return { label: 'Sent', cls: 'status-sent', icon: 'check_circle' };
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' • ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  );
}

function extractEmail(row) {
  if (!row || typeof row !== 'object') return '';
  const val = (v) => v !== undefined && v !== null && String(v).trim() !== '';
  if (val(row.Email)) return String(row.Email).trim();
  if (val(row.email)) return String(row.email).trim();
  for (const key of Object.keys(row)) {
    if (/email/i.test(key) && val(row[key])) return String(row[key]).trim();
  }
  return '';
}

export default function History({ openCampaign, showToast, goComposer }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [tuneOpen, setTuneOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = async (silent) => {
    try {
      const list = await api.listCampaigns();
      setCampaigns(list);
    } catch (err) {
      if (!silent) showToast(err.message);
    } finally {
      setLoaded(true);
    }
  };

  const lastRefetch = useRef(0);

  const refreshSoon = (silent) => {
    const now = Date.now();
    if (now - lastRefetch.current < 1200) return;
    lastRefetch.current = now;
    load(silent);
  };

  useEffect(() => {
    load(true);
    const unsubCampaign = subscribe('campaign', () => refreshSoon(true));
    const unsubCampaigns = subscribe('campaigns', () => refreshSoon(true));
    const unsubConn = subscribe('connection', (status) => {
      if (status === 'online') load(true);
    });
    return () => {
      unsubCampaign();
      unsubCampaigns();
      unsubConn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const list = campaigns.filter((c) => {
      const title = (c.title || '').toLowerCase();
      const subject = (c.subject || '').toLowerCase();
      const ok = !term || title.includes(term) || subject.includes(term) || (c.listFile || '').toLowerCase().includes(term);
      if (!ok) return false;
      switch (filter) {
        case 'inprogress':
          return c.status === 'sending' || c.status === 'paused';
        case 'completed':
          return c.status === 'completed' && !(c.sent === 0 && c.failed > 0);
        case 'failed':
          return c.status === 'failed' || (c.status === 'completed' && c.sent === 0 && c.failed > 0);
        case 'scheduled':
          return c.status === 'scheduled';
        default:
          return true;
      }
    });
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'name':
          return (a.title || '').localeCompare(b.title || '');
        case 'sent':
          return (b.sent || 0) - (a.sent || 0);
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });
  }, [campaigns, search, filter, sortBy]);

  const openDetail = async (c) => {
    setDetail({ campaign: c, recipients: [] });
    setDetailLoading(true);
    try {
      const res = await api.getCampaign(c._id);
      setDetail(res);
    } catch (err) {
      showToast(err.message);
    } finally {
      setDetailLoading(false);
    }
  };

  const resetFilters = () => {
    setSearch('');
    setFilter('all');
    setSortBy('newest');
    setTuneOpen(false);
  };

  const requestDelete = (c, e) => {
    if (e) e.stopPropagation();
    setConfirm(c);
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      if (confirm.all) {
        for (const c of campaigns) await api.deleteCampaign(c._id);
        setCampaigns([]);
        showToast('History cleared');
      } else {
        await api.deleteCampaign(confirm._id);
        setCampaigns((prev) => prev.filter((x) => x._id !== confirm._id));
        if (detail && detail.campaign && detail.campaign._id === confirm._id) setDetail(null);
        showToast('Campaign deleted');
      }
    } catch (err) {
      showToast(err.message);
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const noResults = search.trim() !== '' || filter !== 'all';
  const filtersActive = search.trim() !== '' || filter !== 'all' || sortBy !== 'newest';

  return (
    <div className="page">
      {/* Sticky search & filter bar */}
      <div className="search-bar">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div className="search-box">
            <span className="icon">search</span>
            <input
              className="search-input"
              id="campaign-search"
              placeholder="Search campaigns..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button className="search-clear" title="Clear search" onClick={() => setSearch('')}>
                <span className="icon">close</span>
              </button>
            )}
          </div>
          <button
            className={`search-tune${tuneOpen ? ' search-tune-active' : ''}`}
            title="Sort & filters"
            onClick={() => setTuneOpen(!tuneOpen)}
          >
            <span className="icon">tune</span>
          </button>
        </div>

        <div className="hscroll" style={{ marginTop: '0.75rem', paddingBottom: 2 }}>
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`chip snap-start ${filter === f.id ? 'chip-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        {tuneOpen && (
          <div className="filter-panel">
            <div className="filter-head">
              <span className="filter-title">Sort by</span>
              <span className="filter-count">
                {filtered.length} of {campaigns.length} campaigns
              </span>
            </div>
            <div className="hscroll" style={{ paddingBottom: 2 }}>
              {SORTS.map((s) => (
                <button
                  key={s.id}
                  className={`chip snap-start ${sortBy === s.id ? 'chip-active' : ''}`}
                  onClick={() => setSortBy(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="filter-actions">
              {filtersActive && (
                <button className="filter-link" onClick={resetFilters}>
                  <span className="icon" style={{ fontSize: 16 }}>
                    refresh
                  </span>
                  Reset filters
                </button>
              )}
              {campaigns.length > 0 && (
                <button className="filter-link filter-link-danger" onClick={() => setConfirm({ all: true })}>
                  <span className="icon" style={{ fontSize: 16 }}>
                    delete_sweep
                  </span>
                  Clear all history
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Campaign list */}
      {loaded && filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-orb">
            <div className="ping" />
            <div className="core">
              <span className="icon">forward_to_inbox</span>
            </div>
            <span className="icon float" style={{ top: 8, right: -8, fontSize: 24, transform: 'rotate(12deg)' }}>
              mail
            </span>
            <span className="icon float" style={{ bottom: 16, left: -16, fontSize: 20, transform: 'rotate(-12deg)' }}>
              drafts
            </span>
          </div>
          <h2 className="font-headline-lg" style={{ margin: 0, fontSize: '1.5rem' }}>
            {noResults ? 'No matches found' : 'Quiet in here...'}
          </h2>
          <p className="text-on-surface-variant" style={{ maxWidth: 280, margin: '0.5rem auto 1.5rem', fontSize: '0.9375rem' }}>
            {noResults
              ? `We couldn't find any campaigns matching "${search}".`
              : "You haven't sent any campaigns yet. Your future history is waiting to be written."}
          </p>
          {!noResults && (
            <button className="btn btn-primary" onClick={goComposer}>
              <span className="icon" style={{ fontSize: 18 }}>
                edit_note
              </span>
              Create Campaign
            </button>
          )}
        </div>
      ) : (
        <div className="history-grid">
          {filtered.map((c) => {
            const st = statusInfo(c);
            const total = c.total || 0;
            const sent = c.sent || 0;
            const failedCount = c.failed || 0;
            return (
              <article key={c._id} className="campaign-card" onClick={() => openDetail(c)}>
                <div className={`campaign-accent ${st.icon === 'error' ? 'campaign-accent-fail' : ''}`} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <h3 className="font-headline-md" style={{ margin: 0, marginBottom: '0.25rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.title || c.subject}
                    </h3>
                    <p className="text-on-surface-variant" style={{ margin: 0, fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="icon" style={{ fontSize: 14 }}>
                        calendar_today
                      </span>
                      {fmtDate(c.createdAt)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem', flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className={`status-chip ${st.cls}`}>
                        <span className="icon">{st.icon}</span>
                        {st.label}
                      </span>
                      <button className="card-action" title="Delete campaign" onClick={(e) => requestDelete(c, e)}>
                        <span className="icon">delete</span>
                      </button>
                    </div>
                    {c.simulated && (
                      <span className="status-chip status-scheduled" title="Test mode — emails were simulated, not delivered">
                        <span className="icon">science</span>
                        Simulated
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginBottom: '0.75rem' }}>
                  <span className="recipient-pill">
                    <span className="icon">group</span>
                    {total.toLocaleString()} <span className="dim">recipients</span>
                  </span>
                  {c.listFile && (
                    <span className="recipient-pill" style={{ marginLeft: '0.5rem' }}>
                      <span className="icon">table</span>
                      <span className="dim">{c.listFile}</span>
                    </span>
                  )}
                </div>

                <div className="stats-grid">
                  <div>
                    <span className="stat-box-title">SENT EMAILS</span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: '#1e8e3e' }}>{sent.toLocaleString()}</span>
                      <span className="dim" style={{ fontSize: '0.75rem', paddingBottom: '0.25rem' }}>
                        {sent === 1 ? 'email delivered' : 'emails delivered'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="stat-box-title">FAILED EMAILS</span>
                    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.375rem' }}>
                      <span style={{ fontSize: 20, fontWeight: 700, color: 'var(--error)' }}>{failedCount.toLocaleString()}</span>
                      <span className="dim" style={{ fontSize: '0.75rem', paddingBottom: '0.25rem' }}>
                        {failedCount === 1 ? 'email failed' : 'emails failed'}
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Detail sheet */}
      {detail && (
        <div className="modal-overlay" onClick={() => setDetail(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-grabber" />
            <div style={{ padding: '0.75rem 1rem 0.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 className="font-headline-md" style={{ margin: 0 }}>
                    {detail.campaign.title}
                  </h3>
                  <p className="text-on-surface-variant" style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem' }}>
                    {fmtDate(detail.campaign.createdAt)} • {detail.campaign.listFile || 'no file'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.25rem', flexShrink: 0 }}>
                  <button className="btn btn-icon card-action-danger" title="Delete campaign" onClick={() => setConfirm(detail.campaign)}>
                    <span className="icon">delete</span>
                  </button>
                  <button className="btn btn-icon" onClick={() => setDetail(null)}>
                    <span className="icon">close</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                <span className="recipient-pill">
                  <span className="icon">mark_email_read</span>
                  {detail.campaign.sent} <span className="dim">sent</span>
                </span>
                <span className="recipient-pill">
                  <span className="icon">cancel</span>
                  {detail.campaign.failed} <span className="dim">failed</span>
                </span>
                <span className="recipient-pill">
                  <span className="icon">group</span>
                  {detail.campaign.total} <span className="dim">total</span>
                </span>
              </div>
            </div>

            <div className="modal-body">
              {detail.campaign.posterImage && (
                <img
                  src={detail.campaign.posterImage.replace(/^uploads/, '/uploads')}
                  alt="poster"
                  style={{ width: '100%', borderRadius: 8, marginBottom: '0.75rem', display: 'block' }}
                />
              )}
              <p className="font-label-sm text-on-surface-variant" style={{ margin: 0, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recipients
              </p>
              {detailLoading ? (
                <p className="text-on-surface-variant" style={{ fontSize: '0.875rem' }}>
                  Loading...
                </p>
              ) : detail.recipients.length === 0 ? (
                <p className="text-on-surface-variant" style={{ fontSize: '0.875rem' }}>
                  No recipients recorded.
                </p>
              ) : (
                detail.recipients.map((r) => {
                  const email = extractEmail(r.data || {}) || r.data?.Email || r.data?.email || '';
                  const name = r.data?.Name || r.data?.name || email.split('@')[0];
                  const initial = (name || '?').charAt(0).toUpperCase();
                  return (
                    <div key={r._id} className="rec-row">
                      <div className="rec-avatar">{initial}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        <div className="text-on-surface-variant" style={{ fontSize: '0.75rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {email}
                        </div>
                        {r.status === 'failed' && r.error && (
                          <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.125rem' }}>{r.error}</div>
                        )}
                      </div>
                      {r.status === 'sent' ? (
                        <span className="icon text-success" style={{ fontSize: 18 }}>
                          check_circle
                        </span>
                      ) : r.status === 'failed' ? (
                        <span className="icon text-error" style={{ fontSize: 18 }}>
                          cancel
                        </span>
                      ) : (
                        <span className="icon" style={{ fontSize: 18, color: 'var(--outline)' }}>
                          schedule
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {confirm && (
        <div className="modal-overlay" onClick={() => !deleting && setConfirm(null)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-grabber" />
            <div style={{ padding: '0.5rem 1rem 1.25rem' }}>
              <div className="delete-warning-orb">
                <span className="icon">delete_forever</span>
              </div>
              <h3 className="font-headline-md" style={{ margin: '0.75rem 0 0.25rem', textAlign: 'center' }}>
                {confirm.all ? 'Clear all history?' : 'Delete campaign?'}
              </h3>
              <p className="text-on-surface-variant" style={{ fontSize: '0.875rem', textAlign: 'center', margin: '0 auto 1.25rem', maxWidth: 320 }}>
                {confirm.all
                  ? `This will permanently remove all ${campaigns.length} campaign${campaigns.length === 1 ? '' : 's'} and their recipient records. This action cannot be undone.`
                  : `"${confirm.title || confirm.subject}" and its recipient records will be permanently removed. This action cannot be undone.`}
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-outline" onClick={() => setConfirm(null)} disabled={deleting}>
                  Cancel
                </button>
                <button className="btn btn-danger-outline" onClick={handleConfirmDelete} disabled={deleting}>
                  <span className="icon">delete</span>
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
