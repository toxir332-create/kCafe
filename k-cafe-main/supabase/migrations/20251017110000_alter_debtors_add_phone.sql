/*
  # Alter debtors: add phone column
*/

ALTER TABLE IF EXISTS public.debtors
ADD COLUMN IF NOT EXISTS phone text;

-- Optional index for lookups by phone
CREATE INDEX IF NOT EXISTS debtors_phone_idx ON public.debtors(phone);

-- Ensure PostgREST reloads schema
NOTIFY pgrst, 'reload schema';
