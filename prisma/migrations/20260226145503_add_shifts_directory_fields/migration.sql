-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
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

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Firefighter" (
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
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Firefighter_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Firefighter_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Firefighter_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Firefighter" ("createdAt", "id", "isActive", "name", "password", "pin", "roleId", "stationId", "updatedAt") SELECT "createdAt", "id", "isActive", "name", "password", "pin", "roleId", "stationId", "updatedAt" FROM "Firefighter";
DROP TABLE "Firefighter";
ALTER TABLE "new_Firefighter" RENAME TO "Firefighter";
CREATE UNIQUE INDEX "Firefighter_pin_key" ON "Firefighter"("pin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Shift_name_key" ON "Shift"("name");
