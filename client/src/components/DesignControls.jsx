import React from 'react';
import { DEFAULT_DESIGN, BORDER_STYLES, COLOR_SWATCHES, BG_SWATCHES } from '../utils/cleanText.js';

export default function DesignControls({ design, onChange }) {
  const set = (patch) => onChange({ ...design, ...patch });
  return (
    <div className="design-controls" style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
      <div className="field-inline">
        <span className="design-label">Border</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            className="btn"
            title="Reset to the default style (straight border, blue)"
            onClick={() => onChange({ ...DEFAULT_DESIGN })}
          >
            <span className="icon" style={{ fontSize: 16 }}>
              refresh
            </span>
            Refresh
          </button>
          <label className="switch" title="Show a border around the email">
            <input type="checkbox" checked={design.enabled !== false} onChange={(e) => set({ enabled: e.target.checked })} />
            <span className="track" />
            <span className="thumb" />
          </label>
        </div>
      </div>

      {design.enabled !== false && (
        <>
          <div>
            <span className="design-label" style={{ display: 'inline-block', marginBottom: '0.375rem' }}>
              Border style
            </span>
            <div className="hscroll" style={{ paddingBottom: 2 }}>
              {BORDER_STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`chip snap-start ${design.style === s.id ? 'chip-active' : ''}`}
                  onClick={() => set({ style: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="design-label" style={{ display: 'inline-block', marginBottom: '0.375rem' }}>
              Border color
            </span>
            <div className="swatch-row">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  className={`swatch${design.color === c ? ' swatch-active' : ''}`}
                  style={{ background: c }}
                  title={c}
                  onClick={() => set({ color: c })}
                />
              ))}
              <label className="swatch-picker" title="Pick a custom color">
                <input
                  type="color"
                  value={design.color}
                  onChange={(e) => set({ color: e.target.value })}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                />
                <span className="icon" style={{ fontSize: 16 }}>
                  colorize
                </span>
              </label>
            </div>
          </div>

          <div className="field-inline">
            <span className="design-label">Border thickness</span>
            <input
              type="range"
              className="range"
              min={1}
              max={12}
              value={design.thickness || 3}
              onChange={(e) => set({ thickness: Number(e.target.value) })}
            />
            <span className="range-value">{design.thickness || 3}px</span>
          </div>

          <div className="field-inline">
            <span className="design-label">Corner radius</span>
            <input
              type="range"
              className="range"
              min={0}
              max={48}
              value={design.radius || 0}
              onChange={(e) => set({ radius: Number(e.target.value) })}
            />
            <span className="range-value">{design.radius || 0}px</span>
          </div>

          <div className="field-inline">
            <span className="design-label">Inner padding</span>
            <input
              type="range"
              className="range"
              min={8}
              max={64}
              value={design.padding || 24}
              onChange={(e) => set({ padding: Number(e.target.value) })}
            />
            <span className="range-value">{design.padding || 24}px</span>
          </div>

          <div>
            <span className="design-label" style={{ display: 'inline-block', marginBottom: '0.375rem' }}>
              Email background
            </span>
            <div className="swatch-row">
              {BG_SWATCHES.map((c) => (
                <button
                  key={c}
                  className={`swatch${design.bgColor === c ? ' swatch-active' : ''}`}
                  style={{ background: c, border: '1px solid var(--outline-variant)' }}
                  title={c}
                  onClick={() => set({ bgColor: c })}
                />
              ))}
              <label className="swatch-picker" title="Pick a custom color">
                <input
                  type="color"
                  value={design.bgColor}
                  onChange={(e) => set({ bgColor: e.target.value })}
                  style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer' }}
                />
                <span className="icon" style={{ fontSize: 16 }}>
                  colorize
                </span>
              </label>
            </div>
          </div>
        </>
      )}
    </div>
  );
}