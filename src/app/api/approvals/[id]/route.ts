import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AuditLogger } from '@/lib/audit'

const auditLogger = new AuditLogger()

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status || !['approved', 'denied'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be "approved" or "denied"' },
        { status: 400 }
      )
    }

    const existing = await prisma.approvalRequest.findUnique({
      where: { id },
      include: { employee: true },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Approval request not found' },
        { status: 404 }
      )
    }

    if (existing.status !== 'pending') {
      return NextResponse.json(
        { error: `Approval request has already been ${existing.status}` },
        { status: 409 }
      )
    }

    const approval = await prisma.approvalRequest.update({
      where: { id },
      data: {
        status,
        resolvedAt: new Date(),
      },
      include: {
        employee: true,
      },
    })

    await auditLogger.log(
      `approval_${status}`,
      `Approval request for "${existing.action}" was ${status} (employee: "${existing.employee.name}")`,
      existing.employeeId,
    )

    return NextResponse.json(approval)
  } catch (error) {
    console.error('Failed to update approval request:', error)
    return NextResponse.json(
      { error: 'Failed to update approval request' },
      { status: 500 }
    )
  }
}
