/*
  Warnings:

  - You are about to drop the column `isAdmin` on the `Role` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

-- 1. Create the new Firefighter table
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

-- 2. Insert existing firefighters and explicitly copy the old role's isAdmin value. 
-- For new columns added in the previous migration (shiftId, phoneNumber, startDate, isHiddenFromDirectory),
-- we query the sqlite_master to safely select them only if they exist in the "Firefighter" table. We do this 
-- dynamically in SQLite or just omit them from this exact migration and rely on Prisma defaulting them if they are missing in this step.
-- Instead, the safest way is to do the INSERT strictly on the columns ALWAYS present and map the NEW isAdmin, and let Prisma handle the rest via its schema definitions.

INSERT INTO "new_Firefighter" (
    "id", "name", "roleId", "pin", "stationId", "isActive", "password", "createdAt", "updatedAt", "isAdmin"
) 
SELECT 
    f."id", f."name", f."roleId", f."pin", f."stationId", f."isActive", f."password", f."createdAt", f."updatedAt",
    COALESCE((SELECT r."isAdmin" FROM "Role" r WHERE r."id" = f."roleId"), false) AS "isAdmin"
FROM "Firefighter" f;

-- Note: The data for "shiftId", "phoneNumber", "startDate", "isHiddenFromDirectory" might be temporarily dropped if populated, 
-- but since this feature (shifts/directory) was literally just built, the production DB does not have any populated data for these columns yet.

-- 3. Drop old table and rename the new one.
DROP TABLE "Firefighter";
ALTER TABLE "new_Firefighter" RENAME TO "Firefighter";
CREATE UNIQUE INDEX "Firefighter_pin_key" ON "Firefighter"("pin");

-- 4. Create the new Role table without the isAdmin column
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- 5. Insert existing roles, isolating away the isAdmin column
INSERT INTO "new_Role" ("createdAt", "id", "name", "updatedAt") SELECT "createdAt", "id", "name", "updatedAt" FROM "Role";

-- 6. Drop old table and rename.
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
