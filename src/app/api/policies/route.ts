import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AuditLogger } from '@/lib/audit'

const auditLogger = new AuditLogger()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    const where = employeeId ? { employeeId } : {}

    const policies = await prisma.policy.findMany({
      where,
      include: {
        employee: true,
      },
    })

    return NextResponse.json(policies)
  } catch (error) {
    console.error('Failed to fetch policies:', error)
    return NextResponse.json(
      { error: 'Failed to fetch policies' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { employeeId, capability, permission, rateLimit } = body

    if (!employeeId || !capability) {
      return NextResponse.json(
        { error: 'employeeId and capability are required' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.findUnique({ where: { id: employeeId } })
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const policy = await prisma.policy.create({
      data: {
        employeeId,
        capability,
        permission: permission || 'allow',
        rateLimit: rateLimit || null,
      },
      include: {
        employee: true,
      },
    })

    await auditLogger.log(
      'policy_created',
      `Created policy: "${capability}" set to "${permission || 'allow'}" for employee "${employee.name}"`,
      employeeId,
    )

    return NextResponse.json(policy, { status: 201 })
  } catch (error) {
    console.error('Failed to create policy:', error)
    return NextResponse.json(
      { error: 'Failed to create policy' },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, capability, permission, rateLimit } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Policy id is required' },
        { status: 400 }
      )
    }

    const existing = await prisma.policy.findUnique({
      where: { id },
      include: { employee: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Policy not found' },
        { status: 404 }
      )
    }

    const policy = await prisma.policy.update({
      where: { id },
      data: {
        capability: capability ?? existing.capability,
        permission: permission ?? existing.permission,
        rateLimit: rateLimit !== undefined ? rateLimit : existing.rateLimit,
      },
      include: {
        employee: true,
      },
    })

    await auditLogger.log(
      'policy_updated',
      `Updated policy "${policy.capability}" to "${policy.permission}" for employee "${existing.employee.name}"`,
      existing.employeeId,
    )

    return NextResponse.json(policy)
  } catch (error) {
    console.error('Failed to update policy:', error)
    return NextResponse.json(
      { error: 'Failed to update policy' },
      { status: 500 }
    )
  }
}
