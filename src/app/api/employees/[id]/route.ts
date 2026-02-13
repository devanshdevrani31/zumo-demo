import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AuditLogger } from '@/lib/audit'
import { generateEvents } from '@/lib/simulation'

const auditLogger = new AuditLogger()

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        team: true,
        policies: true,
      },
    })

    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Fetch recent audit logs for this employee
    const recentAuditLogs = await prisma.auditLog.findMany({
      where: { employeeId: id },
      orderBy: { timestamp: 'desc' },
      take: 20,
    })

    // Generate simulated activity
    const simulatedActivity = generateEvents(id, 5)

    return NextResponse.json({
      ...employee,
      recentAuditLogs,
      simulatedActivity,
    })
  } catch (error) {
    console.error('Failed to fetch employee:', error)
    return NextResponse.json(
      { error: 'Failed to fetch employee' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()

    const existing = await prisma.employee.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        role: body.role ?? existing.role,
        runtime: body.runtime ?? existing.runtime,
        modelProvider: body.modelProvider ?? existing.modelProvider,
        tools: body.tools ? JSON.stringify(body.tools) : existing.tools,
        autonomyMode: body.autonomyMode ?? existing.autonomyMode,
        instructions: body.instructions ?? existing.instructions,
        status: body.status ?? existing.status,
        teamId: body.teamId !== undefined ? body.teamId : existing.teamId,
      },
      include: {
        team: true,
        policies: true,
      },
    })

    await auditLogger.log(
      'employee_updated',
      `Updated AI employee "${employee.name}": ${JSON.stringify(body)}`,
      id,
    )

    return NextResponse.json(employee)
  } catch (error) {
    console.error('Failed to update employee:', error)
    return NextResponse.json(
      { error: 'Failed to update employee' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const employee = await prisma.employee.findUnique({ where: { id } })
    if (!employee) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      )
    }

    // Log deletion before removing the employee (cascade will remove policies, approvals)
    await auditLogger.log(
      'employee_deleted',
      `Deleted AI employee "${employee.name}" (role: ${employee.role})`,
      id,
    )

    await prisma.employee.delete({ where: { id } })

    return NextResponse.json({ success: true, message: `Employee "${employee.name}" deleted` })
  } catch (error) {
    console.error('Failed to delete employee:', error)
    return NextResponse.json(
      { error: 'Failed to delete employee' },
      { status: 500 }
    )
  }
}
