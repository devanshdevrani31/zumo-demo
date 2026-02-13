import { PrismaClient } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

function hashChain(previousHash: string, action: string, details: string, timestamp: Date): string {
  return createHash('sha256')
    .update(`${previousHash}|${action}|${details}|${timestamp.toISOString()}`)
    .digest('hex')
}

async function main() {
  // Clean existing data
  await prisma.auditLog.deleteMany()
  await prisma.approvalRequest.deleteMany()
  await prisma.policy.deleteMany()
  await prisma.workflowRule.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.team.deleteMany()

  // Create teams
  const supportTeam = await prisma.team.create({
    data: {
      id: 'team-support',
      name: 'Customer Support',
      description: 'Handles customer inquiries, complaints, and escalations',
    },
  })

  const engineeringTeam = await prisma.team.create({
    data: {
      id: 'team-engineering',
      name: 'Engineering',
      description: 'Handles bug fixes, deployments, and code reviews',
    },
  })

  const securityTeam = await prisma.team.create({
    data: {
      id: 'team-security',
      name: 'Security',
      description: 'Monitors security threats and enforces compliance',
    },
  })

  // Create employees
  const emma = await prisma.employee.create({
    data: {
      id: 'emp-emma',
      name: 'Emma',
      role: 'Support Agent',
      runtime: 'openclaw',
      modelProvider: 'anthropic',
      tools: JSON.stringify(['slack', 'hubspot', 'email']),
      autonomyMode: 'supervised',
      instructions: 'Monitor #support Slack channel. Respond to customer inquiries within 2 minutes. Escalate technical issues to engineering team.',
      status: 'running',
      teamId: supportTeam.id,
    },
  })

  const alex = await prisma.employee.create({
    data: {
      id: 'emp-alex',
      name: 'Alex',
      role: 'Developer',
      runtime: 'autogpt',
      modelProvider: 'openai',
      tools: JSON.stringify(['github', 'sentry', 'database', 'file_system']),
      autonomyMode: 'supervised',
      instructions: 'Fix bugs reported by support team. Create pull requests with tests. Follow code review guidelines.',
      status: 'running',
      teamId: engineeringTeam.id,
    },
  })

  const sentinel = await prisma.employee.create({
    data: {
      id: 'emp-sentinel',
      name: 'Sentinel',
      role: 'Security Analyst',
      runtime: 'custom_planner',
      modelProvider: 'anthropic',
      tools: JSON.stringify(['sentry', 'api_access']),
      autonomyMode: 'manual_approval',
      instructions: 'Monitor for security threats. Analyze error patterns. Block suspicious activity. Report all findings.',
      status: 'running',
      teamId: securityTeam.id,
    },
  })

  const maya = await prisma.employee.create({
    data: {
      id: 'emp-maya',
      name: 'Maya',
      role: 'Data Analyst',
      runtime: 'openclaw',
      modelProvider: 'gemini',
      tools: JSON.stringify(['database', 'hubspot', 'api_access']),
      autonomyMode: 'full_auto',
      instructions: 'Generate daily reports. Track KPIs. Identify trends in customer behavior.',
      status: 'running',
      teamId: supportTeam.id,
    },
  })

  const otto = await prisma.employee.create({
    data: {
      id: 'emp-otto',
      name: 'Otto',
      role: 'DevOps Engineer',
      runtime: 'external',
      modelProvider: 'local',
      tools: JSON.stringify(['github', 'api_access', 'file_system', 'database']),
      autonomyMode: 'supervised',
      instructions: 'Monitor deployment pipelines. Handle infrastructure alerts. Manage CI/CD workflows.',
      status: 'paused',
      teamId: engineeringTeam.id,
    },
  })

  // Create policies
  const policies = [
    // Emma policies
    { employeeId: emma.id, capability: 'send_email', permission: 'approval_required', rateLimit: 10 },
    { employeeId: emma.id, capability: 'access_database', permission: 'deny', rateLimit: null },
    { employeeId: emma.id, capability: 'inter_agent_comm', permission: 'allow', rateLimit: 50 },
    { employeeId: emma.id, capability: 'api_call', permission: 'allow', rateLimit: 100 },
    // Alex policies
    { employeeId: alex.id, capability: 'modify_code', permission: 'allow', rateLimit: 20 },
    { employeeId: alex.id, capability: 'deploy', permission: 'approval_required', rateLimit: 5 },
    { employeeId: alex.id, capability: 'send_email', permission: 'deny', rateLimit: null },
    { employeeId: alex.id, capability: 'access_database', permission: 'allow', rateLimit: 50 },
    // Sentinel policies
    { employeeId: sentinel.id, capability: 'api_call', permission: 'allow', rateLimit: 200 },
    { employeeId: sentinel.id, capability: 'send_email', permission: 'approval_required', rateLimit: 5 },
    { employeeId: sentinel.id, capability: 'modify_code', permission: 'deny', rateLimit: null },
    { employeeId: sentinel.id, capability: 'file_write', permission: 'deny', rateLimit: null },
    // Maya policies
    { employeeId: maya.id, capability: 'access_database', permission: 'allow', rateLimit: 100 },
    { employeeId: maya.id, capability: 'api_call', permission: 'allow', rateLimit: 50 },
    { employeeId: maya.id, capability: 'send_email', permission: 'approval_required', rateLimit: 5 },
    // Otto policies
    { employeeId: otto.id, capability: 'deploy', permission: 'approval_required', rateLimit: 3 },
    { employeeId: otto.id, capability: 'modify_code', permission: 'allow', rateLimit: 30 },
    { employeeId: otto.id, capability: 'file_write', permission: 'allow', rateLimit: 50 },
  ]

  for (const policy of policies) {
    await prisma.policy.create({ data: policy })
  }

  // Create workflow rules
  await prisma.workflowRule.create({
    data: {
      teamId: supportTeam.id,
      trigger: 'slack_complaint',
      steps: JSON.stringify([
        { agent: 'Emma', action: 'detect_complaint', order: 1 },
        { agent: 'Emma', action: 'acknowledge_customer', order: 2 },
        { agent: 'Alex', action: 'investigate_issue', order: 3 },
        { agent: 'Alex', action: 'create_fix', order: 4 },
        { agent: 'Emma', action: 'reply_to_customer', order: 5 },
      ]),
    },
  })

  await prisma.workflowRule.create({
    data: {
      teamId: engineeringTeam.id,
      trigger: 'sentry_error_spike',
      steps: JSON.stringify([
        { agent: 'Sentinel', action: 'analyze_error', order: 1 },
        { agent: 'Alex', action: 'diagnose_root_cause', order: 2 },
        { agent: 'Alex', action: 'implement_fix', order: 3 },
        { agent: 'Otto', action: 'deploy_fix', order: 4 },
      ]),
    },
  })

  await prisma.workflowRule.create({
    data: {
      teamId: securityTeam.id,
      trigger: 'security_alert',
      steps: JSON.stringify([
        { agent: 'Sentinel', action: 'assess_threat', order: 1 },
        { agent: 'Sentinel', action: 'block_if_critical', order: 2 },
        { agent: 'Otto', action: 'patch_vulnerability', order: 3 },
      ]),
    },
  })

  // Create approval requests
  await prisma.approvalRequest.create({
    data: {
      employeeId: emma.id,
      action: 'send_email',
      details: 'Emma wants to send an email to customer@example.com regarding ticket #4521',
      diff: `To: customer@example.com\nSubject: Re: Service Disruption - Ticket #4521\n\nDear Customer,\n\nThank you for reaching out. We have identified the issue affecting your service and our engineering team is actively working on a fix.\n\nExpected resolution: Within 2 hours.\n\nBest regards,\nEmma (AI Support Agent)`,
      status: 'pending',
    },
  })

  await prisma.approvalRequest.create({
    data: {
      employeeId: alex.id,
      action: 'deploy',
      details: 'Alex wants to deploy hotfix for authentication timeout bug (PR #287)',
      diff: `--- a/src/auth/session.ts\n+++ b/src/auth/session.ts\n@@ -42,7 +42,7 @@\n   const sessionTimeout = config.get('session.timeout');\n-  if (Date.now() - session.lastActivity > 3600000) {\n+  if (Date.now() - session.lastActivity > sessionTimeout) {\n     return { valid: false, reason: 'Session expired' };\n   }`,
      status: 'pending',
    },
  })

  await prisma.approvalRequest.create({
    data: {
      employeeId: sentinel.id,
      action: 'send_email',
      details: 'Sentinel wants to send security alert to ops-team@company.com',
      diff: `To: ops-team@company.com\nSubject: [SECURITY] Unusual API Access Pattern Detected\n\nSeverity: HIGH\n\nDetected 47 failed authentication attempts from IP range 203.0.113.0/24 in the last 15 minutes.\n\nRecommended action: Temporarily block IP range and investigate.\n\n- Sentinel (AI Security Analyst)`,
      status: 'pending',
    },
  })

  // Create hash-chained audit logs
  let previousHash = '0000000000000000000000000000000000000000000000000000000000000000'
  const auditEntries = [
    { action: 'system.startup', details: 'Zumo platform initialized', employeeId: null as string | null, offset: -3600000 * 24 },
    { action: 'employee.created', details: 'Employee Emma (Support Agent) created', employeeId: emma.id, offset: -3600000 * 23 },
    { action: 'employee.created', details: 'Employee Alex (Developer) created', employeeId: alex.id, offset: -3600000 * 22 },
    { action: 'employee.created', details: 'Employee Sentinel (Security Analyst) created', employeeId: sentinel.id, offset: -3600000 * 21 },
    { action: 'employee.created', details: 'Employee Maya (Data Analyst) created', employeeId: maya.id, offset: -3600000 * 20 },
    { action: 'employee.created', details: 'Employee Otto (DevOps Engineer) created', employeeId: otto.id, offset: -3600000 * 19 },
    { action: 'policy.created', details: 'Email policy set to approval_required for Emma', employeeId: emma.id, offset: -3600000 * 18 },
    { action: 'policy.created', details: 'Deploy policy set to approval_required for Alex', employeeId: alex.id, offset: -3600000 * 17 },
    { action: 'vm.provisioned', details: 'Sandbox VM allocated for Emma', employeeId: emma.id, offset: -3600000 * 16 },
    { action: 'vm.provisioned', details: 'Sandbox VM allocated for Alex', employeeId: alex.id, offset: -3600000 * 15 },
    { action: 'vm.provisioned', details: 'Sandbox VM allocated for Sentinel', employeeId: sentinel.id, offset: -3600000 * 14 },
    { action: 'runtime.started', details: 'OpenClaw runtime started for Emma', employeeId: emma.id, offset: -3600000 * 13 },
    { action: 'runtime.started', details: 'AutoGPT runtime started for Alex', employeeId: alex.id, offset: -3600000 * 12 },
    { action: 'agent.heartbeat', details: 'All agents reporting healthy', employeeId: null, offset: -3600000 * 6 },
    { action: 'simulation.slack_message', details: 'Customer complaint detected in #support', employeeId: emma.id, offset: -3600000 * 4 },
    { action: 'agent.action', details: 'Emma acknowledged customer complaint', employeeId: emma.id, offset: -3600000 * 3.5 },
    { action: 'agent.escalation', details: 'Emma escalated issue to engineering team', employeeId: emma.id, offset: -3600000 * 3 },
    { action: 'agent.action', details: 'Alex started investigating reported issue', employeeId: alex.id, offset: -3600000 * 2.5 },
    { action: 'policy.blocked', details: 'Emma attempted to send email - approval required', employeeId: emma.id, offset: -3600000 * 2 },
    { action: 'approval.requested', details: 'Email approval requested for Emma', employeeId: emma.id, offset: -3600000 * 1.5 },
    { action: 'agent.action', details: 'Alex identified root cause: session timeout misconfiguration', employeeId: alex.id, offset: -3600000 * 1 },
    { action: 'approval.requested', details: 'Deploy approval requested for Alex (hotfix PR #287)', employeeId: alex.id, offset: -1800000 },
    { action: 'security.alert', details: 'Sentinel detected unusual API access pattern from 203.0.113.0/24', employeeId: sentinel.id, offset: -900000 },
    { action: 'agent.heartbeat', details: 'All agents reporting healthy', employeeId: null, offset: -300000 },
  ]

  for (const entry of auditEntries) {
    const timestamp = new Date(Date.now() + entry.offset)
    const hash = hashChain(previousHash, entry.action, entry.details, timestamp)
    await prisma.auditLog.create({
      data: {
        action: entry.action,
        details: entry.details,
        employeeId: entry.employeeId,
        hash,
        previousHash,
        timestamp,
      },
    })
    previousHash = hash
  }

  console.log('Seed data created successfully!')
  console.log(`  - ${3} teams`)
  console.log(`  - ${5} employees`)
  console.log(`  - ${policies.length} policies`)
  console.log(`  - ${3} approval requests`)
  console.log(`  - ${auditEntries.length} audit log entries`)
  console.log(`  - ${3} workflow rules`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
