-- CreateTable
CREATE TABLE "KeywordSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keywords" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KeywordSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transcription" (
    "id" TEXT NOT NULL,
    "audioId" TEXT NOT NULL,
    "fullText" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '{}',
    "keywordSetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transcription_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transcription_audioId_key" ON "Transcription"("audioId");

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_audioId_fkey" FOREIGN KEY ("audioId") REFERENCES "Audio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_keywordSetId_fkey" FOREIGN KEY ("keywordSetId") REFERENCES "KeywordSet"("id") ON DELETE SET NULL ON UPDATE CASCADE;
