import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo user
  const hashedPassword = await bcrypt.hash('demo123', 12);
  const user = await prisma.user.upsert({
    where: { email: 'demo@virtualppo.com' },
    update: {},
    create: {
      email: 'demo@virtualppo.com',
      name: 'Demo User',
      password: hashedPassword,
      role: 'admin',
    },
  });

  // Create default settings
  await prisma.userSettingsRecord.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  // Create sample initiatives
  const initiatives = [
    {
      title: 'AI-Powered Analytics Dashboard',
      description: 'Build a real-time analytics dashboard with AI insights for business users',
      status: 'approved',
      businessValue: 'high',
      effort: 'high',
      stakeholders: JSON.stringify(['Product Team', 'Data Science', 'Engineering']),
      tags: JSON.stringify(['AI', 'Analytics', 'Dashboard']),
      risks: JSON.stringify(['Data privacy concerns', 'Performance at scale']),
      dependencies: JSON.stringify(['Data pipeline v2']),
      userId: user.id,
    },
    {
      title: 'Customer Self-Service Portal',
      description: 'Enable customers to manage their accounts and view usage analytics',
      status: 'definition',
      businessValue: 'high',
      effort: 'medium',
      stakeholders: JSON.stringify(['Customer Success', 'Engineering']),
      tags: JSON.stringify(['Customer', 'Portal', 'Self-service']),
      risks: JSON.stringify(['Security review required']),
      dependencies: JSON.stringify([]),
      userId: user.id,
    },
    {
      title: 'ML Model Monitoring System',
      description: 'Implement monitoring and alerting for production ML models',
      status: 'discovery',
      businessValue: 'medium',
      effort: 'medium',
      stakeholders: JSON.stringify(['Data Science', 'DevOps']),
      tags: JSON.stringify(['ML', 'Monitoring', 'DevOps']),
      risks: JSON.stringify([]),
      dependencies: JSON.stringify([]),
      userId: user.id,
    },
    {
      title: 'API Rate Limiting Enhancement',
      description: 'Improve API rate limiting with dynamic limits based on customer tier',
      status: 'idea',
      businessValue: 'low',
      effort: 'low',
      stakeholders: JSON.stringify(['Engineering', 'Sales']),
      tags: JSON.stringify(['API', 'Infrastructure']),
      risks: JSON.stringify([]),
      dependencies: JSON.stringify([]),
      userId: user.id,
    },
  ];

  for (const init of initiatives) {
    await prisma.initiative.create({ data: init });
  }

  // Create sample meetings
  const meetings = [
    {
      title: 'Q3 Roadmap Planning',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      duration: 60,
      participants: JSON.stringify(['Product Team', 'Engineering Lead', 'Stakeholders']),
      status: 'summarized',
      summary: 'Discussed Q3 priorities including AI Dashboard and Customer Portal. Agreement on focusing resources on high-impact initiatives.',
      actionItems: JSON.stringify([
        { id: 'a1', description: 'Finalize Q3 roadmap document', assignee: 'PM', status: 'pending', source: 'meeting' },
        { id: 'a2', description: 'Schedule technical review for AI Dashboard', assignee: 'Tech Lead', status: 'pending', source: 'meeting' },
      ]),
      decisions: JSON.stringify(['AI Dashboard is top priority for Q3', 'ML Monitoring moved to Q4']),
      challenges: JSON.stringify(['Resource constraints between AI Dashboard and Portal projects']),
      userId: user.id,
    },
    {
      title: 'Sprint Review - Team Alpha',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      duration: 30,
      participants: JSON.stringify(['Team Alpha', 'Scrum Master', 'PM']),
      status: 'completed',
      actionItems: JSON.stringify([]),
      decisions: JSON.stringify([]),
      challenges: JSON.stringify([]),
      userId: user.id,
    },
    {
      title: 'Stakeholder Sync - Enterprise Customers',
      date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
      duration: 45,
      participants: JSON.stringify(['Enterprise Sales', 'Customer Success', 'PM']),
      status: 'scheduled',
      actionItems: JSON.stringify([]),
      decisions: JSON.stringify([]),
      challenges: JSON.stringify([]),
      userId: user.id,
    },
  ];

  for (const meeting of meetings) {
    await prisma.meeting.create({ data: meeting });
  }

  // Create sample risks
  const risks = [
    {
      title: 'Resource Bottleneck - AI Team',
      description: 'AI team is overloaded with multiple high-priority initiatives',
      severity: 'high',
      probability: 'high',
      impact: 'high',
      status: 'identified',
      relatedItems: JSON.stringify(['1', '3']),
      mitigationPlan: 'Consider external contractors or reprioritization',
      userId: user.id,
    },
    {
      title: 'Security Review Delay',
      description: 'Customer Portal requires security review which has 3-week backlog',
      severity: 'medium',
      probability: 'medium',
      impact: 'medium',
      status: 'mitigating',
      relatedItems: JSON.stringify(['2']),
      mitigationPlan: 'Engage security team early, provide documentation in advance',
      userId: user.id,
    },
  ];

  for (const risk of risks) {
    await prisma.risk.create({ data: risk });
  }

  console.log('Database seeded successfully!');
  console.log(`Demo user: demo@virtualppo.com / demo123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
