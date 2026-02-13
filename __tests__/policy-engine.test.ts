import { createHash } from 'crypto'

// Mock Prisma before importing modules
const mockPolicies: any[] = []
const mockApprovalRequests: any[] = []
const mockAuditLogs: any[] = []
let auditLogIdCounter = 0

const mockPrisma = {
  employee: {
    findUnique: jest.fn(({ where }: any) => {
      // Return a mock employee for any ID starting with 'emp-'
      if (where.id && where.id.startsWith('emp-')) {
        return Promise.resolve({
          id: where.id,
          name: 'Test Employee',
          role: 'Developer',
          autonomyMode: 'full',
          status: 'running',
        })
      }
      return Promise.resolve(null)
    }),
  },
  policy: {
    findMany: jest.fn(({ where }: any) => {
      if (where.capability) {
        return Promise.resolve(
          mockPolicies.filter((p) => p.employeeId === where.employeeId && p.capability === where.capability)
        )
      }
      return Promise.resolve(
        mockPolicies.filter((p) => p.employeeId === where.employeeId)
      )
    }),
  },
  approvalRequest: {
    create: jest.fn(({ data }: any) => {
      const req = { id: `apr-${Date.now()}`, ...data, createdAt: new Date() }
      mockApprovalRequests.push(req)
      return Promise.resolve(req)
    }),
    findMany: jest.fn(() => Promise.resolve(mockApprovalRequests)),
    update: jest.fn(({ where, data }: any) => {
      const req = mockApprovalRequests.find((r) => r.id === where.id)
      if (req) Object.assign(req, data)
      return Promise.resolve(req)
    }),
  },
  auditLog: {
    findFirst: jest.fn(() => {
      const last = mockAuditLogs[mockAuditLogs.length - 1]
      return Promise.resolve(last || null)
    }),
    create: jest.fn(({ data }: any) => {
      const log = { id: `audit-${++auditLogIdCounter}`, ...data }
      mockAuditLogs.push(log)
      return Promise.resolve(log)
    }),
    findMany: jest.fn(({ orderBy }: any) => {
      const sorted = [...mockAuditLogs]
      if (orderBy?.timestamp === 'asc') {
        sorted.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      }
      return Promise.resolve(sorted)
    }),
  },
}

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: mockPrisma,
  prisma: mockPrisma,
}))

// Now import the modules under test
import { PolicyEngine } from '@/lib/policy-engine'
import { AuditLogger } from '@/lib/audit'

describe('Policy Engine', () => {
  let engine: PolicyEngine

  beforeEach(() => {
    engine = new PolicyEngine()
    mockPolicies.length = 0
    mockApprovalRequests.length = 0
    mockAuditLogs.length = 0
  })

  test('should allow action when policy permits', async () => {
    mockPolicies.push({
      id: 'p1',
      employeeId: 'emp-1',
      capability: 'send_email',
      permission: 'allow',
      rateLimit: null,
    })

    const result = await engine.evaluate('emp-1', 'send_email')
    expect(result.allowed).toBe(true)
    expect(result.requiresApproval).toBe(false)
  })

  test('should deny action when policy denies', async () => {
    mockPolicies.push({
      id: 'p2',
      employeeId: 'emp-1',
      capability: 'send_email',
      permission: 'deny',
      rateLimit: null,
    })

    const result = await engine.evaluate('emp-1', 'send_email')
    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('denied')
  })

  test('should require approval when policy says approval_required', async () => {
    mockPolicies.push({
      id: 'p3',
      employeeId: 'emp-1',
      capability: 'send_email',
      permission: 'approval_required',
      rateLimit: null,
    })

    const result = await engine.evaluate('emp-1', 'send_email')
    expect(result.allowed).toBe(false)
    expect(result.requiresApproval).toBe(true)
  })

  test('should allow action when no policy exists (default allow)', async () => {
    const result = await engine.evaluate('emp-1', 'unknown_action')
    expect(result.allowed).toBe(true)
  })
})

describe('Approval Flow', () => {
  let engine: PolicyEngine

  beforeEach(() => {
    engine = new PolicyEngine()
    mockPolicies.length = 0
    mockApprovalRequests.length = 0
    mockAuditLogs.length = 0
  })

  test('should create approval request when action requires approval', async () => {
    mockPolicies.push({
      id: 'p4',
      employeeId: 'emp-1',
      capability: 'deploy',
      permission: 'approval_required',
      rateLimit: null,
    })

    await engine.evaluate('emp-1', 'deploy')
    expect(mockApprovalRequests.length).toBe(1)
    expect(mockApprovalRequests[0].action).toBe('deploy')
    expect(mockApprovalRequests[0].status).toBe('pending')
  })

  test('should not create approval request when action is allowed', async () => {
    mockPolicies.push({
      id: 'p5',
      employeeId: 'emp-1',
      capability: 'read_data',
      permission: 'allow',
      rateLimit: null,
    })

    await engine.evaluate('emp-1', 'read_data')
    expect(mockApprovalRequests.length).toBe(0)
  })
})

describe('Audit Chain Integrity', () => {
  let logger: AuditLogger

  beforeEach(() => {
    logger = new AuditLogger()
    mockAuditLogs.length = 0
    auditLogIdCounter = 0
  })

  test('should create audit log with hash chain', async () => {
    await logger.log('test.action', 'Test details', 'emp-1')
    expect(mockAuditLogs.length).toBe(1)
    expect(mockAuditLogs[0].hash).toBeTruthy()
    expect(mockAuditLogs[0].previousHash).toBeTruthy()
  })

  test('should chain hashes correctly', async () => {
    await logger.log('action.1', 'First action')
    const firstHash = mockAuditLogs[0].hash

    await logger.log('action.2', 'Second action')
    expect(mockAuditLogs[1].previousHash).toBe(firstHash)
  })

  test('should verify valid chain', async () => {
    // Manually create a valid chain
    const genesis = '0000000000000000000000000000000000000000000000000000000000000000'
    const t1 = new Date('2024-01-01T00:00:00Z')
    const hash1 = createHash('sha256').update(`${genesis}|action.1|First|${t1.toISOString()}`).digest('hex')
    const t2 = new Date('2024-01-01T00:01:00Z')
    const hash2 = createHash('sha256').update(`${hash1}|action.2|Second|${t2.toISOString()}`).digest('hex')

    mockAuditLogs.push(
      { id: 'a1', action: 'action.1', details: 'First', hash: hash1, previousHash: genesis, timestamp: t1 },
      { id: 'a2', action: 'action.2', details: 'Second', hash: hash2, previousHash: hash1, timestamp: t2 }
    )

    const result = await logger.verifyChain()
    expect(result.valid).toBe(true)
  })

  test('should detect tampered chain', async () => {
    const genesis = '0000000000000000000000000000000000000000000000000000000000000000'
    const t1 = new Date('2024-01-01T00:00:00Z')
    const hash1 = createHash('sha256').update(`${genesis}|action.1|First|${t1.toISOString()}`).digest('hex')
    const t2 = new Date('2024-01-01T00:01:00Z')
    const hash2 = createHash('sha256').update(`${hash1}|action.2|Second|${t2.toISOString()}`).digest('hex')

    mockAuditLogs.push(
      { id: 'a1', action: 'action.1', details: 'TAMPERED', hash: hash1, previousHash: genesis, timestamp: t1 },
      { id: 'a2', action: 'action.2', details: 'Second', hash: hash2, previousHash: hash1, timestamp: t2 }
    )

    const result = await logger.verifyChain()
    expect(result.valid).toBe(false)
  })
})

describe('Runtime Switching', () => {
  test('should have all four runtimes registered', async () => {
    const { RuntimeRegistry } = await import('@/lib/runtime')
    const registry = new RuntimeRegistry()
    const runtimes = registry.list()
    expect(runtimes).toContain('openclaw')
    expect(runtimes).toContain('autogpt')
    expect(runtimes).toContain('customplanner')
    expect(runtimes).toContain('external')
  })

  test('should return different runtimes with different behaviors', async () => {
    const { RuntimeRegistry } = await import('@/lib/runtime')
    const registry = new RuntimeRegistry()

    const openclaw = registry.get('openclaw')
    const autogpt = registry.get('autogpt')

    expect(openclaw).toBeTruthy()
    expect(autogpt).toBeTruthy()
    expect(openclaw!.name).not.toBe(autogpt!.name)
  })

  test('should generate logs when executing tasks', async () => {
    const { RuntimeRegistry } = await import('@/lib/runtime')
    const registry = new RuntimeRegistry()

    const openclaw = registry.get('openclaw')
    const result = await openclaw!.execute({ id: 'test-1', description: 'Test task' })

    expect(result).toBeTruthy()
    expect(result.status).toBe('completed')
    expect(result.output.length).toBeGreaterThan(0)
  })
})
