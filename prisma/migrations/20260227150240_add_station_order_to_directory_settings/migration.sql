-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DirectorySettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "showRadioId" BOOLEAN NOT NULL DEFAULT true,
    "showName" BOOLEAN NOT NULL DEFAULT true,
    "showRole" BOOLEAN NOT NULL DEFAULT true,
    "showStation" BOOLEAN NOT NULL DEFAULT true,
    "showShift" BOOLEAN NOT NULL DEFAULT true,
    "showPhone" BOOLEAN NOT NULL DEFAULT true,
    "showStartDate" BOOLEAN NOT NULL DEFAULT true,
    "roleOrder" TEXT NOT NULL DEFAULT '[]',
    "stationOrder" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_DirectorySettings" ("id", "roleOrder", "showName", "showPhone", "showRadioId", "showRole", "showShift", "showStartDate", "showStation") SELECT "id", "roleOrder", "showName", "showPhone", "showRadioId", "showRole", "showShift", "showStartDate", "showStation" FROM "DirectorySettings";
DROP TABLE "DirectorySettings";
ALTER TABLE "new_DirectorySettings" RENAME TO "DirectorySettings";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
