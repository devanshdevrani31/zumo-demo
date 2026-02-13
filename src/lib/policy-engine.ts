// ---------------------------------------------------------------------------
// Policy enforcement engine
// Evaluates actions against stored policies, enforces rate limits, checks
// inter-agent permissions, and creates approval requests when required.
// ---------------------------------------------------------------------------

import prisma from '@/lib/db'

export interface PolicyResult {
  allowed: boolean
  reason: string
  requiresApproval: boolean
}

interface RateLimitEntry {
  count: number
  windowStart: number
}

// In-memory rate-limit tracking (per process). In production this would use
// Redis or a similar distributed store; for the demo an in-memory map suffices.
const rateLimitMap = new Map<string, RateLimitEntry>()

const RATE_LIMIT_WINDOW_MS = 60_000 // 1-minute sliding window

export class PolicyEngine {
  // --------------------------------------------------------------------------
  // evaluate – main entry point
  // --------------------------------------------------------------------------

  /**
   * Evaluate whether a given employee is allowed to perform an action.
   * Checks stored Policy records in the database. When a matching policy
   * specifies "approval_required", an ApprovalRequest is created and the
   * result indicates that human approval is needed.
   *
   * @param employeeId  The ID of the employee (agent) attempting the action.
   * @param action      The capability / action string to check (e.g. "deploy",
   *                    "access_crm", "send_email").
   * @param context     Optional context object stored alongside approval
   *                    requests for auditing purposes.
   */
  async evaluate(
    employeeId: string,
    action: string,
    context?: Record<string, unknown>,
  ): Promise<PolicyResult> {
    // 1. Verify the employee exists
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })

    if (!employee) {
      return {
        allowed: false,
        reason: `Employee ${employeeId} not found`,
        requiresApproval: false,
      }
    }

    // 2. Look up policies that match this employee + capability
    const policies = await prisma.policy.findMany({
      where: {
        employeeId,
        capability: action,
      },
    })

    // 3. If no explicit policy exists, fall back to the employee's autonomy mode
    if (policies.length === 0) {
      return this.evaluateAutonomyFallback(employee.autonomyMode, employeeId, action, context)
    }

    // 4. Process matching policies (most restrictive wins)
    let hasDeny = false
    let hasApprovalRequired = false
    let hasAllow = false
    let applicableRateLimit: number | null = null

    for (const policy of policies) {
      switch (policy.permission) {
        case 'deny':
          hasDeny = true
          break
        case 'approval_required':
          hasApprovalRequired = true
          break
        case 'allow':
          hasAllow = true
          break
      }
      if (policy.rateLimit !== null) {
        applicableRateLimit =
          applicableRateLimit === null
            ? policy.rateLimit
            : Math.min(applicableRateLimit, policy.rateLimit)
      }
    }

    // Deny takes precedence
    if (hasDeny) {
      await this.logAudit(
        `policy_denied`,
        `Action "${action}" denied by explicit policy`,
        employeeId,
      )
      return {
        allowed: false,
        reason: `Action "${action}" is explicitly denied by policy`,
        requiresApproval: false,
      }
    }

    // Rate-limit check (if any policy has one configured)
    if (applicableRateLimit !== null) {
      const withinLimit = await this.checkRateLimit(employeeId, action, applicableRateLimit)
      if (!withinLimit) {
        await this.logAudit(
          'rate_limit_exceeded',
          `Rate limit exceeded for "${action}" (limit: ${applicableRateLimit}/min)`,
          employeeId,
        )
        return {
          allowed: false,
          reason: `Rate limit exceeded for "${action}" (max ${applicableRateLimit} per minute)`,
          requiresApproval: false,
        }
      }
    }

    // Approval-required path
    if (hasApprovalRequired) {
      await this.createApprovalRequest(employeeId, action, context)
      await this.logAudit(
        'approval_requested',
        `Approval requested for "${action}"`,
        employeeId,
      )
      return {
        allowed: false,
        reason: `Action "${action}" requires human approval. An approval request has been created.`,
        requiresApproval: true,
      }
    }

    // Allowed
    if (hasAllow) {
      await this.logAudit(
        'policy_allowed',
        `Action "${action}" allowed by policy`,
        employeeId,
      )
      // Bump the rate-limit counter
      this.incrementRateCounter(employeeId, action)
      return {
        allowed: true,
        reason: `Action "${action}" is allowed by policy`,
        requiresApproval: false,
      }
    }

    // Should not reach here, but default to deny for safety
    return {
      allowed: false,
      reason: 'No matching permission found; defaulting to deny',
      requiresApproval: false,
    }
  }

  // --------------------------------------------------------------------------
  // checkRateLimit
  // --------------------------------------------------------------------------

  /**
   * Check whether the employee has remaining capacity for the action within
   * the current rate-limit window. When called from `evaluate`, the limit
   * parameter is pulled from the matching policy.  External callers can
   * supply a custom limit or omit it to use a sensible default.
   */
  async checkRateLimit(
    employeeId: string,
    action: string,
    limit?: number,
  ): Promise<boolean> {
    const effectiveLimit = limit ?? 60 // default: 60 per minute
    const key = `${employeeId}:${action}`
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      // Window expired or first request – reset
      rateLimitMap.set(key, { count: 1, windowStart: now })
      return true
    }

    return entry.count < effectiveLimit
  }

  // --------------------------------------------------------------------------
  // checkInterAgentPermission
  // --------------------------------------------------------------------------

  /**
   * Determine whether one agent (fromId) is allowed to invoke an action on
   * another agent (toId). The logic checks:
   *   1. Both agents exist.
   *   2. Both agents are on the same team (team-level trust boundary).
   *   3. The *source* agent has an "allow" policy for the capability
   *      "inter_agent:<action>".
   */
  async checkInterAgentPermission(
    fromId: string,
    toId: string,
    action: string,
  ): Promise<boolean> {
    const [fromEmployee, toEmployee] = await Promise.all([
      prisma.employee.findUnique({ where: { id: fromId } }),
      prisma.employee.findUnique({ where: { id: toId } }),
    ])

    if (!fromEmployee || !toEmployee) {
      return false
    }

    // Agents on different teams (or unassigned) cannot interact by default
    if (
      !fromEmployee.teamId ||
      !toEmployee.teamId ||
      fromEmployee.teamId !== toEmployee.teamId
    ) {
      // Check for an explicit cross-team policy override
      const crossTeamPolicy = await prisma.policy.findFirst({
        where: {
          employeeId: fromId,
          capability: `cross_team:${action}`,
          permission: 'allow',
        },
      })
      if (!crossTeamPolicy) {
        await this.logAudit(
          'inter_agent_denied',
          `Cross-team action "${action}" from ${fromId} to ${toId} denied`,
          fromId,
        )
        return false
      }
    }

    // Check for an explicit inter-agent policy
    const policy = await prisma.policy.findFirst({
      where: {
        employeeId: fromId,
        capability: `inter_agent:${action}`,
        permission: 'allow',
      },
    })

    if (!policy) {
      await this.logAudit(
        'inter_agent_denied',
        `Inter-agent action "${action}" from ${fromId} to ${toId} denied (no policy)`,
        fromId,
      )
      return false
    }

    await this.logAudit(
      'inter_agent_allowed',
      `Inter-agent action "${action}" from ${fromId} to ${toId} allowed`,
      fromId,
    )
    return true
  }

  // --------------------------------------------------------------------------
  // Private helpers
  // --------------------------------------------------------------------------

  /**
   * Fallback evaluation based on the employee's autonomy mode when there is
   * no explicit policy for the action.
   */
  private async evaluateAutonomyFallback(
    autonomyMode: string,
    employeeId: string,
    action: string,
    context?: Record<string, unknown>,
  ): Promise<PolicyResult> {
    switch (autonomyMode) {
      case 'full':
        await this.logAudit(
          'autonomy_allowed',
          `No explicit policy for "${action}"; full autonomy mode allows by default`,
          employeeId,
        )
        return {
          allowed: true,
          reason: `No explicit policy for "${action}"; allowed under full autonomy mode`,
          requiresApproval: false,
        }

      case 'supervised':
        await this.createApprovalRequest(employeeId, action, context)
        await this.logAudit(
          'autonomy_approval',
          `No explicit policy for "${action}"; supervised mode requires approval`,
          employeeId,
        )
        return {
          allowed: false,
          reason: `No explicit policy for "${action}"; supervised mode requires approval`,
          requiresApproval: true,
        }

      case 'restricted':
      default:
        await this.logAudit(
          'autonomy_denied',
          `No explicit policy for "${action}"; restricted mode denies by default`,
          employeeId,
        )
        return {
          allowed: false,
          reason: `No explicit policy for "${action}"; denied under restricted autonomy mode`,
          requiresApproval: false,
        }
    }
  }

  /** Create an ApprovalRequest record in the database. */
  private async createApprovalRequest(
    employeeId: string,
    action: string,
    context?: Record<string, unknown>,
  ): Promise<void> {
    await prisma.approvalRequest.create({
      data: {
        employeeId,
        action,
        details: context ? JSON.stringify(context) : '',
        status: 'pending',
      },
    })
  }

  /** Increment the in-memory rate-limit counter for an employee + action. */
  private incrementRateCounter(employeeId: string, action: string): void {
    const key = `${employeeId}:${action}`
    const now = Date.now()
    const entry = rateLimitMap.get(key)

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitMap.set(key, { count: 1, windowStart: now })
    } else {
      entry.count++
    }
  }

  /** Convenience wrapper to log an audit event via the database. */
  private async logAudit(
    action: string,
    details: string,
    employeeId?: string,
  ): Promise<void> {
    // Import lazily to avoid circular dependency at module load time.
    const { AuditLogger } = await import('@/lib/audit')
    const logger = new AuditLogger()
    await logger.log(action, details, employeeId)
  }
}

// Singleton for convenience
export const policyEngine = new PolicyEngine()
