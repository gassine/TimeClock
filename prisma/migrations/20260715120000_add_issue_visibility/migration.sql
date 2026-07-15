-- Add visibility separately from archival. Existing issues stay public, while
-- newly submitted issues use the private schema default.
ALTER TABLE "Issue" ADD COLUMN "isVisibleToEveryone" BOOLEAN NOT NULL DEFAULT false;

UPDATE "Issue" SET "isVisibleToEveryone" = true;

CREATE INDEX "Issue_isArchived_isVisibleToEveryone_idx"
ON "Issue"("isArchived", "isVisibleToEveryone");
