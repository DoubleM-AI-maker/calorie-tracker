-- Migration: Add display_name column to the food table
-- Run this on the VPS: docker compose exec db psql -U postgres -d postgres -f /tmp/add_display_name.sql
-- Or paste directly into psql

ALTER TABLE food ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Optionally backfill existing OFF entries with brand + name as a rough display_name
UPDATE food
SET display_name = TRIM(COALESCE(brand || ' ', '') || name_de)
WHERE source = 'off' AND display_name IS NULL AND brand IS NOT NULL;

COMMENT ON COLUMN food.display_name IS 'Full specific product name from Open Food Facts, e.g. "Sportness Clear Whey Protein Pfirsich Eistee". Separate from name_de which is the generic LLM-extracted cache key.';
