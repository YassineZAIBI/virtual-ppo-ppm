# SPRINT_PERSONA.md — Rich Target Group Personas + Vision Preview
# Depends on: SPRINT_BUGFIX complete
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first
# 2. In Claude Code:
#    "Read SPRINT_PERSONA.md and execute every step in order.
#     Stop for: schema diffs, new view creation.
#     After all steps: run npx tsc --noEmit and show full report."
# 3. Run SANITY_CHECK.md after

---

## Issues addressed

1. Target group personas are too basic — need Jobs-to-be-Done, empathy map,
   behavioral patterns, day-in-life context
2. Vision Board AI generation needs preview step before creating everything

---

## Research-backed persona framework

The richest PM persona frameworks combine three layers:
  Layer 1 — Identity: who they are (role, seniority, company context)
  Layer 2 — JTBD: "When [situation], I want to [motivation], so I can [outcome]"
  Layer 3 — Empathy map: what they Think, Say, Feel, Do
  Layer 4 — Behavioral: triggers, decision drivers, current workarounds, churn risk

This is what Azmyra's AI will now generate for each persona.

---

## Pre-flight

Read before starting:
1. prisma/schema.prisma — TargetGroup model, ALL fields
2. src/app/api/vision/target-groups/route.ts — current structure
3. src/components/vision/TargetGroupCard.tsx — current display
4. src/components/vision/VisionBoardView.tsx — vision generation flow
5. src/app/api/vision/extract/route.ts — AI extraction entry point

---

## Step 1 — Expand TargetGroup schema for rich personas

STOP: Show schema diff and wait for confirmation before db push.

Add these fields to TargetGroup model (all as String JSON strings with defaults):

```prisma
// JTBD Layer
jtbdStatement    String @default("")
// "When [situation], I want to [motivation], so I can [outcome]"
jtbdFunctional   String @default("[]")  // functional jobs JSON array
jtbdEmotional    String @default("[]")  // emotional jobs JSON array
jtbdSocial       String @default("[]")  // social jobs JSON array

// Empathy Map Layer
empathyThinks    String @default("[]")  // what they think (silent thoughts)
empathySays      String @default("[]")  // what they say out loud
empathyFeels     String @default("[]")  // emotional state
empathyDoes      String @default("[]")  // observable behaviors

// Behavioral Layer
triggers         String @default("[]")  // what makes them start looking
decisionDrivers  String @default("[]")  // what makes them choose a tool
currentWorkarounds String @default("[]") // what they do today (pre-Azmyra)
churnRisks       String @default("[]")  // what would make them leave
successMetrics   String @default("[]")  // how they measure their own success
preferredChannels String @default("[]") // Slack, email, dashboard, etc.

// Context Layer
companyStage     String @default("")    // startup, scale-up, enterprise
teamSize         String @default("")    // solo, small, large
industryContext  String @default("")
dayInLife        String @default("")    // prose paragraph describing typical day
typicalQuote     String @default("")    // a real-sounding quote from this persona

// Metadata
source           String @default("manual") // already added in SPRINT_BUGFIX
confidence       Float  @default(0.8)
lastEnrichedAt   DateTime?
```

After confirmation:
  npx prisma generate && npx prisma db push

Add all new field types to src/lib/types.ts:
```typescript
export interface TargetGroupPersona {
  // JTBD
  jtbdStatement: string;
  jtbdFunctional: string[];
  jtbdEmotional: string[];
  jtbdSocial: string[];
  // Empathy
  empathyThinks: string[];
  empathySays: string[];
  empathyFeels: string[];
  empathyDoes: string[];
  // Behavioral
  triggers: string[];
  decisionDrivers: string[];
  currentWorkarounds: string[];
  churnRisks: string[];
  successMetrics: string[];
  preferredChannels: string[];
  // Context
  companyStage: string;
  teamSize: string;
  industryContext: string;
  dayInLife: string;
  typicalQuote: string;
}
```

---

## Step 2 — AI persona enrichment service

Create src/lib/services/persona-enricher.ts

```typescript
import { LLMService } from '@/lib/services/llm';

const PERSONA_PROMPT = `You are a senior product researcher generating a rich, actionable user persona.
Given the target group information, generate a complete persona using the Jobs-to-be-Done framework,
empathy mapping, and behavioral analysis.

Target Group:
Name: {name}
Role: {role}
Description: {description}
Company North Star: {northStar}
Industry: {industry}

Return ONLY valid JSON with this exact structure:
{
  "jtbdStatement": "When [specific situation], I want to [specific motivation], so I can [specific outcome]",
  "jtbdFunctional": ["functional job 1", "functional job 2", "functional job 3"],
  "jtbdEmotional": ["emotional job 1", "emotional job 2"],
  "jtbdSocial": ["social job 1"],
  "empathyThinks": ["silent thought 1", "silent thought 2", "silent thought 3"],
  "empathySays": ["thing they say aloud 1", "thing they say aloud 2"],
  "empathyFeels": ["frustration 1", "aspiration 1", "anxiety 1"],
  "empathyDoes": ["observable behavior 1", "behavior 2", "behavior 3"],
  "triggers": ["what causes them to start looking for a solution like this"],
  "decisionDrivers": ["what makes them choose one tool over another"],
  "currentWorkarounds": ["what they currently do to solve this problem"],
  "churnRisks": ["what would make them stop using the product"],
  "successMetrics": ["how they measure their own success"],
  "preferredChannels": ["Slack", "Email", "Dashboard"],
  "companyStage": "scale-up",
  "teamSize": "10-50 people",
  "industryContext": "B2B SaaS",
  "dayInLife": "A 2-3 sentence vivid description of their typical day and the context in which they experience the problems this product solves.",
  "typicalQuote": "A realistic quote this person would say about their work situation."
}`;

export async function enrichPersona(
  group: { name: string; role: string; description: string },
  context: { northStar: string; industry: string },
  llmConfig: Record<string, unknown>
): Promise<Partial<import('@/lib/types').TargetGroupPersona>> {
  try {
    const prompt = PERSONA_PROMPT
      .replace('{name}', group.name)
      .replace('{role}', group.role || '')
      .replace('{description}', group.description || '')
      .replace('{northStar}', context.northStar || '')
      .replace('{industry}', context.industry || '');

    const llm = LLMService.create(llmConfig as Parameters<typeof LLMService.create>[0]);
    const response = await llm.complete([
      { role: 'system', content: 'You are a senior product researcher. Return only valid JSON.' },
      { role: 'user', content: prompt },
    ]);

    const clean = response.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('[persona-enricher] Failed to enrich persona:', err);
    return {};
  }
}
```

Files to create: src/lib/services/persona-enricher.ts

---

## Step 3 — Add persona enrichment API endpoint

Create src/app/api/vision/target-groups/[id]/enrich/route.ts

```typescript
// POST /api/vision/target-groups/[id]/enrich
// Generates rich persona data using AI and saves to TargetGroup
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { llmConfig } = await req.json();

  const group = await db.targetGroup.findFirst({
    where: { id: params.id, userId: session.user.id },
  });
  if (!group) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Get company context
  const northStarNode = await db.brainNode.findFirst({
    where: { userId: session.user.id, type: 'vision' },
    select: { content: true },
  });

  const enriched = await enrichPersona(
    { name: group.name, role: group.role || '', description: group.description || '' },
    { northStar: northStarNode?.content || '', industry: '' },
    llmConfig
  );

  // Convert arrays to JSON strings for storage
  const updateData: Record<string, string | number | Date> = { lastEnrichedAt: new Date() };
  for (const [key, value] of Object.entries(enriched)) {
    updateData[key] = Array.isArray(value) ? JSON.stringify(value) : (value as string);
  }

  const updated = await db.targetGroup.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(updated);
}
```

---

## Step 4 — Redesign TargetGroupCard with rich persona display

Read current src/components/vision/TargetGroupCard.tsx.

Replace with a tabbed card layout:

```
┌─────────────────────────────────────┐
│ 👤 [Name] — [Role]                  │
│ [Company Stage] · [Team Size]       │
├─────────────────────────────────────┤
│ Overview │ JTBD │ Empathy │ Behavior│
├─────────────────────────────────────┤
│ OVERVIEW TAB:                       │
│ "Typical quote from this person"    │
│                                     │
│ Day in the life:                    │
│ [dayInLife prose paragraph]         │
│                                     │
│ [Enrich with AI] button             │
├─────────────────────────────────────┤
│ JTBD TAB:                           │
│ Job statement:                      │
│ "When [x], I want [y], so I can [z]"│
│                                     │
│ Functional jobs: • • •              │
│ Emotional jobs:  • •                │
│ Social jobs:     •                  │
├─────────────────────────────────────┤
│ EMPATHY TAB:                        │
│ Thinks: • • •                       │
│ Says:   • •                         │
│ Feels:  • • •                       │
│ Does:   • • •                       │
├─────────────────────────────────────┤
│ BEHAVIOR TAB:                       │
│ Triggers: • •                       │
│ Decision drivers: • •               │
│ Current workarounds: • •            │
│ Churn risks: • •                    │
│ Success metrics: • •                │
└─────────────────────────────────────┘
```

Show enrichment state:
  - If not enriched: show "Basic profile" badge + "Enrich with AI →" button
  - If enriched: show "Full persona" badge + lastEnrichedAt date
  - If enriching: show loading spinner with "Generating rich persona..."

"Enrich with AI" button:
  - Calls POST /api/vision/target-groups/[id]/enrich
  - Passes llmConfig from Zustand store
  - Shows loading state during enrichment
  - Updates card in-place on completion
  - Toast: "Persona enriched — 4 dimensions generated"

Use Tabs from shadcn/ui.
All JSON.parse() calls must have try/catch with [] fallback.

Files to modify: src/components/vision/TargetGroupCard.tsx

---

## Step 5 — Vision Board AI preview before generation

This addresses the "generate → confirm → save" pattern.

Read src/components/vision/VisionBoardView.tsx and the AI generation flow.

### The new flow:

1. User clicks "Generate Vision with AI"
2. AI generates a PREVIEW (does NOT save to DB)
3. Modal opens showing the preview:
   - North Star statement
   - 3-5 Business Goals
   - 3-4 Target Groups (name + one-line description)
   - Key Needs
4. User can:
   - Edit any field inline before confirming
   - Click "Looks good — Generate Vision Board" → saves to DB
   - Click "Start over" → discards preview
5. After confirmation, saves everything and renders Vision Board

### Implementation:

Create src/app/api/vision/preview/route.ts:

```typescript
// POST /api/vision/preview
// Generates vision preview — does NOT write to DB
// Returns the preview data only
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { prompt, company, llmConfig } = await req.json();

  const llm = LLMService.create(llmConfig);
  const response = await llm.complete([
    {
      role: 'system',
      content: 'You are a senior product strategist generating a vision framework. Return only valid JSON.',
    },
    {
      role: 'user',
      content: `Generate a complete product vision framework for:
Company: ${company || prompt}

Return JSON with:
{
  "northStar": "One clear sentence describing the ultimate mission",
  "mission": "Why this company exists",
  "goals": [
    { "title": "Goal title", "description": "What success looks like", "metric": "How to measure it" }
  ],
  "targetGroups": [
    { "name": "Persona name", "role": "Job title", "description": "One-sentence description", "primaryNeed": "Main job to be done" }
  ],
  "coreNeeds": [
    { "title": "Need", "severity": "high|medium|low", "description": "Why this need matters" }
  ]
}
Return 3-5 goals, 3-4 target groups, 4-6 core needs.`,
    },
  ]);

  const clean = response.replace(/```json\n?|\n?```/g, '').trim();
  const preview = JSON.parse(clean);

  // Do NOT save — return preview only
  return NextResponse.json({ preview });
}
```

Create src/components/vision/VisionPreviewModal.tsx:

```
Modal layout:
  Title: "Your Vision Preview"
  Subtitle: "Review and edit before we build your Vision Board"

  Section 1: North Star
  [Editable textarea — pre-filled with AI suggestion]

  Section 2: Business Goals (collapsible list)
  [Each goal: editable title + description]
  [+ Add goal / - Remove goal]

  Section 3: Target Groups
  [Each group: editable name + description]
  [+ Add group / - Remove group]

  Section 4: Core Needs
  [Each need: editable title with severity badge]

  Footer:
  [← Start over]  [Generate Vision Board →]
```

The modal state is purely local (useState). Nothing touches the DB until
the user clicks "Generate Vision Board →" which calls the existing
vision save flow with the (possibly edited) preview data.

Files to create:
  src/app/api/vision/preview/route.ts
  src/components/vision/VisionPreviewModal.tsx

Files to modify:
  src/components/vision/VisionBoardView.tsx (wire up preview flow)

---

## Step 6 — TypeScript check and report

Run: npx tsc --noEmit

```
SPRINT PERSONA REPORT

SCHEMA CHANGES:
  TargetGroup — fields added: [list]

NEW SERVICES:
  persona-enricher.ts — enrichPersona() function

NEW API ROUTES:
  POST /api/vision/target-groups/[id]/enrich
  POST /api/vision/preview

COMPONENT CHANGES:
  TargetGroupCard — now shows 4 tabs: Overview, JTBD, Empathy, Behavior
  VisionBoardView — generate flow now shows preview modal before saving

NEW COMPONENTS:
  VisionPreviewModal

TYPESCRIPT: [0 new errors]

MANUAL TEST:
1. Open Vision > Target Groups
2. Click "Enrich with AI" on any group → 4 tabs populate
3. Click "Generate Vision with AI" → preview modal opens
4. Edit North Star → click "Generate Vision Board"
5. Vision board renders with edited content
```

---

## Commit

git add -A
git commit -m "feat: rich personas (JTBD + empathy map), vision preview before generation"
