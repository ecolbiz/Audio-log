-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_audioId_fkey";

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
