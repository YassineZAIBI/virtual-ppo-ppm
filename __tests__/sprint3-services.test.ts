import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ──────────────────────────────────────────────────────────
vi.mock('next-auth', () => ({ getServerSession: vi.fn() }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));

const mockCompetitorFeedFindMany = vi.fn();
const mockUserAlertCreate = vi.fn();
const mockAlignmentScoreFindFirst = vi.fn();
const mockInitiativeFindMany = vi.fn();
const mockProactiveInsightFindFirst = vi.fn();
const mockProactiveInsightCreate = vi.fn();

vi.mock('@/lib/db', () => ({
  db: {
    competitorFeed: {
      findMany: (...args: unknown[]) => mockCompetitorFeedFindMany(...args),
    },
    userAlert: {
      create: (...args: unknown[]) => mockUserAlertCreate(...args),
    },
    alignmentScore: {
      findFirst: (...args: unknown[]) => mockAlignmentScoreFindFirst(...args),
    },
    initiative: {
      findMany: (...args: unknown[]) => mockInitiativeFindMany(...args),
    },
    proactiveInsight: {
      findFirst: (...args: unknown[]) => mockProactiveInsightFindFirst(...args),
      create: (...args: unknown[]) => mockProactiveInsightCreate(...args),
    },
  },
}));

// ── Imports (after mocks) ──────────────────────────────────────────
import { processCompetitorFeed, scoreFeedItem } from '@/lib/services/competitor-scorer';
import { processDriftDetection } from '@/lib/services/drift-detector';

// ── Helpers ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  // writeInsight calls findFirst then create — default to no duplicate
  mockProactiveInsightFindFirst.mockResolvedValue(null);
  mockProactiveInsightCreate.mockResolvedValue({});
  mockUserAlertCreate.mockResolvedValue({});
});

// ════════════════════════════════════════════════════════════════════
// processCompetitorFeed
// ════════════════════════════════════════════════════════════════════
describe('processCompetitorFeed', () => {
  it('returns {processed:0, escalated:0} when no feed items', async () => {
    mockCompetitorFeedFindMany.mockResolvedValue([]);

    const result = await processCompetitorFeed('user-1');

    expect(result).toEqual({ processed: 0, escalated: 0 });
    expect(mockUserAlertCreate).not.toHaveBeenCalled();
  });

  it('scores feed items correctly via scoreFeedItem', () => {
    const pricingItem = scoreFeedItem({
      id: 'f1',
      type: 'pricing_change',
      title: 'Competitor raised prices',
      content: 'Details...',
      competitorId: 'c1',
      competitor: { name: 'Rival Inc' },
    });
    expect(pricingItem.score).toBe(5);
    expect(pricingItem.shouldEscalate).toBe(true);
    expect(pricingItem.competitorName).toBe('Rival Inc');

    const blogItem = scoreFeedItem({
      id: 'f2',
      type: 'blog_post',
      title: 'Blog post',
      content: 'Content',
      competitorId: 'c2',
      competitor: { name: 'Other Co' },
    });
    expect(blogItem.score).toBe(1);
    expect(blogItem.shouldEscalate).toBe(false);

    // Unknown type defaults to score 2
    const unknownItem = scoreFeedItem({
      id: 'f3',
      type: 'unknown_type',
      title: 'Something',
      content: 'Content',
      competitorId: 'c3',
    });
    expect(unknownItem.score).toBe(2);
    expect(unknownItem.competitorName).toBe('Unknown competitor');
  });

  it('creates UserAlert for feed items with score >= 4', async () => {
    mockCompetitorFeedFindMany.mockResolvedValue([
      {
        id: 'feed-1',
        type: 'pricing_change', // score 5
        title: 'Price hike announced',
        summary: 'They raised prices by 30%',
        competitorId: 'comp-1',
        competitor: { id: 'comp-1', name: 'Rival Inc' },
        createdAt: new Date(),
      },
      {
        id: 'feed-2',
        type: 'blog_post', // score 1
        title: 'Blog update',
        summary: 'Weekly digest',
        competitorId: 'comp-2',
        competitor: { id: 'comp-2', name: 'Other Co' },
        createdAt: new Date(),
      },
    ]);

    const result = await processCompetitorFeed('user-1');

    expect(result).toEqual({ processed: 2, escalated: 1 });
    // UserAlert created only for the pricing_change (score 5)
    expect(mockUserAlertCreate).toHaveBeenCalledTimes(1);
    const alertData = mockUserAlertCreate.mock.calls[0][0].data;
    expect(alertData.userId).toBe('user-1');
    expect(alertData.type).toBe('competitor_move');
    expect(alertData.severity).toBe('high'); // score 5 >= 5 → 'high'
    expect(alertData.title).toContain('Rival Inc');
  });

  it('creates new_feature alert with medium severity (score 4)', async () => {
    mockCompetitorFeedFindMany.mockResolvedValue([
      {
        id: 'feed-3',
        type: 'new_feature', // score 4
        title: 'New dashboard released',
        summary: 'A new analytics dashboard',
        competitorId: 'comp-1',
        competitor: { id: 'comp-1', name: 'Rival Inc' },
        createdAt: new Date(),
      },
    ]);

    const result = await processCompetitorFeed('user-1');

    expect(result).toEqual({ processed: 1, escalated: 1 });
    const alertData = mockUserAlertCreate.mock.calls[0][0].data;
    expect(alertData.severity).toBe('medium'); // score 4 < 5 → 'medium'
  });
});

// ════════════════════════════════════════════════════════════════════
// processDriftDetection
// ════════════════════════════════════════════════════════════════════
describe('processDriftDetection', () => {
  it('does not create insight when alignment score >= 65', async () => {
    mockAlignmentScoreFindFirst.mockResolvedValue({ overallScore: 80, createdAt: new Date() });
    mockInitiativeFindMany.mockResolvedValue([]);

    await processDriftDetection('user-1');

    // No drift → no insight written, no alert created
    expect(mockProactiveInsightCreate).not.toHaveBeenCalled();
    expect(mockUserAlertCreate).not.toHaveBeenCalled();
  });

  it('creates medium-priority insight when score < 65 but >= 50', async () => {
    mockAlignmentScoreFindFirst.mockResolvedValue({ overallScore: 55, createdAt: new Date() });
    mockInitiativeFindMany.mockResolvedValue([]);

    await processDriftDetection('user-1');

    // writeInsight was called → proactiveInsight.create should fire
    expect(mockProactiveInsightCreate).toHaveBeenCalledTimes(1);
    const insightData = mockProactiveInsightCreate.mock.calls[0][0].data;
    expect(insightData.agentType).toBe('strategy');
    expect(insightData.priority).toBe('medium');
    expect(insightData.title).toContain('55');
    expect(insightData.title).toContain('VAS');

    // UserAlert also created
    expect(mockUserAlertCreate).toHaveBeenCalledTimes(1);
    const alertData = mockUserAlertCreate.mock.calls[0][0].data;
    expect(alertData.type).toBe('alignment_drift');
    expect(alertData.severity).toBe('medium');
  });

  it('creates high-priority insight when score < 50', async () => {
    mockAlignmentScoreFindFirst.mockResolvedValue({ overallScore: 35, createdAt: new Date() });
    mockInitiativeFindMany.mockResolvedValue([]);

    await processDriftDetection('user-1');

    expect(mockProactiveInsightCreate).toHaveBeenCalledTimes(1);
    const insightData = mockProactiveInsightCreate.mock.calls[0][0].data;
    expect(insightData.priority).toBe('high');
    expect(insightData.title).toContain('35');

    const alertData = mockUserAlertCreate.mock.calls[0][0].data;
    expect(alertData.severity).toBe('high');
    expect(alertData.message).toContain('35');
  });

  it('does not create insight when score is 0 (no alignment data)', async () => {
    // No alignment score found → overallScore defaults to 0
    // hasDrift = currentScore < 65 && currentScore > 0 → 0 > 0 is false → no drift
    mockAlignmentScoreFindFirst.mockResolvedValue(null);
    mockInitiativeFindMany.mockResolvedValue([]);

    await processDriftDetection('user-1');

    expect(mockProactiveInsightCreate).not.toHaveBeenCalled();
    expect(mockUserAlertCreate).not.toHaveBeenCalled();
  });
});
