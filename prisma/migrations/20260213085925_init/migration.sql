-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "runtime" TEXT NOT NULL DEFAULT 'openclaw',
    "modelProvider" TEXT NOT NULL DEFAULT 'anthropic',
    "tools" TEXT NOT NULL DEFAULT '[]',
    "autonomyMode" TEXT NOT NULL DEFAULT 'supervised',
    "instructions" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'running',
    "teamId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Employee_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Policy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'allow',
    "rateLimit" INTEGER,
    CONSTRAINT "Policy_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "diff" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" DATETIME,
    CONSTRAINT "ApprovalRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL DEFAULT '',
    "hash" TEXT NOT NULL,
    "previousHash" TEXT NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "WorkflowRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teamId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "steps" TEXT NOT NULL DEFAULT '[]',
    CONSTRAINT "WorkflowRule_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
