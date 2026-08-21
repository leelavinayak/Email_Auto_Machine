import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import DesignControls from '../components/DesignControls.jsx';
import EmailPreview from '../components/EmailPreview.jsx';
import {
  DEFAULT_DESIGN,
  cleanPastedText,
  cleanMarkdown,
  insertText,
  posterUrl,
} from '../utils/cleanText.js';

const SAMPLE_BODY = `Hi {{Name}},

We noticed your recent activity and wanted to follow up.

Best,
The Team`;

const DRAFT_KEY = 'composerDraft';

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function saveDraft(d) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch (err) {}
}

export default function Composer({ onSend, showToast }) {
  const draft = loadDraft();
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const [list, setList] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [subject, setSubject] = useState(draft?.subject ?? 'Update regarding {{Company}}');
  const [body, setBody] = useState(draft?.body ?? SAMPLE_BODY);
  const [poster, setPoster] = useState(draft?.poster ?? null);
  const [posterPosition, setPosterPosition] = useState(draft?.posterPosition ?? 'top');
  const [design, setDesign] = useState(draft?.design ? { ...DEFAULT_DESIGN, ...draft.design } : DEFAULT_DESIGN);
  const [templates, setTemplates] = useState([]);
  const [appliedTemplate, setAppliedTemplate] = useState(null);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [preview, setPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [testMode, setTestMode] = useState(null);

  useEffect(() => {
    saveDraft({ subject, body, poster, posterPosition, design, listId: list ? list.id : draft?.listId });
  }, [subject, body, poster, posterPosition, design, list]);

  useEffect(() => {
    let alive = true;
    const listId = draft && draft.listId;
    if (listId) {
      api
        .getList(listId)
        .then((res) => {
          if (alive) {
            setList({ id: res.id, filename: res.filename, columns: res.columns, rowCount: res.rowCount, preview: res.preview });
          }
        })
        .catch(() => {});
    }
    api
      .getSettings()
      .then((s) => {
        if (alive) setTestMode(s.testMode !== false);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const loadTemplates = async (applySaved) => {
    try {
      const list2 = await api.listTemplates();
      setTemplates(list2);
      let savedId = null;
      try {
        savedId = localStorage.getItem('emailTemplateId');
      } catch (err) {}
      if (applySaved && savedId) {
        const t = list2.find((x) => String(x._id || x.id) === String(savedId));
        if (t) {
          applyTemplateToEditor(t);
          try {
            localStorage.removeItem('emailTemplateId');
          } catch (err) {}
        }
      }
    } catch (err) {}
  };

  useEffect(() => {
    loadTemplates(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const columns = list ? list.columns : [];

  const applyTemplateToEditor = (t) => {
    if (String(t.subject || '').trim()) setSubject(t.subject);
    if (String(t.body || '').trim()) setBody(t.body);
    setPoster(t.posterImage ? { path: t.posterImage, url: posterUrl(t.posterImage) } : null);
    setPosterPosition(t.posterPosition === 'bottom' ? 'bottom' : 'top');
    setDesign((cur) => (t.design && Object.keys(t.design).length ? { ...DEFAULT_DESIGN, ...t.design } : cur));
    setAppliedTemplate(t.name || '');
  };

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await api.uploadList(file);
      setList({ id: res.id, filename: res.filename, columns: res.columns, rowCount: res.rowCount, preview: res.preview });
    } catch (err) {
      showToast(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePoster = async (file) => {
    if (!file) return;
    setUploadingImg(true);
    try {
      const res = await api.uploadImage(file);
      setPoster({ url: res.url, path: res.path });
    } catch (err) {
      showToast(err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const insertVar = (name) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart ?? body.length;
    const end = ta.selectionEnd ?? body.length;
    const next = body.slice(0, start) + name + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + name.length;
      ta.setSelectionRange(pos, pos);
    });
  };

  const wrapSelection = (tag, attr) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = body.slice(start, end) || tag === 'a' ? 'link' : 'text';
    const open = tag === 'a' ? '<a href="https://">' : `<${tag}>`;
    const close = tag === 'a' ? '</a>' : `</${tag}>`;
    const next = body.slice(0, start) + open + sel + close + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + open.length, start + open.length + sel.length);
    });
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const cleaned = cleanPastedText(plain, html);
    if (cleaned) insertText(bodyRef.current, body, setBody, cleaned);
  };

  const handleSend = async (e) => {
    if (!list) return showToast('Connect a spreadsheet first');
    if (!subject.trim()) return showToast('Add a subject line');
    if (!body.trim()) return showToast('Write an email body');
    if (sending) return;

    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.left = `${e.clientX - rect.left}px`;
    ripple.style.top = `${e.clientY - rect.top}px`;
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);

    setSending(true);
    try {
      const res = await Promise.race([
        api.createCampaign({
          listId: list.id,
          title: subject,
          subject,
          body,
          posterImage: poster ? poster.path : null,
          posterPosition,
          design,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Request timed out. Check that the server is running and try again.')), 60000)
        ),
      ]);
      onSend(res.campaign);
    } catch (err) {
      showToast(err.message);
      setSending(false);
    }
  };

  return (
    <div className="page" style={{ padding: '1rem' }}>
      <div className="composer-grid">
        <div className="composer-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Data Source Section */}
          <section className="card-section">
            <div className="card-header">
              <h2 className="font-headline-md text-on-surface" style={{ margin: 0 }}>
                Data Source
              </h2>
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={uploading}>
                <span className="icon" style={{ fontSize: 16 }}>
                  upload_file
                </span>
                {uploading ? 'Reading...' : 'Connect'}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: 'none' }}
                onChange={(e) => {
                  handleFile(e.target.files[0]);
                  e.target.value = '';
                }}
              />
            </div>

            {!list ? (
              <div
                style={{
                  padding: '1.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--on-surface-variant)',
                  fontSize: '0.875rem',
                }}
              >
                <div className="icon" style={{ fontSize: 36, opacity: 0.5, marginBottom: '0.5rem' }}>
                  table_rows
                </div>
                Upload a <strong>.csv</strong> or <strong>.xlsx</strong> spreadsheet with your contacts.
                <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.7 }}>
                  Include an <strong>Email</strong> column and any columns you want to personalize with.
                </div>
              </div>
            ) : (
              <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="file-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="icon text-secondary" style={{ fontSize: 18 }}>
                        table
                      </span>
                      <span className="font-label-md text-on-surface-variant">{list.filename}</span>
                    </div>
                    <span className="badge">{list.rowCount} rows</span>
                  </div>
                  <div className="hscroll">
                    {columns.slice(0, 8).map((col) => (
                      <div className="col-chip" key={col}>
                        <p className="col-chip-title" style={{ margin: 0 }}>
                          {col}
                        </p>
                        <p className="col-chip-value" style={{ margin: 0 }}>
                          {list.preview && list.preview[col] !== undefined && list.preview[col] !== '' ? String(list.preview[col]) : '—'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  className="btn"
                  style={{ alignSelf: 'flex-start', fontSize: '0.75rem' }}
                  onClick={() => fileRef.current?.click()}
                >
                  <span className="icon" style={{ fontSize: 15 }}>
                    swap_horiz
                  </span>
                  Replace file
                </button>
              </div>
            )}
          </section>

          {list && (
            <div className="info-note">
              <span className="icon">info</span>
              <span>
                Found <strong>{list.rowCount} rows</strong> across {list.columns.length} columns. Rows with an{' '}
                <strong>Email</strong> column will each receive a personalized email.
              </span>
            </div>
          )}
        </div>

        <div className="composer-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Compose Section */}
          <section className="card-section">
            <div className="card-header">
              <h2 className="font-headline-md text-on-surface" style={{ margin: 0 }}>
                Compose
              </h2>
              <button className="btn btn-icon" onClick={() => setPreview(!preview)} title="Preview">
                <span className="icon">{preview ? 'edit' : 'visibility'}</span>
              </button>
            </div>

            {preview ? (
              <div className="card-pad">
                <EmailPreview
                  subject={subject}
                  body={body}
                  poster={poster?.url}
                  posterPosition={posterPosition}
                  design={design}
                />
              </div>
            ) : (
              <>
                {/* Saved template picker */}
                {templates.length > 0 && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      background: 'var(--surface)',
                      borderBottom: '1px solid var(--outline-variant)',
                    }}
                  >
                    <span
                      className="font-label-sm text-on-surface-variant"
                      style={{ display: 'inline-block', marginBottom: '0.375rem' }}
                    >
                      Use a saved design {appliedTemplate && <span className="badge" style={{ marginLeft: '0.375rem' }}>{appliedTemplate}</span>}
                    </span>
                    <div className="hscroll" style={{ paddingBottom: 2 }}>
                      {templates.map((t) => {
                        const id = t._id || t.id;
                        return (
                          <button
                            key={id}
                            className={`chip snap-start ${appliedTemplate === t.name ? 'chip-active' : ''}`}
                            onClick={() => applyTemplateToEditor(t)}
                            title={`Use "${t.name}"`}
                          >
                            <span className="icon" style={{ fontSize: 14 }}>
                              palette
                            </span>
                            {t.name}
                          </button>
                        );
                      })}
                      <button
                        className="chip snap-start"
                        title="Design and save email formats"
                        onClick={() => {
                          try {
                            localStorage.removeItem('emailTemplateId');
                          } catch (err) {}
                          window.location.hash = 'templates';
                        }}
                      >
                        <span className="icon" style={{ fontSize: 14 }}>
                          add
                        </span>
                        New design
                      </button>
                    </div>
                  </div>
                )}

                {/* Variable Insertion Pills */}
                <div
                  className="hscroll"
                  style={{
                    padding: '0.75rem 1rem',
                    background: 'var(--surface)',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--outline-variant)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.375rem',
                      fontSize: '0.6875rem',
                      color: 'var(--on-surface-variant)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span className="icon" style={{ fontSize: 14 }}>
                      data_object
                    </span>
                    Insert:
                  </div>
                  {columns.length === 0 && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--on-surface-variant)', opacity: 0.6 }}>
                      Connect a spreadsheet to see variables
                    </span>
                  )}
                  {columns.map((col) => (
                    <button key={col} className="var-pill" onClick={() => insertVar(`{{${col}}}`)}>
                      {'{{' + col + '}}'}
                    </button>
                  ))}
                </div>

                <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div className="field">
                    <label className="field-label" htmlFor="subject">
                      Subject
                    </label>
                    <input
                      className="input"
                      id="subject"
                      type="text"
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="field">
                    <div className="toolbar">
                      <button className="toolbar-btn" title="Bold" onClick={() => wrapSelection('strong')}>
                        <span className="icon">format_bold</span>
                      </button>
                      <button className="toolbar-btn" title="Italic" onClick={() => wrapSelection('em')}>
                        <span className="icon">format_italic</span>
                      </button>
                      <button className="toolbar-btn" title="Link" onClick={() => wrapSelection('a')}>
                        <span className="icon">link</span>
                      </button>
                      <button
                        className="toolbar-btn"
                        title="Clean stray characters (stars, slashes) from pasted text"
                        onClick={() => setBody((b) => cleanMarkdown(b))}
                      >
                        <span className="icon">auto_fix_normal</span>
                      </button>
                    </div>
                    <textarea
                      ref={bodyRef}
                      className="editor"
                      id="emailBody"
                      placeholder="Write your email here..."
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      onPaste={handlePaste}
                    />
                  </div>

                  {/* Poster image */}
                  <div>
                    <span
                      style={{
                        fontSize: '0.6875rem',
                        fontWeight: 500,
                        color: 'var(--secondary)',
                        display: 'inline-block',
                        marginBottom: '0.375rem',
                      }}
                    >
                      Image (optional)
                    </span>
                    {!poster ? (
                      <label className="poster-drop">
                        <span className="icon" style={{ fontSize: 24, color: 'var(--secondary)' }}>
                          add_photo_alternate
                        </span>
                        <span style={{ fontSize: '0.8125rem' }}>
                          {uploadingImg ? 'Uploading...' : 'Tap to add an image to your email'}
                        </span>
                        <span style={{ fontSize: '0.6875rem', opacity: 0.7 }}>PNG, JPG, GIF or WEBP</span>
                        <input
                          type="file"
                          accept="image/*"
                          style={{ display: 'none' }}
                          onChange={(e) => {
                            handlePoster(e.target.files[0]);
                            e.target.value = '';
                          }}
                        />
                      </label>
                    ) : (
                      <div className="poster-preview">
                        <img src={poster.url} alt="Poster preview" />
                        <button className="poster-remove" onClick={() => setPoster(null)} title="Remove image">
                          <span className="icon">close</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {poster && (
                    <div>
                      <span
                        className="design-label"
                        style={{ display: 'inline-block', marginBottom: '0.375rem' }}
                      >
                        Image position
                      </span>
                      <div className="hscroll" style={{ paddingBottom: 2 }}>
                        {[
                          { id: 'top', label: 'Top', icon: 'vertical_align_top' },
                          { id: 'bottom', label: 'Bottom', icon: 'vertical_align_bottom' },
                        ].map((p) => (
                          <button
                            key={p.id}
                            className={`chip snap-start ${posterPosition === p.id ? 'chip-active' : ''}`}
                            onClick={() => setPosterPosition(p.id)}
                          >
                            <span className="icon" style={{ fontSize: 14 }}>
                              {p.icon}
                            </span>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
            <div className="card-footer">
              {testMode && (
                <div className="info-note" style={{ color: 'var(--secondary)', background: 'var(--secondary-container)' }}>
                  <span className="icon" style={{ fontSize: 16, color: 'var(--on-secondary-container)' }}>
                    science
                  </span>
                  <span style={{ color: 'var(--on-secondary-container)' }}>
                    Test mode is ON — emails will be <strong>simulated and NOT delivered</strong> to your recipients. Turn it
                    off in <strong>Profile → Send Mode</strong> to send real emails.
                  </span>
                </div>
              )}
              {list && (
                <span className="composer-send-note">
                  Sends personalized emails to <strong>{list.rowCount}</strong> recipients from {list.filename}
                </span>
              )}
              <button type="button" className="btn btn-primary" onClick={handleSend} disabled={sending} style={{ display: 'flex' }}>
                <span className="btn-shine" />
                <span className="btn-content">
                  <span className="icon">{sending ? 'sync' : 'send'}</span>
                  {sending ? 'Starting campaign...' : 'Send Emails'}
                </span>
              </button>
            </div>
          </section>

          {/* Design options */}
          <section className="card-section">
            <div className="card-header">
              <h2 className="font-headline-md text-on-surface" style={{ margin: 0 }}>
                Border & style
              </h2>
              <button className="btn" style={{ fontSize: '0.75rem' }} onClick={() => (window.location.hash = 'templates')}>
                <span className="icon" style={{ fontSize: 15 }}>
                  palette
                </span>
                Save designs
              </button>
            </div>
            <div className="card-pad">
              <DesignControls design={design} onChange={setDesign} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}