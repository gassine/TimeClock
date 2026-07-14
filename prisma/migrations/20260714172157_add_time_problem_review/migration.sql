-- CreateTable
CREATE TABLE "TimeProblem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "timeEntryId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "detectedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME,
    "reviewedById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeProblem_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TimeProblem_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "Firefighter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TimeProblem_timeEntryId_key" ON "TimeProblem"("timeEntryId");

-- CreateIndex
CREATE INDEX "TimeProblem_status_idx" ON "TimeProblem"("status");

-- CreateIndex
CREATE INDEX "TimeProblem_detectedAt_idx" ON "TimeProblem"("detectedAt");
