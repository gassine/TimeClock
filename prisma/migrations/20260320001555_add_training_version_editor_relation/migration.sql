-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TrainingPostVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "editorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TrainingPostVersion_postId_fkey" FOREIGN KEY ("postId") REFERENCES "TrainingPost" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "TrainingPostVersion_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "Firefighter" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_TrainingPostVersion" ("content", "createdAt", "editorId", "id", "postId", "title") SELECT "content", "createdAt", "editorId", "id", "postId", "title" FROM "TrainingPostVersion";
DROP TABLE "TrainingPostVersion";
ALTER TABLE "new_TrainingPostVersion" RENAME TO "TrainingPostVersion";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
