-- Teddy Bear monograph review-queue classification.
-- Adds a record_kind taxonomy so clinicians can filter to actual drug
-- monographs instead of scrolling through abbreviations, front matter,
-- table-of-contents lines, citation dates, and monograph sub-sections.
--
-- Apply after sql/teddy_bear_monographs.sql and the seed file.
-- The backfill is a heuristic; institutions may override record_kind per row.

ALTER TABLE public.teddy_bear_monographs
  ADD COLUMN IF NOT EXISTS record_kind TEXT NOT NULL DEFAULT 'monograph';

ALTER TABLE public.teddy_bear_monographs
  DROP CONSTRAINT IF EXISTS teddy_bear_record_kind_check;
ALTER TABLE public.teddy_bear_monographs
  ADD CONSTRAINT teddy_bear_record_kind_check
  CHECK (record_kind IN ('monograph', 'section', 'reference'));

CREATE INDEX IF NOT EXISTS idx_teddy_bear_record_kind
  ON public.teddy_bear_monographs(record_kind);

-- Backfill classification.
UPDATE public.teddy_bear_monographs SET record_kind = CASE
  -- Table-of-contents dot-leader lines (e.g. "Drug.......................... 84").
  WHEN name ~ '\.{4,}' THEN 'reference'
  -- Front matter / editorial pages.
  WHEN lower(name) ~ '^(society of|we have devoted|monographs|carolyn|tracy|kelley|a\. jill|stephanie|clinical pharmacy|clinical preceptor|university of texas|austin|about the|dedication|preface|table of contents|index of|brand and generic|acknowledg)' THEN 'reference'
  -- Reference citation dates ("Accessed May 19, 2016." / standalone month-year lines).
  WHEN lower(name) ~ '^(accessed|january|february|march|april|may|june|july|august|september|october|november|december)' THEN 'reference'
  -- Monograph sub-sections (repeat across every drug monograph).
  WHEN lower(name) ~ '^(brand names?|maximum|suitable diluents|dosage|iv[[:space:]]|other routes|continuous|intermittent|additives|infusion-related|medication|comments|preparation|contraindications)' THEN 'section'
  -- Abbreviation list entries ("ABBR    expanded term").
  WHEN name ~ '\s{2,}' THEN 'reference'
  -- Everything else is a drug monograph title.
  ELSE 'monograph'
END;
