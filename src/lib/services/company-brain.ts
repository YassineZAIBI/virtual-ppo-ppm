import { db } from '@/lib/db';

const SOURCE_NAME = 'company-brain';

interface IdentityData {
  companyName?: string;
  industry?: string;
  website?: string;
  description?: string;
}

/**
 * Build a structured text document from all vision data in the DB.
 * Returns the content string (empty if no data found).
 */
async function buildContent(userId: string, identityData?: IdentityData): Promise<string> {
  const [northStar, businessGoals, targetGroups, needs, productMappings, competitors] = await Promise.all([
    db.northStar.findUnique({ where: { userId } }),
    db.businessGoal.findMany({ where: { userId }, orderBy: { priority: 'desc' } }),
    db.targetGroup.findMany({ where: { userId } }),
    db.need.findMany({ where: { userId } }),
    db.productMapping.findMany({ where: { userId } }),
    db.competitor.findMany({ where: { userId } }),
  ]);

  const sections: string[] = [];

  // Identity (only available when passed from onboarding)
  if (identityData?.companyName || identityData?.industry || identityData?.description) {
    const lines: string[] = ['# Company Profile'];
    if (identityData.companyName) lines.push(`Company: ${identityData.companyName}`);
    if (identityData.industry) lines.push(`Industry: ${identityData.industry}`);
    if (identityData.website) lines.push(`Website: ${identityData.website}`);
    if (identityData.description) lines.push(`Description: ${identityData.description}`);
    sections.push(lines.join('\n'));
  }

  if (northStar) {
    const lines = ['# North Star Vision'];
    lines.push(`Statement: ${northStar.statement}`);
    if (northStar.context) lines.push(`Context: ${northStar.context}`);
    sections.push(lines.join('\n'));
  }

  if (businessGoals.length > 0) {
    const lines = ['# Business Goals'];
    for (const g of businessGoals) {
      let line = `- ${g.title}`;
      if (g.description) line += ` — ${g.description}`;
      if (g.metric) line += ` (Metric: ${g.metric}`;
      if (g.target) line += `, Target: ${g.target}`;
      if (g.metric) line += ')';
      lines.push(line);
    }
    sections.push(lines.join('\n'));
  }

  if (targetGroups.length > 0) {
    const lines = ['# Target Groups'];
    for (const tg of targetGroups) {
      lines.push(`## ${tg.name}`);
      if (tg.role) lines.push(`Role: ${tg.role}`);
      if (tg.goals) lines.push(`Goals: ${tg.goals}`);
      if (tg.painPoints) lines.push(`Pain Points: ${tg.painPoints}`);
      if (tg.demographics) lines.push(`Demographics: ${tg.demographics}`);
      if (tg.behaviors) lines.push(`Behaviors: ${tg.behaviors}`);
    }
    sections.push(lines.join('\n'));
  }

  if (needs.length > 0) {
    const lines = ['# User Needs'];
    const tgMap = new Map(targetGroups.map((tg) => [tg.id, tg.name]));
    for (const n of needs) {
      const group = tgMap.get(n.targetGroupId) || 'Unknown';
      let line = `- [${group}] ${n.title}`;
      if (n.description) line += ` — ${n.description}`;
      line += ` (Severity: ${n.severity}/10)`;
      lines.push(line);
    }
    sections.push(lines.join('\n'));
  }

  if (productMappings.length > 0) {
    const lines = ['# Products & Solutions'];
    for (const pm of productMappings) {
      lines.push(`- ${pm.name} (${pm.type})`);
    }
    sections.push(lines.join('\n'));
  }

  if (competitors.length > 0) {
    const lines = ['# Competitors'];
    for (const c of competitors) {
      let line = `- ${c.name}`;
      if (c.website) line += ` (${c.website})`;
      if (c.description) line += ` — ${c.description}`;
      // tags is stored as JSON string
      try {
        const tags = typeof c.tags === 'string' ? JSON.parse(c.tags) : c.tags;
        if (Array.isArray(tags) && tags.length > 0) line += ` [${tags.join(', ')}]`;
      } catch { /* ignore parse errors */ }
      lines.push(line);
    }
    sections.push(lines.join('\n'));
  }

  return sections.join('\n\n');
}

/**
 * Persist the company-brain document (upsert).
 */
export async function saveCompanyBrain(userId: string, identityData?: IdentityData): Promise<void> {
  const content = await buildContent(userId, identityData);
  if (!content.trim()) return;

  const existing = await db.knowledgeDocument.findFirst({
    where: { userId, sourceName: SOURCE_NAME },
  });

  const data = {
    userId,
    sourceType: 'system',
    sourceName: SOURCE_NAME,
    content,
    contentChunks: JSON.stringify([content]),
    fileType: 'md',
    metadata: JSON.stringify({
      generatedAt: new Date().toISOString(),
      ...(identityData ? { identityData } : {}),
    }),
  };

  if (existing) {
    await db.knowledgeDocument.update({ where: { id: existing.id }, data });
  } else {
    await db.knowledgeDocument.create({ data });
  }
}

/**
 * Load the company-brain content for a user.
 * If no saved document exists, builds one on-the-fly from DB data and persists it.
 */
export async function loadCompanyBrain(userId: string): Promise<string> {
  // Try loading existing document first
  const doc = await db.knowledgeDocument.findFirst({
    where: { userId, sourceName: SOURCE_NAME },
    select: { content: true },
  });

  if (doc?.content) return doc.content;

  // No saved brain yet — build from current DB data and persist for next time
  const content = await buildContent(userId);
  if (content.trim()) {
    await db.knowledgeDocument.create({
      data: {
        userId,
        sourceType: 'system',
        sourceName: SOURCE_NAME,
        content,
        contentChunks: JSON.stringify([content]),
        fileType: 'md',
        metadata: JSON.stringify({ generatedAt: new Date().toISOString() }),
      },
    });
  }

  return content;
}
