import { z } from 'zod';

// ============ Core Interfaces ============

export interface DataAdapter {
  key: string;
  metadata: AdapterMetadata;
  fetch(query: string, options?: FetchOptions): Promise<DataResult[]>;
  testConnection?(config?: Record<string, any>): Promise<{ ok: boolean; error?: string }>;
}

export interface AdapterMetadata {
  name: string;
  icon: string;
  category: 'search' | 'social' | 'research' | 'government' | 'mcp' | 'feed' | 'activity' | 'custom';
  description: string;
  rateLimit: { requests: number; windowMs: number };
  capabilities: { searchable: boolean; streamable: boolean; realtime: boolean };
  requiresConfig: boolean;
}

export interface DataResult {
  sourceKey: string;
  sourceUrl: string;
  sourceName: string;
  title: string;
  content: string;
  contentType: 'article' | 'post' | 'paper' | 'dataset' | 'review' | 'statistic';
  publishedAt?: Date;
  fetchedAt: Date;
  metadata: Record<string, any>;
  relevanceHint?: number;
}

export interface FetchOptions {
  maxResults?: number;
  config?: Record<string, any>;
  signal?: AbortSignal;
}

// ============ Zod Schemas ============

export const DataResultSchema = z.object({
  sourceKey: z.string(),
  sourceUrl: z.string().url(),
  sourceName: z.string(),
  title: z.string(),
  content: z.string(),
  contentType: z.enum(['article', 'post', 'paper', 'dataset', 'review', 'statistic']),
  publishedAt: z.date().optional(),
  fetchedAt: z.date(),
  metadata: z.record(z.any()),
  relevanceHint: z.number().min(0).max(1).optional(),
});

export const FetchOptionsSchema = z.object({
  maxResults: z.number().min(1).max(100).optional().default(10),
  config: z.record(z.any()).optional(),
}).optional();

export type AdapterCategory = AdapterMetadata['category'];
