-- CreateIndex
CREATE INDEX "FieldReport_createdByUserId_idx" ON "FieldReport"("createdByUserId");

-- CreateIndex
CREATE INDEX "FieldReport_date_idx" ON "FieldReport"("date");

-- CreateIndex
CREATE INDEX "FieldReport_statusId_idx" ON "FieldReport"("statusId");

-- CreateIndex
CREATE INDEX "TimeEntry_firefighterId_idx" ON "TimeEntry"("firefighterId");

-- CreateIndex
CREATE INDEX "TimeEntry_clockIn_idx" ON "TimeEntry"("clockIn");
