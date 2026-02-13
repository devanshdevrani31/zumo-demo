import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const approvals = await prisma.approvalRequest.findMany({
      where: { status: 'pending' },
      include: {
        employee: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(approvals)
  } catch (error) {
    console.error('Failed to fetch approval requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch approval requests' },
      { status: 500 }
    )
  }
}
