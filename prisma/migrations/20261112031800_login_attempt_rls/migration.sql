-- Enable RLS on LoginAttempt with no permissive policies.
-- The app uses Prisma as the `prisma` role (BYPASSRLS). The Data API sees zero rows.

ALTER TABLE "LoginAttempt" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoginAttempt" FORCE ROW LEVEL SECURITY;
