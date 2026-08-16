-- prakash-PICU — storage bucket for the hosted payment page screenshots.
--
-- The hosted payment page (public/payment.html) is unauthenticated, so it needs
-- anonymous INSERT access to this bucket. Admins read objects to generate the
-- signed URLs shown in Admin Panel → Payments.
--
-- Run this after sql/migration.sql and sql/subscriptions.sql.

-- 1. Create the private bucket (idempotent).
INSERT INTO storage.buckets (id, name, public)
VALUES ('payment-screenshots', 'payment-screenshots', false)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow anonymous uploads (the payment page submits without a login).
DROP POLICY IF EXISTS payment_screenshots_anon_upload ON storage.objects;
CREATE POLICY payment_screenshots_anon_upload ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'payment-screenshots');

-- 3. Allow admins to read objects (needed to create signed URLs for review).
DROP POLICY IF EXISTS payment_screenshots_admin_read ON storage.objects;
CREATE POLICY payment_screenshots_admin_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'payment-screenshots' AND public.is_admin());
