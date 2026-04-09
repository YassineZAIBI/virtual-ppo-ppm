import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a Date or date string into a readable format.
 * Example: "Feb 14, 2026"
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Formats a Date or date string into a relative time string.
 * Examples: "just now", "2 hours ago", "yesterday", "3 days ago"
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSeconds < 60) {
    return 'just now'
  } else if (diffMinutes < 60) {
    return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`
  } else if (diffHours < 24) {
    return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`
  } else if (diffDays === 1) {
    return 'yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffWeeks === 1) {
    return '1 week ago'
  } else if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`
  } else if (diffMonths === 1) {
    return '1 month ago'
  } else if (diffMonths < 12) {
    return `${diffMonths} months ago`
  } else {
    return formatDate(d)
  }
}

/**
 * Safely parses a JSON string, returning the fallback value if parsing fails.
 * Also handles already-parsed values (non-strings pass through).
 * Use for Prisma JSON-string fields: parseJSON(field, []) or parseJSON(field, {})
 */
export function parseJSON<T>(json: unknown, fallback: T): T {
  if (typeof json !== 'string') {
    return (json as T) ?? fallback
  }
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Extract JSON from an LLM response that may include markdown code fences.
 * Handles: ```json ... ```, ``` ... ```, raw JSON, and leading/trailing text.
 * Returns null if no valid JSON can be extracted.
 */
export function extractLLMJSON<T = unknown>(raw: string): T | null {
  if (!raw) return null;
  // Strip code fences (```json ... ``` or ``` ... ```)
  let cleaned = raw
    .replace(/^```json\s*/im, '')
    .replace(/^```\s*/im, '')
    .replace(/\s*```\s*$/im, '')
    .trim();
  // Try direct parse first
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Try to find JSON object or array in the string
    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    const match = objectMatch || arrayMatch;
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Safely parse a Prisma JSON-string tags field into a string array.
 * Handles: string[] | JSON string | null | undefined.
 */
export function parseTags(tags: string[] | string | null | undefined): string[] {
  if (Array.isArray(tags)) return tags;
  if (typeof tags === 'string') {
    try { return JSON.parse(tags); } catch { return []; }
  }
  return [];
}

/**
 * Generates a unique ID using crypto.randomUUID().
 */
export function generateId(): string {
  return crypto.randomUUID()
}
