-- CreateTable
CREATE TABLE "Firefighter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "pin" TEXT NOT NULL,
    "stationId" TEXT,
    "shiftId" TEXT,
    "phoneNumber" TEXT,
    "startDate" DATETIME,
    "isHiddenFromDirectory" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Firefighter_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Firefighter_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Firefighter_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "action" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "modelId" TEXT,
    "details" TEXT,
    "adminId" TEXT,
    "ipAddress" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "Firefighter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TimeChangeRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firefighterId" TEXT NOT NULL,
    "timeEntryId" TEXT,
    "requestedClockIn" DATETIME,
    "requestedClockOut" DATETIME,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminComment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeChangeRequest_firefighterId_fkey" FOREIGN KEY ("firefighterId") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TimeChangeRequest_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "TimeEntry" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DirectorySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "showRadioId" BOOLEAN NOT NULL DEFAULT true,
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "showRole" BOOLEAN NOT NULL DEFAULT true,
    "showStation" BOOLEAN NOT NULL DEFAULT true,
    "showShift" BOOLEAN NOT NULL DEFAULT true,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "showStartDate" BOOLEAN NOT NULL DEFAULT true,
    "roleOrder" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "Apparatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'In Service',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Apparatus_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "TimeEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firefighterId" TEXT NOT NULL,
    "clockIn" DATETIME NOT NULL,
    "clockOut" DATETIME,
    "stationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TimeEntry_firefighterId_fkey" FOREIGN KEY ("firefighterId") REFERENCES "Firefighter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Issue" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "statusId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Issue_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Issue_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "IssueStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IssueStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "IssueComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "content" TEXT NOT NULL,
    "issueId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IssueComment_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "Issue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "IssueComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "IncidentType" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReportStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isDraftLike" BOOLEAN NOT NULL DEFAULT false,
    "userCanEditOwn" BOOLEAN NOT NULL DEFAULT false,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FieldReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "incidentTypeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "alarmTime" TEXT,
    "esoReportCompleted" BOOLEAN NOT NULL DEFAULT false,
    "location" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "incidentSummary" TEXT NOT NULL,
    "officerInCharge" TEXT,
    "statusId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdByRadioId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldReport_incidentTypeId_fkey" FOREIGN KEY ("incidentTypeId") REFERENCES "IncidentType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FieldReport_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "ReportStatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "FieldReport_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldReportApparatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "apparatusId" TEXT NOT NULL,
    CONSTRAINT "FieldReportApparatus_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FieldReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FieldReportApparatus_apparatusId_fkey" FOREIGN KEY ("apparatusId") REFERENCES "Apparatus" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldReportApparatusPersonnel" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportApparatusId" TEXT NOT NULL,
    "firefighterId" TEXT NOT NULL,
    "firefighterRadioId" TEXT NOT NULL,
    CONSTRAINT "FieldReportApparatusPersonnel_reportApparatusId_fkey" FOREIGN KEY ("reportApparatusId") REFERENCES "FieldReportApparatus" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FieldReportApparatusPersonnel_firefighterId_fkey" FOREIGN KEY ("firefighterId") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldReportModRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "requestedByRadioId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "reason" TEXT,
    "apparatusId" TEXT,
    "proposedChanges" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FieldReportModRequest_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FieldReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FieldReportModRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldReportComment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldReportComment_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FieldReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FieldReportComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Firefighter" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FieldReportAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FieldReportAuditLog_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "FieldReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ApparatusLocation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apparatusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApparatusLocation_apparatusId_fkey" FOREIGN KEY ("apparatusId") REFERENCES "Apparatus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckCheckTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apparatusId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckCheckTemplate_apparatusId_fkey" FOREIGN KEY ("apparatusId") REFERENCES "Apparatus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckCheckItemTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "itemName" TEXT NOT NULL,
    "itemDescription" TEXT,
    "adminPhotoUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "locationId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckCheckItemTemplate_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TruckCheckTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckCheckItemTemplate_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "ApparatusLocation" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckCheckReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "templateId" TEXT NOT NULL,
    "apparatusId" TEXT NOT NULL,
    "reportDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'Open',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckCheckReport_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "TruckCheckTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckCheckReport_apparatusId_fkey" FOREIGN KEY ("apparatusId") REFERENCES "Apparatus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckCheckReportItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "templateItemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NA',
    "comments" TEXT,
    "completedByRadioId" TEXT,
    "completedByUserId" TEXT,
    "completedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckCheckReportItem_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TruckCheckReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckCheckReportItem_templateItemId_fkey" FOREIGN KEY ("templateItemId") REFERENCES "TruckCheckItemTemplate" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckCheckReportItem_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "Firefighter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TruckCheckRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "reportId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckCheckRequest_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "TruckCheckReport" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TruckCheckRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "Firefighter" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Firefighter_pin_key" ON "Firefighter"("pin");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_name_key" ON "Shift"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Station_name_key" ON "Station"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Apparatus_name_key" ON "Apparatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IssueStatus_name_key" ON "IssueStatus"("name");

-- CreateIndex
CREATE UNIQUE INDEX "IncidentType_name_key" ON "IncidentType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ReportStatus_name_key" ON "ReportStatus"("name");
