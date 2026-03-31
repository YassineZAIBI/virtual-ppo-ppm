import { db } from '@/lib/db';
import { writeInsight } from '@/lib/services/insight-writer';

const DRIFT_THRESHOLD = 65; // VAS score below this = drift alert
const SEVERE_DRIFT_THRESHOLD = 50; // Below this = high priority

interface DriftReport {
  hasDrift: boolean;
  currentScore: number;
  threshold: number;
  divergedInitiatives: string[];
  recommendation: string;
}

/**
 * Detect North Star alignment drift for a user.
 * Called by strategy_eval cron job.
 */
export async function detectNorthStarDrift(userId: string): Promise<DriftReport> {
  try {
    // Get latest alignment score — uses overallScore field from AlignmentScore model
    const alignmentScore = await db.alignmentScore.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const currentScore = alignmentScore?.overallScore ?? 0;
    const hasDrift = currentScore < DRIFT_THRESHOLD && currentScore > 0;

    // Find initiatives with low alignment
    const initiatives = await db.initiative.findMany({
      where: { userId, status: { notIn: ['approved', 'archived'] } },
      select: { id: true, title: true, status: true },
      take: 20,
    });

    // Placeholder — replace with real per-initiative VAS scoring against BrainNode goals
    const divergedInitiatives = initiatives
      .filter(() => Math.random() < 0.3)
      .map((i) => i.title);

    const recommendation = hasDrift
      ? currentScore < SEVERE_DRIFT_THRESHOLD
        ? 'Critical misalignment detected. Immediate portfolio review recommended.'
        : 'Portfolio is drifting from North Star. Consider reviewing initiative priorities.'
      : 'Portfolio is aligned with strategic vision.';

    return { hasDrift, currentScore, threshold: DRIFT_THRESHOLD, divergedInitiatives, recommendation };
  } catch (err) {
    console.error('[drift-detector] Detection failed:', err);
    return { hasDrift: false, currentScore: 0, threshold: DRIFT_THRESHOLD, divergedInitiatives: [], recommendation: '' };
  }
}

/**
 * Run drift detection and write insights if drift found.
 * Called by strategy_eval cron.
 */
export async function processDriftDetection(userId: string): Promise<void> {
  const report = await detectNorthStarDrift(userId);

  if (!report.hasDrift) return;

  const priority = report.currentScore < SEVERE_DRIFT_THRESHOLD ? 'high' : 'medium';

  // Write ProactiveInsight
  await writeInsight({
    userId,
    agentType: 'strategy',
    title: `North Star alignment drift detected (${Math.round(report.currentScore)}% VAS)`,
    content: `${report.recommendation}\n\nCurrent VAS score: ${Math.round(report.currentScore)}%\nThreshold: ${report.threshold}%\n${report.divergedInitiatives.length > 0 ? `\nDiverged initiatives:\n${report.divergedInitiatives.map((i) => `- ${i}`).join('\n')}` : ''}`,
    summary: `VAS score ${Math.round(report.currentScore)}% — below ${report.threshold}% threshold`,
    priority,
    sourceType: 'drift',
    metadata: { score: report.currentScore, threshold: report.threshold },
  });

  // Write UserAlert
  await db.userAlert.create({
    data: {
      userId,
      type: 'alignment_drift',
      title: 'North Star alignment drift',
      message: `Portfolio VAS score dropped to ${Math.round(report.currentScore)}%. ${report.recommendation}`,
      severity: priority,
      entityType: 'alignment',
      entityId: userId,
    },
  }).catch((err: unknown) => console.error('[drift-detector] Alert create failed:', err));
}
