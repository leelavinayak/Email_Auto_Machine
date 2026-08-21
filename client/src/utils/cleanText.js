export const DEFAULT_DESIGN = {
  enabled: true,
  color: '#0058be',
  style: 'solid',
  thickness: 3,
  radius: 12,
  padding: 24,
  bgColor: '#ffffff',
};

export const BORDER_STYLES = [
  { id: 'solid', label: 'Straight' },
  { id: 'dashed', label: 'Dashed' },
  { id: 'dotted', label: 'Dotted' },
  { id: 'double', label: 'Double' },
  { id: 'wave', label: 'Wave' },
  { id: 'zigzag', label: 'Zigzag' },
];

export const COLOR_SWATCHES = ['#0058be', '#1e8e3e', '#ba1a1a', '#7b1fa2', '#f59e0b', '#111827', '#37474f', '#ff7043'];

export const BG_SWATCHES = ['#ffffff', '#f7f9fb', '#eef4ff', '#f3fdf5', '#fff7e6', '#fdf2f8'];

export const posterUrl = (p) => (p ? (p.startsWith('/') ? p : '/' + p) : null);

export function encodeSvg(s) {
  return encodeURIComponent(s).replace(/'/g, '%27');
}

export function borderTiles(style, color) {
  const path =
    style === 'zigzag' ? 'M0 12 L 8 4 L 16 20 L 24 12' : 'M0 12 Q 6 0 12 12 T 24 12';
  const h = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'><path d='${path}' stroke='${color}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
  const v = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' fill='none'><g transform='rotate(90 12 12)'><path d='${path}' stroke='${color}' stroke-width='4' stroke-linecap='round' stroke-linejoin='round'/></g></svg>`;
  return { h: `data:image/svg+xml,${encodeSvg(h)}`, v: `data:image/svg+xml,${encodeSvg(v)}` };
}

export function buildBorderCss(d) {
  const style = {
    backgroundColor: (d && d.bgColor) || '#ffffff',
    color: (d && d.textColor) || '#191c1e',
    padding: `${Math.min(Math.max(Number((d && d.padding) || 24), 8), 64)}px`,
    fontSize: 15,
    lineHeight: 1.6,
    borderRadius: Math.min(Math.max(Number((d && d.radius) || 0), 0), 48),
    fontFamily: 'Arial, Helvetica, sans-serif',
  };
  if (!d || d.enabled === false) return style;
  const thickness = Math.min(Math.max(Number(d.thickness) || 3, 1), 16);
  const color = d.color || '#0058be';
  if (d.style === 'wave' || d.style === 'zigzag') {
    const tiles = borderTiles(d.style, color);
    const band = Math.min(6 + thickness * 2, 32);
    style.border = `1px solid ${color}`;
    style.backgroundImage = `url('${tiles.h}'), url('${tiles.h}'), url('${tiles.v}'), url('${tiles.v}')`;
    style.backgroundSize = `24px ${band}px, 24px ${band}px, ${band}px 24px, ${band}px 24px`;
    style.backgroundPosition = 'top center, bottom center, left center, right center';
    style.backgroundRepeat = 'repeat-x, repeat-x, repeat-y, repeat-y';
    return style;
  }
  const borderStyle = ['solid', 'dashed', 'dotted', 'double'].includes(d.style) ? d.style : 'solid';
  style.border = `${thickness}px ${borderStyle} ${color}`;
  return style;
}

const BLOCK_TAGS = new Set([
  'P', 'DIV', 'BR', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
  'LI', 'OL', 'UL', 'BLOCKQUOTE', 'TABLE', 'SECTION', 'ARTICLE',
  'HEADER', 'FOOTER', 'HR', 'PRE',
]);
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'HEAD', 'IFRAME', 'OBJECT', 'NOSCRIPT', 'TEMPLATE']);

export function htmlToSimple(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  const walkChildren = (node) => Array.from(node.childNodes).forEach(walk);
  const walk = (node) => {
    if (node.nodeType === 3) {
      out.push(node.nodeValue);
      return;
    }
    if (node.nodeType !== 1) return;
    const tag = node.tagName;
    if (SKIP_TAGS.has(tag)) return;
    if (tag === 'BR') {
      out.push('\n');
      return;
    }
    const block = BLOCK_TAGS.has(tag);
    if (block && out.length && out[out.length - 1] !== '\n') out.push('\n');
    if (tag === 'LI') out.push('- ');
    if (tag === 'A') {
      const href = node.getAttribute('href') || '';
      out.push(`<a href="${href}">`);
      walkChildren(node);
      out.push('</a>');
    } else if (tag === 'STRONG' || tag === 'B') {
      out.push('<strong>');
      walkChildren(node);
      out.push('</strong>');
    } else if (tag === 'EM' || tag === 'I') {
      out.push('<em>');
      walkChildren(node);
      out.push('</em>');
    } else if (tag === 'U') {
      out.push('<u>');
      walkChildren(node);
      out.push('</u>');
    } else if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') {
      out.push('<s>');
      walkChildren(node);
      out.push('</s>');
    } else if (tag === 'CODE') {
      out.push('<code>');
      walkChildren(node);
      out.push('</code>');
    } else if (tag === 'IMG') {
      const alt = node.getAttribute('alt') || '';
      if (alt.trim()) out.push(`[Image: ${alt.trim()}]`);
    } else {
      walkChildren(node);
    }
    if (block) out.push('\n');
  };
  walk(doc.body);
  let t = out.join('');
  t = t.replace(/[ \t]+\n/g, '\n');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export function cleanMarkdown(text) {
  if (!text) return '';
  let t = String(text).replace(/\r\n/g, '\n');
  t = t.replace(/\[([^[\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2">$1</a>');
  t = t.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
  t = t.replace(/(^|[\s(])\/([^/\n]+)\/(?=[\s).,!:;?]|$)/g, '$1<em>$2</em>');
  t = t.replace(/(^|[\s(])\*([^*\n]+)\*(?=[\s).,!:;?]|$)/g, '$1<em>$2</em>');
  t = t.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,!:;?]|$)/g, '$1<em>$2</em>');
  t = t.replace(/~~([^~\n]+)~~/g, '<s>$1</s>');
  t = t.replace(/`([^`\n]+)`/g, '<code>$1</code>');
  t = t.replace(/^\s*#{1,6}\s+/gm, '');
  t = t.replace(/^\s*>\s?/gm, '');
  t = t.replace(/^\s*[-*+]\s+/gm, '\u2022 ');
  t = t.replace(/^\s*\d+\.\s+/gm, '');
  t = t.replace(/(^|[\s(])[*_~#]+(?=[\w"'])/g, '$1');
  t = t.replace(/(?<=[\w"'.])[*_~#]+(?=$|[\s)])/g, '');
  t = t.replace(/(^|[\s(])\/(?=[\w"'])/g, '$1');
  t = t.replace(/\n{3,}/g, '\n\n');
  return t.trim();
}

export function cleanPastedText(plain, html) {
  if (html && html.trim()) {
    const converted = htmlToSimple(html);
    if (converted) return cleanMarkdown(converted);
  }
  return cleanMarkdown(plain || '');
}

export function insertText(ta, current, setCurrent, text) {
  const start = ta.selectionStart ?? (current || '').length;
  const end = ta.selectionEnd ?? (current || '').length;
  const next = (current || '').slice(0, start) + text + (current || '').slice(end);
  setCurrent(next);
  requestAnimationFrame(() => {
    ta.focus();
    const pos = start + text.length;
    ta.setSelectionRange(pos, pos);
  });
}