# SPRINT_ARCHITECTURE.md — Product Verticals + Portfolio Architecture
# Depends on: SPRINT_BUGFIX complete
#
# HOW TO USE:
# 1. Run SANITY_CHECK.md first
# 2. In Claude Code:
#    "Read SPRINT_ARCHITECTURE.md and execute every step in order.
#     Stop for ALL schema changes — show diff, wait for confirmation.
#     After all steps: run npx tsc --noEmit and show full report."
# 3. Run SANITY_CHECK.md after

---

## Issues addressed

1. Products generated in Vision not appearing in Portfolio by status
2. Need a macro layer above ideas/solutions: Product Verticals / Initiatives
3. External tool detection (Jira/Confluence) should auto-suggest and ask approval
4. User-configurable granularity: Vertical → Initiative → Idea/Solution/Product

---

## The new hierarchy model

Current (flat):
  Initiative (= idea/feature, single level)

New (3 levels, user-configurable):
  Level 1: ProductVertical (strategic grouping — "Mobile Experience", "Enterprise Platform")
  Level 2: Initiative (epic/project — maps to Jira Epic, Linear Project)
  Level 3: Idea / Solution / Product (the existing Initiative model, renamed scope)

The user configures their preferred granularity during onboarding or in Settings:
  "I work with [Product Verticals / Initiatives / Ideas]"
  → Sets which levels are visible and what they are called

---

## Pre-flight

Read before starting:
1. prisma/schema.prisma — Initiative model ALL fields
2. src/components/views/InitiativesPipeline.tsx — Kanban board
3. src/app/api/initiatives/ — all routes
4. src/app/api/vision/products/ — how Vision products are saved
5. src/lib/types.ts — Initiative types

---

## Step 1 — Add ProductVertical model

STOP: Show full schema diff and wait for confirmation.

Add to prisma/schema.prisma:

```prisma
model ProductVertical {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  name        String
  description String   @default("")
  strategy    String   @default("")    // strategic rationale
  color       String   @default("#6366F1") // for visual coding
  icon        String   @default("")    // lucide icon name
  status      String   @default("active")  // "active" | "paused" | "archived"
  sortOrder   Int      @default(0)

  // Links to vision layer
  productMappingId String @default("") // link to Vision ProductMapping

  // Children
  initiatives  Initiative[] // existing model — verticals contain initiatives

  // Brain graph
  brainNodeId  String @default("")

  metadata    String   @default("{}") // JSON string
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([userId])
  @@index([userId, status])
}
```

Also add to Initiative model (if not present):
  verticalId    String? // optional FK to ProductVertical
  vertical      ProductVertical? @relation(fields: [verticalId], references: [id])
  granularity   String @default("initiative")
  // "vertical" | "initiative" | "idea" — what level the user chose

Add to User model:
  productVerticals  ProductVertical[]

STOP: After user confirms, run:
  npx prisma generate && npx prisma db push

Add types to src/lib/types.ts:
  ProductVerticalData, VerticalStatus, GranularityLevel

---

## Step 2 — Fix Vision products → Portfolio sync

The root cause: Vision generates ProductMapping records but they are not
linked to Initiative records (the Portfolio model).

Read src/app/api/vision/products/route.ts — how products are saved.
Read src/app/api/initiatives/route.ts — how initiatives are created.

After a ProductMapping is saved, create a linked ProductVertical:

```typescript
// In vision/products route, after saving ProductMapping:
await db.productVertical.upsert({
  where: { 
    // Need @@unique([userId, name]) — add to schema
    userId_name: { userId: session.user.id, name: product.name }
  },
  create: {
    userId: session.user.id,
    name: product.name,
    description: product.description || '',
    strategy: product.rationale || '',
    productMappingId: savedProduct.id,
  },
  update: {
    description: product.description || '',
    updatedAt: new Date(),
  },
}).catch(console.error); // fire-and-forget
```

Also add @@unique([userId, name]) to ProductVertical schema.

Add PortfolioView / InitiativesPipeline filter for "View by Vertical":
  - Add a vertical selector at the top of the Kanban board
  - "All verticals" (default) shows all initiatives as today
  - Selecting a vertical filters to only show initiatives under that vertical

---

## Step 3 — Create ProductVerticals management view

Create src/app/verticals/page.tsx (server component + session guard)
Create src/components/views/ProductVerticalsView.tsx ('use client')

The view shows:
  - Grid of ProductVertical cards, each showing:
    - Name + description
    - Color swatch
    - Count of initiatives under it (linked + unlinked)
    - Link to filter Portfolio to this vertical
    - Status badge
  - "Create Vertical" button
  - "AI Suggest Verticals" button (generates 3-5 based on Vision ProductMappings)

"AI Suggest Verticals" flow:
  - Reads existing ProductMappings from Vision
  - Calls LLM: "Given these products/solutions, suggest 3-5 strategic verticals that group them"
  - Returns suggestions as cards the user can accept/reject/edit
  - Accepted suggestions create ProductVertical records

Add "Product Verticals" to sidebar navigation.

Files to create:
  src/app/verticals/page.tsx
  src/components/views/ProductVerticalsView.tsx
  src/app/api/verticals/route.ts (GET list + POST create)
  src/app/api/verticals/[id]/route.ts (PATCH + DELETE)
  src/app/api/verticals/suggest/route.ts (AI suggest)

---

## Step 4 — External tool auto-detection

When user connects Jira/Confluence/Linear in IntegrationsHubView,
automatically scan for existing projects/epics and suggest mapping.

### For Jira:
After successful connection in POST /api/integrations/connect:
  If integrationType === "jira":
    Fire-and-forget: scan for Jira projects
    POST /api/integrations/jira/discover (new route)

Create src/app/api/integrations/jira/discover/route.ts:
```typescript
// Reads Jira projects and epics
// Returns top 10 projects for user to map to ProductVerticals
// Does NOT auto-create anything — returns suggestions only
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return ...;

  const settings = await db.userSettingsRecord.findUnique({ ... });
  const jiraToken = decrypt(settings.jiraApiToken);
  const config = { host: settings.jiraUrl, email: settings.jiraEmail, token: jiraToken };

  const projects = await getJiraProjects(config); // existing jira.ts function

  // Return projects as suggestions — user decides what to map
  return NextResponse.json({
    suggestions: projects.slice(0, 10).map(p => ({
      jiraProjectKey: p.key,
      jiraProjectName: p.name,
      suggestedVerticalName: p.name,
      issueCount: p.issueCount || 0,
    }))
  });
}
```

Create src/components/settings/JiraDiscoveryModal.tsx:
  - Shows after Jira connection: "We found N projects in your Jira"
  - Lists each project with checkbox
  - "Create Product Verticals from selected" button
  - Creates ProductVertical records + sets jiraProjectKey in metadata
  - User can dismiss if they want to map manually

### For Linear:
Same pattern — after Linear connection, scan teams and projects.
POST /api/integrations/linear/discover

### Detection trigger:
In IntegrationsHubView, after successful handleConnect():
```typescript
if (config.type === 'jira' || config.type === 'linear') {
  const discovery = await fetch(`/api/integrations/${config.type}/discover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ llmConfig: settings.llmConfig }),
  });
  if (discovery.ok) {
    const { suggestions } = await discovery.json();
    if (suggestions.length > 0) setDiscoveryModal({ open: true, type: config.type, suggestions });
  }
}
```

Files to create:
  src/app/api/integrations/jira/discover/route.ts
  src/app/api/integrations/linear/discover/route.ts
  src/components/settings/JiraDiscoveryModal.tsx

---

## Step 5 — User granularity preference

Add to UserSettingsRecord or Zustand store:
  portfolioGranularity: 'verticals' | 'initiatives' | 'ideas' | 'all'
  portfolioTerminology: { vertical: string; initiative: string; idea: string }
  // e.g. { vertical: "Product Line", initiative: "Epic", idea: "Feature" }

In Settings > Portfolio Preferences (new sub-section):
  "How do you structure your work?"
  [Verticals → Initiatives → Ideas] (default)
  [Initiatives → Ideas] (skip verticals)
  [Just Ideas] (flat list)

  "What do you call your work items?"
  [Use PM standard terms] (default)
  [Use Jira terms: Epic / Story / Task]
  [Use custom terms]

Store preference in Zustand (client-side, same as LLM config).
Read in sidebar and Portfolio view to show correct nav labels and columns.

---

## Step 6 — TypeScript check and report

Run: npx tsc --noEmit

```
SPRINT ARCHITECTURE REPORT

SCHEMA CHANGES:
  ProductVertical model added
  Initiative.verticalId FK added
  Initiative.granularity field added

NEW ROUTES:
  GET/POST /api/verticals
  PATCH/DELETE /api/verticals/[id]
  POST /api/verticals/suggest
  POST /api/integrations/jira/discover
  POST /api/integrations/linear/discover

NEW VIEWS:
  ProductVerticalsView — vertical management + AI suggest

NEW COMPONENTS:
  JiraDiscoveryModal

MODIFIED:
  Vision products route — auto-creates ProductVertical
  InitiativesPipeline — vertical filter added
  IntegrationsHubView — triggers discovery after connection
  Sidebar — Product Verticals nav item

TYPESCRIPT: [0 new errors]

MANUAL TEST:
1. Generate vision → products auto-create verticals
2. Open /verticals → verticals visible with initiative count
3. Connect Jira → discovery modal appears with project suggestions
4. Accept 2 projects → 2 verticals created
5. Open Portfolio → vertical filter works
```

---

## Commit

git add -A
git commit -m "feat: product verticals, vision-portfolio sync, Jira/Linear auto-discovery"
