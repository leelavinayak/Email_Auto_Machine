import React from 'react';
import { buildBorderCss, posterUrl } from '../utils/cleanText.js';

export default function EmailPreview({ subject, body, poster, posterPosition = 'top', design, showSubject = true }) {
  const img = posterUrl(poster);
  const innerStyle = buildBorderCss(design);
  const radius = innerStyle.borderRadius || 0;
  const subjectLine = subject ? String(subject).replace(/\{\{\s*([\w\s.-]+)\s*\}\}/g, '[var]') : '';
  return (
    <div className="email-preview-shell">
      <div style={{ background: '#eef2f7', padding: '1.25rem 1rem' }}>
        <div style={{ maxWidth: 520, margin: '0 auto' }}>
          {showSubject && subjectLine && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.375rem',
                fontSize: '0.6875rem',
                color: '#8a93a6',
                marginBottom: '0.5rem',
              }}
            >
              <span className="icon" style={{ fontSize: 13 }}>
                subject
              </span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '90%' }}>
                {subjectLine}
              </span>
            </div>
          )}
          <div style={innerStyle}>
            {img && posterPosition !== 'bottom' && (
              <img
                src={img}
                alt="Poster"
                style={{
                  width: '100%',
                  borderRadius: Math.min(Number(radius) || 0, 24) || 10,
                  marginBottom: '0.875rem',
                  display: 'block',
                }}
              />
            )}
            <div
              className="text-on-surface"
              style={{ wordBreak: 'break-word' }}
              dangerouslySetInnerHTML={{ __html: String(body || '').replace(/\n/g, '<br/>') || '&nbsp;' }}
            />
            {img && posterPosition === 'bottom' && (
              <img
                src={img}
                alt="Poster"
                style={{
                  width: '100%',
                  borderRadius: Math.min(Number(radius) || 0, 24) || 10,
                  marginTop: '0.875rem',
                  display: 'block',
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}