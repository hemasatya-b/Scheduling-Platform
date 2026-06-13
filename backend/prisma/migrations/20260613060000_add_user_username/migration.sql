-- AlterTable: add username, backfilled from the email local-part for existing rows
ALTER TABLE "users" ADD COLUMN "username" VARCHAR(50);

UPDATE "users"
SET "username" = lower(regexp_replace(split_part("email", '@', 1), '[^a-zA-Z0-9]+', '-', 'g'))
WHERE "username" IS NULL;

ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
