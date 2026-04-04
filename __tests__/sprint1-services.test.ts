import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockBrainNodeFindMany = vi.fn();
const mockBrainNodeUpsert = vi.fn();
const mockProactiveInsightFindFirst = vi.fn();
const mockProactiveInsightCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    brainNode: {
      findMany: (...args: unknown[]) => mockBrainNodeFindMany(...args),
      upsert: (...args: unknown[]) => mockBrainNodeUpsert(...args),
    },
    proactiveInsight: {
      findFirst: (...args: unknown[]) => mockProactiveInsightFindFirst(...args),
      create: (...args: unknown[]) => mockProactiveInsightCreate(...args),
    },
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────
import { buildAgentContext } from '@/lib/services/agent-context';
import { writeAgentMemory } from '@/lib/services/agent-memory-writer';
import { writeInsight } from '@/lib/services/insight-writer';

// ── Helpers ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
});

// ════════════════════════════════════════════════════════════════════
// buildAgentContext
// ════════════════════════════════════════════════════════════════════
describe('buildAgentContext', () => {
  it('returns empty string when no nodes exist', async () => {
    mockBrainNodeFindMany.mockResolvedValue([]);

    const result = await buildAgentContext('user-1', 'strategy');

    expect(result).toBe('');
    expect(mockBrainNodeFindMany).toHaveBeenCalledTimes(2);
  });

  it('returns formatted context when context nodes exist', async () => {
    // First call: contextNodes, second call: learningNodes
    mockBrainNodeFindMany
      .mockResolvedValueOnce([
        { type: 'vision', title: 'Our Vision', content: 'Build the best PM tool' },
        { type: 'goal', title: 'Q1 Goal', content: 'Reach 1k users' },
      ])
      .mockResolvedValueOnce([
        { title: 'Previous chat', summary: 'Discussed roadmap priorities' },
      ]);

    const result = await buildAgentContext('user-1', 'strategy');

    expect(result).toContain('--- COMPANY CONTEXT ---');
    expect(result).toContain('Vision:');
    expect(result).toContain('- Our Vision: Build the best PM tool');
    expect(result).toContain('Goals:');
    expect(result).toContain('- Q1 Goal: Reach 1k users');
    expect(result).toContain('--- AGENT MEMORY ---');
    expect(result).toContain('- Previous chat: Discussed roadmap priorities');
    expect(result).toContain('--- END CONTEXT ---');
  });

  it('handles malformed JSON / DB error gracefully by returning empty string', async () => {
    mockBrainNodeFindMany.mockRejectedValue(new Error('DB connection lost'));

    const result = await buildAgentContext('user-1', 'strategy');

    expect(result).toBe('');
  });
});

// ════════════════════════════════════════════════════════════════════
// writeAgentMemory
// ════════════════════════════════════════════════════════════════════
describe('writeAgentMemory', () => {
  it('calls db.brainNode.upsert with correct parameters', () => {
    mockBrainNodeUpsert.mockResolvedValue({});

    writeAgentMemory('user-1', 'strategy', 'How should I prioritize?', 'Focus on user value first.');

    expect(mockBrainNodeUpsert).toHaveBeenCalledTimes(1);
    const call = mockBrainNodeUpsert.mock.calls[0][0];
    expect(call.where.userId_type_title).toEqual({
      userId: 'user-1',
      type: 'agent_learning',
      title: 'How should I prioritize?',
    });
    expect(call.create.agentType).toBe('strategy');
    expect(call.create.source).toBe('agent');
    expect(call.create.content).toBe('Focus on user value first.');
  });

  it('truncates long messages and responses', () => {
    mockBrainNodeUpsert.mockResolvedValue({});
    const longMessage = 'A'.repeat(200);
    const longResponse = 'B'.repeat(3000);

    writeAgentMemory('user-1', 'strategy', longMessage, longResponse);

    const call = mockBrainNodeUpsert.mock.calls[0][0];
    // Title truncated to 120 chars (117 + '...')
    expect(call.where.userId_type_title.title).toHaveLength(120);
    expect(call.where.userId_type_title.title.endsWith('...')).toBe(true);
    // Summary truncated to 300 chars (297 + '...')
    expect(call.create.summary).toHaveLength(300);
    // Content truncated to 2000 chars
    expect(call.create.content).toHaveLength(2000);
  });

  it('does not throw on DB error', () => {
    mockBrainNodeUpsert.mockRejectedValue(new Error('DB error'));

    // writeAgentMemory is fire-and-forget (void return, .catch internally)
    expect(() => {
      writeAgentMemory('user-1', 'strategy', 'msg', 'resp');
    }).not.toThrow();
  });
});

// ════════════════════════════════════════════════════════════════════
// writeInsight
// ════════════════════════════════════════════════════════════════════
describe('writeInsight', () => {
  const basePayload = {
    userId: 'user-1',
    agentType: 'strategy',
    title: 'Portfolio drift detected',
    content: 'Your portfolio is drifting from goals.',
  };

  it('skips duplicate within 24 hours', async () => {
    mockProactiveInsightFindFirst.mockResolvedValue({ id: 'existing-id' });

    await writeInsight(basePayload);

    expect(mockProactiveInsightFindFirst).toHaveBeenCalledTimes(1);
    // findFirst is called with createdAt gte filter for deduplication
    const findCall = mockProactiveInsightFindFirst.mock.calls[0][0];
    expect(findCall.where.userId).toBe('user-1');
    expect(findCall.where.title).toBe('Portfolio drift detected');
    expect(findCall.where.createdAt.gte).toBeInstanceOf(Date);

    // create should NOT be called because duplicate exists
    expect(mockProactiveInsightCreate).not.toHaveBeenCalled();
  });

  it('creates insight when no duplicate exists', async () => {
    mockProactiveInsightFindFirst.mockResolvedValue(null);
    mockProactiveInsightCreate.mockResolvedValue({});

    await writeInsight(basePayload);

    expect(mockProactiveInsightCreate).toHaveBeenCalledTimes(1);
    const createCall = mockProactiveInsightCreate.mock.calls[0][0];
    expect(createCall.data.userId).toBe('user-1');
    expect(createCall.data.agentType).toBe('strategy');
    expect(createCall.data.title).toBe('Portfolio drift detected');
    expect(createCall.data.priority).toBe('medium'); // default
    expect(createCall.data.metadata).toBe('{}'); // JSON.stringify of default
  });

  it('never throws on DB error', async () => {
    mockProactiveInsightFindFirst.mockRejectedValue(new Error('DB down'));

    // Should not throw — errors are caught internally
    await expect(writeInsight(basePayload)).resolves.toBeUndefined();
  });
});
