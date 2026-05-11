-- Convert keywords from text[] to jsonb, preserving existing data.
-- Each existing string keyword becomes { "name": "...", "type": "String" }

ALTER TABLE "KeywordSet" ADD COLUMN "keywords_new" JSONB;

UPDATE "KeywordSet"
SET "keywords_new" = (
  SELECT COALESCE(jsonb_agg(jsonb_build_object('name', k, 'type', 'String')), '[]'::jsonb)
  FROM unnest(keywords) AS k
);

ALTER TABLE "KeywordSet" DROP COLUMN "keywords";
ALTER TABLE "KeywordSet" RENAME COLUMN "keywords_new" TO "keywords";
ALTER TABLE "KeywordSet" ALTER COLUMN "keywords" SET NOT NULL;
ALTER TABLE "KeywordSet" ALTER COLUMN "keywords" SET DEFAULT '[]'::jsonb;
