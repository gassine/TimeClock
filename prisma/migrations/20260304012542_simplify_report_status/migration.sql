/*
  Warnings:

  - You are about to drop the column `isDraftLike` on the `ReportStatus` table. All the data in the column will be lost.
  - You are about to drop the column `isFinal` on the `ReportStatus` table. All the data in the column will be lost.
  - You are about to drop the column `userCanEditOwn` on the `ReportStatus` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ReportStatus" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "isEditable" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_ReportStatus" ("createdAt", "id", "name", "order", "updatedAt") SELECT "createdAt", "id", "name", "order", "updatedAt" FROM "ReportStatus";
DROP TABLE "ReportStatus";
ALTER TABLE "new_ReportStatus" RENAME TO "ReportStatus";
CREATE UNIQUE INDEX "ReportStatus_name_key" ON "ReportStatus"("name");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
