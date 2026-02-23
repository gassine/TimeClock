-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TruckCheckTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "apparatusId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "TruckCheckTemplate_apparatusId_fkey" FOREIGN KEY ("apparatusId") REFERENCES "Apparatus" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TruckCheckTemplate" ("apparatusId", "createdAt", "id", "updatedAt") SELECT "apparatusId", "createdAt", "id", "updatedAt" FROM "TruckCheckTemplate";
DROP TABLE "TruckCheckTemplate";
ALTER TABLE "new_TruckCheckTemplate" RENAME TO "TruckCheckTemplate";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
