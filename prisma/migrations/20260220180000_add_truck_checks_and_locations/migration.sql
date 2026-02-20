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

