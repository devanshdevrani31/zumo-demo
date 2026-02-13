import { NextResponse } from 'next/server'
import prisma from '@/lib/db'

export async function GET() {
  try {
    const teams = await prisma.team.findMany({
      include: {
        employees: true,
        workflowRules: true,
      },
    })

    return NextResponse.json(teams)
  } catch (error) {
    console.error('Failed to fetch orchestration data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orchestration data' },
      { status: 500 }
    )
  }
}
