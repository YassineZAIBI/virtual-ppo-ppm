'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import type { Components } from 'react-markdown';

// ---------------------------------------------------------------------------
// Markdown normalizer — fixes common LLM output issues before parsing
// ---------------------------------------------------------------------------

function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|(.+\|)+\s*$/.test(trimmed);
}

function isSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  return /^\|[\s\-:|]+\|(\s*[\s\-:|]*\|)*\s*$/.test(trimmed);
}

function normalizeMarkdown(raw: string): string {
  let text = raw;

  // ── Phase 1: Fix LLM-specific malformed markdown ──────────────────────

  // 1a. Triple asterisks → double (***text:** or ***text*** → **text**)
  text = text.replace(/\*\*\*([^*\n]+?)\*\*\*?/g, '**$1**');

  // 1b. Fix unmatched bold markers (odd count of ** on a line)
  text = text.split('\n').map(line => {
    const count = (line.match(/\*\*/g) || []).length;
    if (count > 0 && count % 2 !== 0) {
      // Append closing ** to fix the dangling marker
      return line + '**';
    }
    return line;
  }).join('\n');

  // 1c. Strip LaTeX notation → plain text
  text = text.replace(/\$\\text\{([^}]*)\}\$/g, '$1');
  text = text.replace(/\$\\(?:frac|sqrt|sum|int)\{([^}]*)\}(?:\{([^}]*)\})?\$/g, '($1/$2)');
  text = text.replace(/\$\$([^$]+)\$\$/g, '$1');
  text = text.replace(/\$([^$\n]+)\$/g, '$1');

  // 1d. Fix missing space before bold markers: "text**Bold" → "text **Bold"
  text = text.replace(/([a-z,;)])\*\*([A-Za-z])/g, '$1 **$2');
  // Fix missing space after closing bold: "**Bold**text" → "**Bold** text"
  text = text.replace(/\*\*([a-z])/g, '** $1');

  // 1e. Fix inline numbered lists after colons: "Test:1.Model" → "Test:\n1. Model"
  text = text.replace(/:(\d+)\.\s*([A-Z])/g, ':\n$1. $2');

  // 1f. Fix missing space after colons before uppercase: "Output:A" → "Output: A"
  text = text.replace(/:([A-Z])/g, ': $1');

  // 1g. Convert numbered section headers to proper markdown ## headers
  // Handles: "1. Title", "**1. Title**", "1. **Title**", with optional trailing colon
  text = text.split('\n').map(line => {
    const trimmed = line.trim();
    // Match: optional bold + digit. + optional bold + title text + optional bold + optional colon
    const m = trimmed.match(/^(\*{0,2})(\d+)\.\s+(\*{0,2})(.+?)(\*{0,2})\s*$/);
    if (!m) return line;
    const [, , num, , rawTitle] = m;
    const title = rawTitle.replace(/\*+/g, '').replace(/:\s*$/, '').trim();
    // Must start with uppercase letter
    if (!/^[A-Z]/.test(title)) return line;
    // Must be reasonably short (section header, not a paragraph)
    if (title.length > 80) return line;
    // Skip if it looks like a regular sentence (period followed by space and lowercase)
    if (/\.\s+[a-z]/.test(title)) return line;
    return `## ${num}. ${title}`;
  }).join('\n');

  // ── Phase 2: Fix tables (state machine — keeps rows contiguous) ───────

  const lines = text.split('\n');
  const output: string[] = [];
  let inTable = false;
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length === 0) return;

    // Ensure separator row exists after the first (header) row
    if (tableBuffer.length >= 2 && !isSeparatorRow(tableBuffer[1])) {
      const colCount = (tableBuffer[0].match(/\|/g) || []).length - 1;
      const sep = '|' + ' --- |'.repeat(Math.max(colCount, 1));
      tableBuffer.splice(1, 0, sep);
    }

    // Add blank line BEFORE table if needed
    if (output.length > 0 && output[output.length - 1].trim() !== '') {
      output.push('');
    }

    // Push all table rows contiguously (no blank lines between)
    output.push(...tableBuffer);

    // Add blank line AFTER table
    output.push('');

    tableBuffer = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (isTableRow(line) || (inTable && isSeparatorRow(line))) {
      if (!inTable) inTable = true;
      tableBuffer.push(line);
    } else {
      if (inTable) {
        // End of table block
        flushTable();
        inTable = false;
      }
      output.push(line);
    }
  }

  // Flush any remaining table at end of input
  if (inTable) flushTable();

  text = output.join('\n');

  // ── Phase 3: Fix inline formatting ────────────────────────────────────

  // Fix bold with INTERNAL leading/trailing spaces: ** text** → **text**
  text = text.replace(/\*\*\s+([^\n*]+?)\*\*/g, '**$1**');
  text = text.replace(/\*\*([^\n*]+?)\s+\*\*/g, '**$1**');

  // ── Phase 4: Cleanup ─────────────────────────────────────────────────

  // Collapse excessive blank lines (4+ → 2)
  text = text.replace(/\n{4,}/g, '\n\n\n');

  return text;
}

// ---------------------------------------------------------------------------
// Custom React components for styled rendering
// ---------------------------------------------------------------------------

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-8 mb-4 pb-3 border-b-2 border-blue-500 dark:border-blue-400 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <div className="mt-8 mb-4 first:mt-0">
      <h2 className="text-lg font-bold text-blue-700 dark:text-blue-400 flex items-center gap-2.5">
        <span className="inline-block w-1.5 h-6 bg-blue-500 rounded-full flex-shrink-0" />
        {children}
      </h2>
    </div>
  ),
  h3: ({ children }) => (
    <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mt-6 mb-3 first:mt-0">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4 mb-2 first:mt-0">
      {children}
    </h4>
  ),
  p: ({ children }) => (
    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4 last:mb-0">
      {children}
    </p>
  ),
  ul: ({ children }) => (
    <ul className="space-y-2 mb-5 last:mb-0">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="space-y-2.5 mb-5 last:mb-0">{children}</ol>
  ),
  li: ({ children, ...props }) => {
    const isOrdered = (props as any).ordered;
    const index = (props as any).index;
    return (
      <li className="flex gap-2.5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
        {isOrdered ? (
          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-semibold flex items-center justify-center mt-0.5">
            {(index ?? 0) + 1}
          </span>
        ) : (
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-400 dark:bg-blue-500 mt-2" />
        )}
        <span className="flex-1">{children}</span>
      </li>
    );
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-800 dark:text-slate-200">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-slate-500 dark:text-slate-400">{children}</em>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-amber-400 bg-amber-50 dark:bg-amber-950/30 pl-4 pr-3 py-2 rounded-r-lg mb-4 text-sm text-amber-800 dark:text-amber-200">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <div className="rounded-lg bg-slate-900 dark:bg-slate-950 p-4 mb-4 overflow-x-auto">
          <code className="text-xs text-green-400 font-mono">{children}</code>
        </div>
      );
    }
    return (
      <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-mono text-pink-600 dark:text-pink-400">
        {children}
      </code>
    );
  },
  pre: ({ children }) => <>{children}</>,
  table: ({ children }) => (
    <div className="my-5 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden overflow-x-auto shadow-sm">
      <table className="w-full text-sm border-collapse">{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800">
      {children}
    </thead>
  ),
  tbody: ({ children }) => (
    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">{children}</tbody>
  ),
  tr: ({ children }) => (
    <tr className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors even:bg-slate-50/50 dark:even:bg-slate-800/30">
      {children}
    </tr>
  ),
  th: ({ children }) => (
    <th className="px-4 py-2.5 text-left text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider border-b-2 border-blue-200 dark:border-blue-800">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300">
      {children}
    </td>
  ),
  hr: () => (
    <hr className="my-6 border-slate-200 dark:border-slate-700" />
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300">
      {children}
    </a>
  ),
  del: ({ children }) => (
    <del className="text-slate-400 dark:text-slate-500 line-through">{children}</del>
  ),
};

// ---------------------------------------------------------------------------
// Exported component
// ---------------------------------------------------------------------------

interface StyledMarkdownProps {
  children: string;
  className?: string;
}

export function StyledMarkdown({ children, className }: StyledMarkdownProps) {
  const normalized = normalizeMarkdown(children || '');

  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        components={components}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
