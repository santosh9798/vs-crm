-- CreateTable
CREATE TABLE "AssignmentShare" (
    "source" "LeadSource" NOT NULL,
    "userId" TEXT NOT NULL,
    "percent" INTEGER NOT NULL,

    CONSTRAINT "AssignmentShare_pkey" PRIMARY KEY ("source","userId")
);

-- Migrate exclusive source owners to 100%
INSERT INTO "AssignmentShare" ("source", "userId", "percent")
SELECT "source", "userId", 100
FROM "AssignmentRule"
WHERE "userId" IS NOT NULL;

-- Migrate rotation sources using each salesperson's previous global share
INSERT INTO "AssignmentShare" ("source", "userId", "percent")
SELECT r."source", u."id", u."allocationPercent"
FROM "AssignmentRule" r
CROSS JOIN "User" u
WHERE r."userId" IS NULL
  AND u."role" = 'salesperson'
  AND u."isActive" = true
  AND u."allocationPercent" > 0
ON CONFLICT ("source", "userId") DO NOTHING;

-- DropTable
DROP TABLE "AssignmentRule";

DROP TABLE "AssignmentCounter";

-- CreateTable
CREATE TABLE "AssignmentCounter" (
    "source" "LeadSource" NOT NULL,
    "userId" TEXT NOT NULL,
    "assignedCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AssignmentCounter_pkey" PRIMARY KEY ("source","userId")
);

-- AddForeignKey
ALTER TABLE "AssignmentShare" ADD CONSTRAINT "AssignmentShare_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignmentCounter" ADD CONSTRAINT "AssignmentCounter_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
