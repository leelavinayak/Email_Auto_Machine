import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import DesignControls from '../components/DesignControls.jsx';
import EmailPreview from '../components/EmailPreview.jsx';
import { DEFAULT_DESIGN, cleanPastedText, cleanMarkdown, insertText, posterUrl } from '../utils/cleanText.js';

const SAMPLE_BODY = `Hi {{Name}},

We're excited to share this update with you.

Best,
The Team`;

export default function Templates({ goComposer, showToast }) {
  const fileRef = useRef(null);
  const bodyRef = useRef(null);
  const [templates, setTemplates] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState(SAMPLE_BODY);
  const [design, setDesign] = useState(DEFAULT_DESIGN);
  const [poster, setPoster] = useState(null);
  const [posterPosition, setPosterPosition] = useState('top');
  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    try {
      const list = await api.listTemplates();
      setTemplates(list);
    } catch (err) {
      showToast(err.message);
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSubject('');
    setBody(SAMPLE_BODY);
    setDesign(DEFAULT_DESIGN);
    setPoster(null);
    setPosterPosition('top');
    if (bodyRef.current) bodyRef.current.focus();
  };

  const applyTemplate = (t) => {
    setEditingId(t._id || t.id);
    setName(t.name || '');
    setSubject(t.subject || '');
    setBody(t.body || '');
    setDesign((cur) => (t.design && Object.keys(t.design).length ? { ...DEFAULT_DESIGN, ...t.design } : cur));
    setPoster(t.posterImage ? { path: t.posterImage, url: posterUrl(t.posterImage) } : null);
    setPosterPosition(t.posterPosition === 'bottom' ? 'bottom' : 'top');
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const plain = e.clipboardData.getData('text/plain');
    const cleaned = cleanPastedText(plain, html);
    if (cleaned) insertText(bodyRef.current, body, setBody, cleaned);
  };

  const wrapSelection = (tag) => {
    const ta = bodyRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = (body.slice(start, end) || 'text').trim();
    const open = tag === 'a' ? '<a href="https://">' : `<${tag}>`;
    const close = tag === 'a' ? '</a>' : `</${tag}>`;
    const next = body.slice(0, start) + open + sel + close + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + open.length, start + open.length + sel.length);
    });
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

  const canSave = body.trim();

  const handleSave = async () => {
    if (!body.trim()) return showToast('Write an email body');
    if (saving) return;
    const finalName = name.trim() || `My design ${new Date().toLocaleDateString('en-GB')}`;
    if (!name.trim()) setName(finalName);
    setSaving(true);
    const payload = {
      name: finalName,
      subject,
      body,
      posterImage: poster ? poster.path : null,
      posterPosition,
      design,
    };
    try {
      let res;
      if (editingId) {
        res = await api.updateTemplate(editingId, payload);
        showToast('Template updated');
      } else {
        res = await api.createTemplate(payload);
        setEditingId(res.template._id || res.template.id);
        showToast('Template saved');
      }
      await load();
    } catch (err) {
      showToast(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.deleteTemplate(confirm._id || confirm.id);
      setTemplates((prev) => prev.filter((t) => (t._id || t.id) !== (confirm._id || confirm.id)));
      if ((editingId || '') === (confirm._id || confirm.id)) resetForm();
      showToast('Template deleted');
    } catch (err) {
      showToast(err.message);
    } finally {
      setDeleting(false);
      setConfirm(null);
    }
  };

  const useInComposer = (t) => {
    const id = t._id || t.id;
    try {
      localStorage.setItem('emailTemplateId', String(id));
    } catch (err) {}
    goComposer();
  };

  return (
    <div className="page" style={{ padding: '1rem' }}>
      <div className="templates-grid">
        {/* ------- Left: editor ------- */}
        <div className="templates-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <section className="card-section">
            <div className="card-header">
              <div>
                <h2 className="font-headline-md text-on-surface" style={{ margin: 0 }}>
                  Design your email format
                </h2>
                <p className="text-on-surface-variant" style={{ margin: '0.25rem 0 0', fontSize: '0.75rem' }}>
                  Style it, preview it live, then save and reuse it in the Composer.
                </p>
              </div>
              {editingId && (
                <button className="btn" onClick={resetForm}>
                  <span className="icon" style={{ fontSize: 16 }}>
                    add
                  </span>
                  New
                </button>
              )}
            </div>

            <div className="card-pad" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {/* Saved templates */}
              <div>
                <span className="font-label-sm text-on-surface-variant" style={{ display: 'inline-block', marginBottom: '0.375rem' }}>
                  Saved templates
                </span>
                {!loaded ? (
                  <p className="text-on-surface-variant" style={{ fontSize: '0.75rem', margin: 0 }}>
                    Loading...
                  </p>
                ) : templates.length === 0 ? (
                  <p className="text-on-surface-variant" style={{ fontSize: '0.75rem', margin: 0 }}>
                    No saved templates yet — design one below and press Save.
                  </p>
                ) : (
                  <div className="hscroll" style={{ paddingBottom: 2 }}>
                    {templates.map((t) => {
                      const id = t._id || t.id;
                      const active = editingId === id;
                      return (
                        <div key={id} className={`template-chip${active ? ' template-chip-active' : ''}`} onClick={() => applyTemplate(t)}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', minWidth: 0 }}>
                            <span className="icon" style={{ fontSize: 15, color: 'var(--secondary)' }}>
                              palette
                            </span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.125rem' }}>
                            <button
                              className="tpl-action"
                              title="Use this template in the Composer"
                              onClick={(e) => {
                                e.stopPropagation();
                                useInComposer(t);
                              }}
                            >
                              <span className="icon" style={{ fontSize: 14 }}>
                                send
                              </span>
                            </button>
                            <button
                              className="tpl-action tpl-action-danger"
                              title="Delete template"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirm(t);
                              }}
                            >
                              <span className="icon" style={{ fontSize: 14 }}>
                                delete
                              </span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="field">
                <label className="field-label" htmlFor="tpl-name">
                  Template name
                </label>
                <input
                  className="input"
                  id="tpl-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Welcome wave border"
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
                  id="tpl-body"
                  placeholder="Write your email here..."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  onPaste={handlePaste}
                />
              </div>

              {/* Poster image + position */}
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
                      ref={fileRef}
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
                  <span className="design-label" style={{ display: 'inline-block', marginBottom: '0.375rem' }}>
                    Image position
                  </span>
                  <div className="hscroll" style={{ paddingBottom: 2 }}>
                    {[
                      { id: 'top', label: 'Top of content', icon: 'vertical_align_top' },
                      { id: 'bottom', label: 'Bottom of content', icon: 'vertical_align_bottom' },
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
          </section>

          {/* Design options */}
          <section className="card-section">
            <div className="card-header">
              <h2 className="font-headline-md text-on-surface" style={{ margin: 0 }}>
                Border & style
              </h2>
            </div>
            <div className="card-pad">
              <DesignControls design={design} onChange={setDesign} />
            </div>
            <div className="card-footer">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving || !canSave} style={{ display: 'flex' }}>
                <span className="icon">{saving ? 'sync' : editingId ? 'save' : 'add'}</span>
                {saving ? 'Saving...' : editingId ? 'Update template' : 'Save this design as template'}
              </button>
            </div>
          </section>
        </div>

        {/* ------- Right: live preview ------- */}
        <div className="templates-col preview-col" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <section className="card-section">
            <div className="card-header">
              <h2 className="font-headline-md text-on-surface" style={{ margin: 0 }}>
                Preview
              </h2>
              <button
                className="btn btn-primary"
                style={{ gap: '0.375rem', fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                disabled={!editingId}
                onClick={() => {
                  if (editingId) {
                    const t = templates.find((x) => (x._id || x.id) === editingId);
                    if (t) useInComposer(t);
                  }
                }}
              >
                <span className="icon" style={{ fontSize: 15 }}>
                  edit_note
                </span>
                Use in Composer
              </button>
            </div>
            <p
              className="font-label-sm text-on-surface-variant"
              style={{ margin: 0, padding: '0.75rem 1rem 0', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              How recipients will receive it
            </p>
            <div className="card-pad">
              <EmailPreview subject={subject} body={body} poster={poster?.url} posterPosition={posterPosition} design={design} showSubject={false} />
            </div>
          </section>
        </div>
      </div>

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
                Delete template?
              </h3>
              <p className="text-on-surface-variant" style={{ fontSize: '0.875rem', textAlign: 'center', margin: '0 auto 1.25rem', maxWidth: 320 }}>
                "{confirm.name}" will be permanently removed. This action cannot be undone.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button className="btn btn-outline" onClick={() => setConfirm(null)} disabled={deleting}>
                  Cancel
                </button>
                <button className="btn btn-danger-outline" onClick={handleDelete} disabled={deleting}>
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