-- P0 security: payment submissions are client-writable only as pending records.
-- Apply after sql/subscriptions.sql.
--
-- Rollback:
--   DROP POLICY IF EXISTS payments_client_insert ON public.payments;
--   CREATE POLICY payments_anon_insert ON public.payments FOR INSERT WITH CHECK (true);
--
-- Previously `payments_anon_insert` used WITH CHECK (true), so anyone with the
-- publishable key could insert a row already marked approved, or attribute a
-- payment to another user. Entitlement is never granted by a payment row (only
-- an admin-generated activation code redeemed through redeem_activation_code
-- grants access), but the submission record must still be trustworthy.

DROP POLICY IF EXISTS payments_anon_insert ON public.payments;
DROP POLICY IF EXISTS payments_client_insert ON public.payments;
CREATE POLICY payments_client_insert ON public.payments FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'pending'                                   -- never self-approve
    AND verified_by IS NULL
    AND verified_at IS NULL
    AND amount > 0
    AND rejection_reason IS NULL
    AND (user_id IS NULL OR user_id = auth.uid())        -- cannot attribute to another user
    AND EXISTS (SELECT 1 FROM public.subscription_plans sp WHERE sp.id = payments.plan AND sp.active)
  );
