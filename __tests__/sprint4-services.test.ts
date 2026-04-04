import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mocks — declared before imports
// ---------------------------------------------------------------------------

vi.mock('@/lib/db', () => {
  const mockDb = {
    pendingAction: {
      create: vi.fn().mockResolvedValue({ id: 'pa-1' }),
    },
    agentMessage: {
      create: vi.fn().mockResolvedValue({ id: 'am-1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    brainNode: {
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
  return { db: mockDb };
});

vi.mock('@/lib/services/agent-context', () => ({
  buildAgentContext: vi.fn().mockResolvedValue('mock company context'),
}));

vi.mock('@/lib/services/insight-writer', () => ({
  writeInsight: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/services/llm', () => {
  const mockChat = vi.fn().mockResolvedValue('{"result":"ok"}');
  return {
    LLMService: {
      create: vi.fn().mockReturnValue({ chat: mockChat }),
    },
    __mockChat: mockChat,
  };
});

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import { runWorkflow } from '@/lib/services/agent-orchestrator';
import { getWorkflow, WORKFLOW_DEFINITIONS } from '@/lib/services/workflow-definitions';
import { db } from '@/lib/db';
import { LLMService } from '@/lib/services/llm';

// ============================================================================
// runWorkflow
// ============================================================================

describe('runWorkflow', () => {
  const baseCtx = {
    userId: 'user-1',
    workflowType: 'initiative_deep_dive',
    initialContext: 'Test initiative context',
    llmConfig: { provider: 'openai', model: 'gpt-4o' },
    autonomyLevel: 'full',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns {status:"paused"} when autonomyLevel === "manual"', async () => {
    const result = await runWorkflow({ ...baseCtx, autonomyLevel: 'manual' });

    expect(result.status).toBe('paused');
    expect(result.steps).toEqual([]);
    expect(result.finalOutput).toHaveProperty('blocked', true);
    // Should not have called any DB writes or LLM
    expect(db.agentMessage.create).not.toHaveBeenCalled();
  });

  it('creates PendingAction when autonomyLevel === "oversight"', async () => {
    const result = await runWorkflow({ ...baseCtx, autonomyLevel: 'oversight' });

    expect(db.pendingAction.create).toHaveBeenCalledTimes(1);
    expect(db.pendingAction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          agentId: 'orchestrator',
          toolName: 'workflow:initiative_deep_dive',
          status: 'pending',
        }),
      })
    );
    expect(result.status).toBe('paused');
    expect(result.pendingActionId).toBe('pa-1');
    expect(result.finalOutput).toHaveProperty('queued', true);
  });

  it('returns {status:"failed"} when a step throws', async () => {
    // Make the LLM chat throw on the first call
    const mockChat = vi.fn().mockRejectedValue(new Error('LLM exploded'));
    (LLMService.create as ReturnType<typeof vi.fn>).mockReturnValue({ chat: mockChat });

    const result = await runWorkflow({ ...baseCtx, autonomyLevel: 'full' });

    expect(result.status).toBe('failed');
    expect(result.steps.length).toBeGreaterThanOrEqual(1);
    expect(result.steps[0].status).toBe('failed');
    expect(result.finalOutput).toHaveProperty('error');
    // AgentMessage should have been updated with failed status
    expect(db.agentMessage.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'failed' }),
      })
    );
  });
});

// ============================================================================
// Workflow definitions
// ============================================================================

describe('workflow-definitions', () => {
  it('getWorkflow returns null for unknown type', () => {
    const result = getWorkflow('nonexistent_workflow');
    expect(result).toBeNull();
  });

  it('initiative_deep_dive has 4 steps', () => {
    const workflow = getWorkflow('initiative_deep_dive');
    expect(workflow).not.toBeNull();
    expect(workflow!.steps).toHaveLength(4);
    // Verify step agents in expected order
    expect(workflow!.steps.map((s) => s.agent)).toEqual([
      'discovery',
      'risk',
      'strategy',
      'communications',
    ]);
  });

  it('market_threat_response has 3 steps', () => {
    const workflow = getWorkflow('market_threat_response');
    expect(workflow).not.toBeNull();
    expect(workflow!.steps).toHaveLength(3);
    expect(workflow!.steps.map((s) => s.agent)).toEqual([
      'risk',
      'advisor',
      'strategy',
    ]);
  });
});
