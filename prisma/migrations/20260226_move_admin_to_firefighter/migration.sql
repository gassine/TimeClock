/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `Role` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Role" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

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
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Firefighter_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Firefighter_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Firefighter_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Firefighter" ("createdAt", "id", "isActive", "name", "pin", "roleId", "shiftId", "stationId", "phoneNumber", "startDate", "isHiddenFromDirectory", "password", "updatedAt") SELECT "createdAt", "id", "isActive", "name", "pin", "roleId", "shiftId", "stationId", "phoneNumber", "startDate", "isHiddenFromDirectory", "password", "updatedAt" FROM "Firefighter";
DROP TABLE "Firefighter";
ALTER TABLE "new_Firefighter" RENAME TO "Firefighter";
CREATE UNIQUE INDEX "Firefighter_pin_key" ON "Firefighter"("pin");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
