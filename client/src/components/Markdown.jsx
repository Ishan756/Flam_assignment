import React from 'react';

/** Very small inline markdown: bold, italics, inline code, links, and simple lists. */
function renderInline(text) {
  const parts = [];
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let m;
  let key = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('**')) {
      parts.push(<strong key={key++}>{tok.slice(2, -2)}</strong>);
    } else if (tok.startsWith('`')) {
      parts.push(
        <code key={key++} className="mcode">
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith('*')) {
      parts.push(<em key={key++}>{tok.slice(1, -1)}</em>);
    } else {
      const mm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push(
        <a key={key++} href={mm[2]} target="_blank" rel="noreferrer">
          {mm[1]}
        </a>,
      );
    }
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export default function Markdown({ text }) {
  const lines = String(text || '').split('\n');
  const nodes = [];
  let list = [];
  let listType = null;
  let key = 0;

  const flush = () => {
    if (list.length) {
      nodes.push(
        <ul key={key++} className="m-list">
          {list.map((item, i) => (
            <li key={i}>{renderInline(item)}</li>
          ))}
        </ul>,
      );
      list = [];
      listType = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    const bullet = line.match(/^[-*•]\s+(.*)$/);
    const num = line.match(/^\d+[.)]\s+(.*)$/);
    if (bullet || num) {
      if (listType !== (bullet ? 'ul' : 'ol')) {
        flush();
        listType = bullet ? 'ul' : 'ol';
      }
      list.push(bullet ? bullet[1] : num[1]);
    } else {
      flush();
      if (line) nodes.push(<p key={key++}>{renderInline(line)}</p>);
    }
  }
  flush();

  return <div className="m">{nodes}</div>;
}
