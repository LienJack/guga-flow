ALTER TABLE "ProviderConfig" ADD COLUMN "secretJson" JSONB;
ALTER TABLE "ProviderConfig" ADD COLUMN "lastTestStatus" TEXT;
ALTER TABLE "ProviderConfig" ADD COLUMN "lastTestedAt" TIMESTAMP(3);
ALTER TABLE "ProviderConfig" ADD COLUMN "lastTestModel" TEXT;
ALTER TABLE "ProviderConfig" ADD COLUMN "lastTestMessage" TEXT;
