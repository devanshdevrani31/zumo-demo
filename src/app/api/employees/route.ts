import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AuditLogger } from '@/lib/audit'

const auditLogger = new AuditLogger()

// Default policies based on role
function getDefaultPolicies(role: string) {
  const base = [
    { capability: 'inter_agent_comm', permission: 'allow', rateLimit: 50 },
  ]
  switch (role) {
    case 'Support Agent':
      return [
        ...base,
        { capability: 'send_email', permission: 'approval_required', rateLimit: 10 },
        { capability: 'access_database', permission: 'deny', rateLimit: null },
        { capability: 'api_call', permission: 'allow', rateLimit: 100 },
      ]
    case 'Developer':
      return [
        ...base,
        { capability: 'modify_code', permission: 'allow', rateLimit: 20 },
        { capability: 'deploy', permission: 'approval_required', rateLimit: 5 },
        { capability: 'send_email', permission: 'deny', rateLimit: null },
        { capability: 'access_database', permission: 'allow', rateLimit: 50 },
      ]
    case 'Security Analyst':
      return [
        ...base,
        { capability: 'api_call', permission: 'allow', rateLimit: 200 },
        { capability: 'send_email', permission: 'approval_required', rateLimit: 5 },
        { capability: 'modify_code', permission: 'deny', rateLimit: null },
        { capability: 'file_write', permission: 'deny', rateLimit: null },
      ]
    case 'DevOps Engineer':
      return [
        ...base,
        { capability: 'deploy', permission: 'approval_required', rateLimit: 3 },
        { capability: 'modify_code', permission: 'allow', rateLimit: 30 },
        { capability: 'file_write', permission: 'allow', rateLimit: 50 },
      ]
    default:
      return [
        ...base,
        { capability: 'send_email', permission: 'approval_required', rateLimit: 10 },
        { capability: 'api_call', permission: 'allow', rateLimit: 50 },
      ]
  }
}

const PROVISIONING_STEPS = [
  { label: 'Allocating sandbox', duration: 800 },
  { label: 'Configuring network isolation', duration: 1200 },
  { label: 'Deploying runtime', duration: 1500 },
  { label: 'Starting supervisor', duration: 600 },
  { label: 'Heartbeat active', duration: 400 },
]

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      include: { team: true },
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json(employees)
  } catch (error) {
    console.error('Failed to fetch employees:', error)
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, role, runtime, modelProvider, tools, autonomyMode, instructions, teamId } = body

    if (!name || !role) {
      return NextResponse.json({ error: 'Name and role are required' }, { status: 400 })
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        role,
        runtime: runtime || 'openclaw',
        modelProvider: modelProvider || 'anthropic',
        tools: tools ? JSON.stringify(tools) : '[]',
        autonomyMode: autonomyMode || 'supervised',
        instructions: instructions || '',
        teamId: teamId || null,
      },
      include: { team: true },
    })

    // Create default policies based on role
    const defaultPolicies = getDefaultPolicies(role)
    for (const policy of defaultPolicies) {
      await prisma.policy.create({
        data: {
          employeeId: employee.id,
          capability: policy.capability,
          permission: policy.permission,
          rateLimit: policy.rateLimit || null,
        },
      })
    }

    await auditLogger.log(
      'employee_created',
      `Created AI employee "${name}" with role "${role}" in ${autonomyMode || 'supervised'} mode`,
      employee.id,
    )

    const policies = await prisma.policy.findMany({
      where: { employeeId: employee.id },
    })

    return NextResponse.json(
      {
        employee: { ...employee, policies },
        provisioningSteps: PROVISIONING_STEPS,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create employee:', error)
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 })
  }
}
