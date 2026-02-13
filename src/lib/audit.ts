// ---------------------------------------------------------------------------
// Hash-chained audit logging system
// Every log entry includes a SHA-256 hash computed from the previous entry's
// hash, the action, details, and timestamp. This creates a tamper-evident
// chain that can be verified at any time.
// ---------------------------------------------------------------------------

import { createHash } from 'crypto'
import prisma from '@/lib/db'

export interface AuditLogEntry {
  id: string
  employeeId: string | null
  action: string
  details: string
  hash: string
  previousHash: string
  timestamp: Date
}

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000'

/**
 * Compute a SHA-256 hash from the components of an audit entry.
 */
function computeHash(
  previousHash: string,
  action: string,
  details: string,
  timestamp: string,
): string {
  const payload = `${previousHash}|${action}|${details}|${timestamp}`
  return createHash('sha256').update(payload).digest('hex')
}

export class AuditLogger {
  // --------------------------------------------------------------------------
  // log – append a new entry to the audit chain
  // --------------------------------------------------------------------------

  /**
   * Create a new audit log entry. The entry's hash is derived from the
   * previous entry's hash (or the genesis hash if this is the first entry),
   * combined with the action, details, and current timestamp.
   *
   * @param action      A short label for the event (e.g. "policy_denied").
   * @param details     Human-readable description of what happened.
   * @param employeeId  Optional ID of the employee associated with the event.
   * @returns           The newly created AuditLog record.
   */
  async log(
    action: string,
    details: string,
    employeeId?: string,
  ): Promise<AuditLogEntry> {
    const previousHash = await this.getLastHash()
    const timestamp = new Date()
    const hash = computeHash(previousHash, action, details, timestamp.toISOString())

    const entry = await prisma.auditLog.create({
      data: {
        action,
        details,
        hash,
        previousHash,
        timestamp,
        ...(employeeId ? { employeeId } : {}),
      },
    })

    return entry as AuditLogEntry
  }

  // --------------------------------------------------------------------------
  // verifyChain – validate the entire audit log
  // --------------------------------------------------------------------------

  /**
   * Walk through every audit log entry (oldest first) and recompute each
   * hash to verify that the chain has not been tampered with.
   *
   * @returns An object indicating whether the chain is valid. If invalid,
   *          `brokenAt` contains the 0-based index of the first entry whose
   *          hash does not match the expected value.
   */
  async verifyChain(): Promise<{ valid: boolean; brokenAt?: number }> {
    const entries = await prisma.auditLog.findMany({
      orderBy: { timestamp: 'asc' },
    })

    if (entries.length === 0) {
      return { valid: true }
    }

    let expectedPreviousHash = GENESIS_HASH

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]

      // Verify the previousHash pointer
      if (entry.previousHash !== expectedPreviousHash) {
        return { valid: false, brokenAt: i }
      }

      // Recompute the hash and compare
      const recomputed = computeHash(
        entry.previousHash,
        entry.action,
        entry.details,
        entry.timestamp.toISOString(),
      )

      if (entry.hash !== recomputed) {
        return { valid: false, brokenAt: i }
      }

      expectedPreviousHash = entry.hash
    }

    return { valid: true }
  }

  // --------------------------------------------------------------------------
  // getLastHash – retrieve the most recent hash (or genesis)
  // --------------------------------------------------------------------------

  /**
   * Get the hash of the most recent audit log entry. Returns the genesis
   * hash if no entries exist yet.
   */
  async getLastHash(): Promise<string> {
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { timestamp: 'desc' },
      select: { hash: true },
    })

    return lastEntry?.hash ?? GENESIS_HASH
  }
}

// Singleton for convenience
export const auditLogger = new AuditLogger()
