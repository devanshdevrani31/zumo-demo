import { NextResponse } from 'next/server'
import { generateEvents } from '@/lib/simulation'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) {
      return NextResponse.json(
        { error: 'employeeId query parameter is required' },
        { status: 400 }
      )
    }

    const count = parseInt(searchParams.get('count') || '10', 10)
    const events = generateEvents(employeeId, count)

    return NextResponse.json(events)
  } catch (error) {
    console.error('Failed to generate simulated events:', error)
    return NextResponse.json(
      { error: 'Failed to generate simulated events' },
      { status: 500 }
    )
  }
}
