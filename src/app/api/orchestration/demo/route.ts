import { NextResponse } from 'next/server'
import { AuditLogger } from '@/lib/audit'

const auditLogger = new AuditLogger()

interface DemoEvent {
  step: number
  timestamp: string
  actor: string
  action: string
  channel: string
  details: string
  status: 'completed' | 'in_progress' | 'pending'
}

export async function POST() {
  try {
    const timeline: DemoEvent[] = []
    const baseTime = new Date()

    // Step 1: Customer complaint arrives on Slack
    const step1Time = new Date(baseTime.getTime())
    timeline.push({
      step: 1,
      timestamp: step1Time.toISOString(),
      actor: 'Customer (Jane Doe)',
      action: 'complaint_received',
      channel: 'Slack #support',
      details: 'Customer reports: "The checkout page keeps crashing when I try to apply a discount code. This has been happening for 2 days!"',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_event',
      'Customer complaint received via Slack: checkout page crash when applying discount code',
    )

    // Step 2: Support agent picks up the ticket
    const step2Time = new Date(baseTime.getTime() + 2000)
    timeline.push({
      step: 2,
      timestamp: step2Time.toISOString(),
      actor: 'Support Agent (AI)',
      action: 'ticket_acknowledged',
      channel: 'Slack #support',
      details: 'Support agent acknowledges complaint, creates ticket #4521, and sends initial response: "Hi Jane, I\'m looking into this right now. Let me check with our engineering team."',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_event',
      'Support agent acknowledged complaint, created ticket #4521, sent initial response to customer',
    )

    // Step 3: Support agent escalates to developer
    const step3Time = new Date(baseTime.getTime() + 5000)
    timeline.push({
      step: 3,
      timestamp: step3Time.toISOString(),
      actor: 'Support Agent (AI)',
      action: 'escalation_to_dev',
      channel: 'Slack #engineering',
      details: 'Support agent escalates to developer team: "Checkout discount code application causing crash. Ticket #4521. Priority: High. Affected: multiple customers over 2 days."',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_event',
      'Support agent escalated ticket #4521 to engineering team via Slack',
    )

    // Step 4: Developer agent investigates
    const step4Time = new Date(baseTime.getTime() + 8000)
    timeline.push({
      step: 4,
      timestamp: step4Time.toISOString(),
      actor: 'Developer Agent (AI)',
      action: 'investigation_started',
      channel: 'GitHub + Logs',
      details: 'Developer agent investigates: Pulled recent commits, checked error logs, identified null pointer exception in discount validation function (discount.service.ts:142). Root cause: missing null check when discount code has expired.',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_event',
      'Developer agent identified root cause: null pointer exception in discount.service.ts:142, missing null check for expired discount codes',
    )

    // Step 5: Fix applied
    const step5Time = new Date(baseTime.getTime() + 15000)
    timeline.push({
      step: 5,
      timestamp: step5Time.toISOString(),
      actor: 'Developer Agent (AI)',
      action: 'fix_applied',
      channel: 'GitHub PR #892',
      details: 'Developer agent creates PR #892: "Fix null pointer in discount validation". Added null check for expired discount codes, added unit test for edge case. PR submitted for review with diff showing 3 files changed.',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_event',
      'Developer agent created PR #892 with fix for discount validation null pointer, submitted for review',
    )

    // Step 6: Reply sent to customer
    const step6Time = new Date(baseTime.getTime() + 20000)
    timeline.push({
      step: 6,
      timestamp: step6Time.toISOString(),
      actor: 'Support Agent (AI)',
      action: 'customer_reply_sent',
      channel: 'Slack #support',
      details: 'Support agent sends follow-up to customer: "Hi Jane, we identified and fixed the issue with discount codes on checkout. The fix is being deployed now. You should be able to use discount codes within the next 30 minutes. Sorry for the inconvenience! Ticket #4521 resolved."',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_event',
      'Support agent sent resolution reply to customer Jane Doe, ticket #4521 marked as resolved',
    )

    // Step 7: Summary
    const step7Time = new Date(baseTime.getTime() + 22000)
    timeline.push({
      step: 7,
      timestamp: step7Time.toISOString(),
      actor: 'Zumo Platform',
      action: 'workflow_completed',
      channel: 'System',
      details: 'Full workflow completed: Customer complaint → Support triage → Engineering investigation → Fix deployed → Customer notified. Total time: ~22 seconds (simulated). All actions logged to immutable audit chain.',
      status: 'completed',
    })

    await auditLogger.log(
      'demo_workflow_completed',
      'Demo orchestration workflow completed: 7 steps from customer complaint to resolution in simulated 22 seconds',
    )

    return NextResponse.json({
      success: true,
      scenario: 'Customer Complaint Resolution',
      totalSteps: timeline.length,
      timeline,
    })
  } catch (error) {
    console.error('Failed to run demo scenario:', error)
    return NextResponse.json(
      { error: 'Failed to run demo scenario' },
      { status: 500 }
    )
  }
}
