import { db } from '@/lib/db';
import { buildAgentContext } from '@/lib/services/agent-context';
import { writeInsight } from '@/lib/services/insight-writer';
import { getWorkflow } from '@/lib/services/workflow-definitions';
import { LLMService } from '@/lib/services/llm';
import type { AgentMessageData, LLMConfig } from '@/lib/types';

interface WorkflowContext {
  userId: string;
  workflowType: string;
  initiativeId?: string;
  initialContext: string;
  llmConfig: Record<string, unknown>;
  autonomyLevel: string;
}

interface WorkflowResult {
  workflowId: string;
  workflowType: string;
  status: 'completed' | 'failed' | 'paused';
  steps: StepResult[];
  finalOutput: Record<string, unknown>;
  pendingActionId?: string;
}

interface StepResult {
  stepIndex: number;
  agent: string;
  messageType: string;
  status: 'completed' | 'failed';
  output: Record<string, unknown>;
  agentMessageId: string;
}

/**
 * Run a multi-agent workflow end to end.
 * Respects autonomy level gating at each step.
 * Returns full workflow result with all step outputs.
 */
export async function runWorkflow(ctx: WorkflowContext): Promise<WorkflowResult> {
  const workflow = getWorkflow(ctx.workflowType);
  if (!workflow) {
    throw new Error(`Unknown workflow type: ${ctx.workflowType}`);
  }

  const workflowId = `wf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const companyContext = await buildAgentContext(ctx.userId, 'orchestrator');
  const accumulatedOutputs: Record<string, unknown> = {};
  const stepResults: StepResult[] = [];

  // Check autonomy gating before running write workflows
  if (ctx.autonomyLevel === 'manual') {
    return {
      workflowId,
      workflowType: ctx.workflowType,
      status: 'paused',
      steps: [],
      finalOutput: { blocked: true, reason: 'Manual autonomy mode — workflows require Oversight or Full autonomy' },
    };
  }

  // In Oversight mode, create PendingAction before running
  if (ctx.autonomyLevel === 'oversight') {
    const pendingAction = await db.pendingAction.create({
      data: {
        userId: ctx.userId,
        agentId: 'orchestrator',
        toolName: `workflow:${ctx.workflowType}`,
        toolArguments: JSON.stringify({ initiativeId: ctx.initiativeId, initialContext: ctx.initialContext.slice(0, 200) }),
        description: `Run ${workflow.name} workflow${ctx.initiativeId ? ` for initiative ${ctx.initiativeId}` : ''}`,
        status: 'pending',
      },
    }).catch(() => null);

    if (pendingAction) {
      return {
        workflowId,
        workflowType: ctx.workflowType,
        status: 'paused',
        steps: [],
        finalOutput: { queued: true, reason: 'Workflow queued for approval' },
        pendingActionId: pendingAction.id,
      };
    }
  }

  // Run each step in sequence
  for (let i = 0; i < workflow.steps.length; i++) {
    const step = workflow.steps[i];

    // Build prompt by substituting template variables
    let prompt = step.promptTemplate
      .replace('{initiative_context}', ctx.initialContext)
      .replace('{threat_context}', ctx.initialContext)
      .replace('{company_context}', companyContext);

    // Inject outputs from previous steps
    for (const [key, value] of Object.entries(accumulatedOutputs)) {
      prompt = prompt.replace(
        `{${key}}`,
        typeof value === 'string' ? value : JSON.stringify(value, null, 2)
      );
    }

    // Create AgentMessage record for this step
    const agentMessage = await db.agentMessage.create({
      data: {
        userId: ctx.userId,
        workflowId,
        workflowType: ctx.workflowType,
        stepIndex: i,
        fromAgent: i === 0 ? 'orchestrator' : workflow.steps[i - 1].agent,
        toAgent: step.agent,
        messageType: step.messageType,
        payload: JSON.stringify({ prompt: prompt.slice(0, 500) }),
        status: 'processing',
        initiativeId: ctx.initiativeId ?? '',
        metadata: JSON.stringify({ stepName: step.outputKey }),
      },
    });

    try {
      // Call the LLM for this agent step
      const llm = LLMService.create(ctx.llmConfig as unknown as LLMConfig);
      const response = await llm.chat([
        {
          role: 'system',
          content: `You are the ${step.agent} agent in Azmyra. You are step ${i + 1} of ${workflow.steps.length} in the ${workflow.name} workflow. Always respond with valid JSON only — no markdown, no explanation outside the JSON.`,
        },
        { role: 'user', content: prompt },
      ]);

      // Parse the JSON output
      let parsedOutput: Record<string, unknown> = {};
      try {
        const cleaned = response.replace(/```json\n?|\n?```/g, '').trim();
        parsedOutput = JSON.parse(cleaned);
      } catch {
        parsedOutput = { rawOutput: response, parseError: true };
      }

      // Store output for next step
      accumulatedOutputs[step.outputKey] = parsedOutput;

      // Update AgentMessage as completed
      await db.agentMessage.update({
        where: { id: agentMessage.id },
        data: {
          status: 'completed',
          payload: JSON.stringify(parsedOutput),
          processedAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Write BrainNode for significant agent findings
      if (step.messageType === 'finding' || step.messageType === 'assessment') {
        await db.brainNode.upsert({
          where: {
            userId_type_title: {
              userId: ctx.userId,
              type: step.messageType === 'finding' ? 'decision' : 'risk',
              title: `[${workflow.name}] ${step.agent} — step ${i + 1}`,
            },
          },
          create: {
            userId: ctx.userId,
            type: step.messageType === 'finding' ? 'decision' : 'risk',
            title: `[${workflow.name}] ${step.agent} — step ${i + 1}`,
            content: JSON.stringify(parsedOutput),
            summary: `${step.agent} ${step.messageType} from ${workflow.name} workflow`,
            source: 'agent',
            agentType: step.agent,
            confidence: 0.9,
            metadata: JSON.stringify({ workflowId, workflowType: ctx.workflowType }),
          },
          update: {
            content: JSON.stringify(parsedOutput),
            updatedAt: new Date(),
          },
        }).catch(() => {});
      }

      stepResults.push({
        stepIndex: i,
        agent: step.agent,
        messageType: step.messageType,
        status: 'completed',
        output: parsedOutput,
        agentMessageId: agentMessage.id,
      });
    } catch (err) {
      // Step failed — mark as failed and stop workflow
      await db.agentMessage.update({
        where: { id: agentMessage.id },
        data: {
          status: 'failed',
          errorMessage: String(err).slice(0, 500),
          processedAt: new Date(),
        },
      });

      stepResults.push({
        stepIndex: i,
        agent: step.agent,
        messageType: step.messageType,
        status: 'failed',
        output: { error: String(err) },
        agentMessageId: agentMessage.id,
      });

      return {
        workflowId,
        workflowType: ctx.workflowType,
        status: 'failed',
        steps: stepResults,
        finalOutput: { error: `Workflow failed at step ${i + 1} (${step.agent})`, details: String(err) },
      };
    }
  }

  // Write a ProactiveInsight summarizing the completed workflow
  const lastStep = stepResults[stepResults.length - 1];
  await writeInsight({
    userId: ctx.userId,
    agentType: 'orchestrator',
    title: `${workflow.name} completed`,
    content: `Workflow ran ${workflow.steps.length} agents in sequence. Final output from ${lastStep.agent}: ${JSON.stringify(lastStep.output).slice(0, 300)}`,
    summary: `${workflow.steps.map((s) => s.agent).join(' → ')} workflow completed`,
    priority: 'medium',
    sourceType: 'strategy',
    metadata: { workflowId, workflowType: ctx.workflowType, stepCount: workflow.steps.length },
  });

  return {
    workflowId,
    workflowType: ctx.workflowType,
    status: 'completed',
    steps: stepResults,
    finalOutput: accumulatedOutputs,
  };
}

/**
 * Get the full workflow history for a user.
 */
export async function getWorkflowHistory(
  userId: string,
  limit = 10
): Promise<Record<string, AgentMessageData[]>> {
  const messages = await db.agentMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit * 4,
  });

  // Group by workflowId
  const grouped: Record<string, typeof messages> = {};
  for (const msg of messages) {
    if (!msg.workflowId) continue;
    if (!grouped[msg.workflowId]) grouped[msg.workflowId] = [];
    grouped[msg.workflowId].push(msg);
  }

  return grouped as Record<string, AgentMessageData[]>;
}
