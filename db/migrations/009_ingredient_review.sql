-- 009_ingredient_review.sql — AI review notes for draft ingredients.
-- NULL review_note means "not yet reviewed"; the "Review drafts" job uses that to
-- find pending drafts and writes a note (and fills missing fields) per ingredient.

ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS review_note text;

INSERT INTO schema_migrations (version) VALUES ('009_ingredient_review') ON CONFLICT DO NOTHING;
