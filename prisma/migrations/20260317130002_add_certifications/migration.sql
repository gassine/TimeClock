-- CreateTable
CREATE TABLE "Certification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MemberCertification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "firefighterId" TEXT NOT NULL,
    "certificationId" TEXT NOT NULL,
    "certDate" DATETIME,
    "expiryDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MemberCertification_firefighterId_fkey" FOREIGN KEY ("firefighterId") REFERENCES "Firefighter" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MemberCertification_certificationId_fkey" FOREIGN KEY ("certificationId") REFERENCES "Certification" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CertificationReminderRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "daysBeforeExpiry" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "label" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CertificationSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "showToUsers" BOOLEAN NOT NULL DEFAULT true
);

-- CreateIndex
CREATE UNIQUE INDEX "MemberCertification_firefighterId_certificationId_key" ON "MemberCertification"("firefighterId", "certificationId");
