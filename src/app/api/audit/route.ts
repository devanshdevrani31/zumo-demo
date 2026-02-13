import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { AuditLogger } from '@/lib/audit'

const auditLogger = new AuditLogger()

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    const where = employeeId ? { employeeId } : {}

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: { timestamp: 'desc' },
    })

    return NextResponse.json(logs)
  } catch (error) {
    console.error('Failed to fetch audit logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (body.action === 'verify') {
      const result = await auditLogger.verifyChain()
      return NextResponse.json(result)
    }

    return NextResponse.json(
      { error: 'Unknown action. Supported actions: "verify"' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Failed to process audit action:', error)
    return NextResponse.json(
      { error: 'Failed to process audit action' },
      { status: 500 }
    )
  }
}
