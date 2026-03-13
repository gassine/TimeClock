-- AlterTable
ALTER TABLE "AssignmentCategory" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "AssignmentItem" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;
