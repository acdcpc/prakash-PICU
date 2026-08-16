-- prakash-PICU — subscription & payment system (Kapoori-ka model)
-- Flow:
--   1. User pays externally (eSewa / Khalti / Fonepay / Bank transfer).
--   2. User submits a payment record + optional screenshot from the hosted payment page.
--   3. An administrator verifies the transaction and issues a one-time activation code.
--   4. The user redeems the code in the app to activate their subscription.
-- Live card/mobile-wallet charging must be implemented server-side with a licensed provider.

-- ── Plans (single plan, NPR 2500 / year) ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  description   TEXT NOT NULL,
  price_npr     INTEGER NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  features      JSONB NOT NULL DEFAULT '[]'::jsonb,
  active        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.subscription_plans (id, name, description, price_npr, duration_days, features)
VALUES
  ('full-access', 'PICU Full Access', 'Full access to the PICU clinical workspace for one year.', 2500, 365,
   '["All clinical calculators", "High-risk infusion reference", "Emergency Mode", "Clinical Tools workspace", "Child health workspace", "Pediatric updates", "Excel exports"]'::jsonb)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      price_npr = EXCLUDED.price_npr,
      duration_days = EXCLUDED.duration_days,
      features = EXCLUDED.features;

-- ── Payment submissions (inserted anonymously from the hosted payment page) ──
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  email            TEXT NOT NULL,
  mobile           TEXT,
  amount           INTEGER NOT NULL,
  transaction_id   TEXT,
  screenshot_url   TEXT,
  plan             TEXT NOT NULL DEFAULT 'full-access',
  status           TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at      TIMESTAMPTZ,
  verified_by      UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS payments_status_created_idx ON public.payments(status, created_at DESC);

-- ── Activation codes (stored as SHA-256 hashes, never plaintext) ──
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE TABLE IF NOT EXISTS public.activation_codes (
  code_hash               TEXT PRIMARY KEY,
  status                  TEXT NOT NULL DEFAULT 'valid' CHECK (status IN ('valid','used')),
  plan                    TEXT NOT NULL DEFAULT 'full-access',
  amount                  INTEGER,
  original_transaction_id TEXT,
  used_by                 UUID REFERENCES auth.users(id),
  used_at                 TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Redemption rate limiting (5 attempts / 15 minutes) ──
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  count        INT NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Subscriptions (Kapoori-ka style) ──
CREATE TABLE IF NOT EXISTS public.subscriptions (
  user_id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status               TEXT NOT NULL DEFAULT 'none' CHECK (status IN ('none','active','expired')),
  plan                 TEXT NOT NULL DEFAULT 'full-access',
  start_date           TIMESTAMPTZ,
  end_date             TIMESTAMPTZ,
  auto_renew           BOOLEAN NOT NULL DEFAULT false,
  price                INTEGER,
  redeemed_code_hash   TEXT,
  activated_by_payment UUID,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Row Level Security ──────────────────────────────────────────────────
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_public_read ON public.subscription_plans;
CREATE POLICY subscription_plans_public_read ON public.subscription_plans
  FOR SELECT USING (active = true);

-- Hosted payment page is unauthenticated: allow anonymous inserts only.
DROP POLICY IF EXISTS payments_anon_insert ON public.payments;
CREATE POLICY payments_anon_insert ON public.payments
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS payments_read ON public.payments;
CREATE POLICY payments_read ON public.payments
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

DROP POLICY IF EXISTS payments_admin_update ON public.payments;
CREATE POLICY payments_admin_update ON public.payments
  FOR UPDATE USING (public.is_admin());

-- Activation codes are secrets: no client-side read at all. The RPC redeems them.
DROP POLICY IF EXISTS rate_limits_own_read ON public.rate_limits;
CREATE POLICY rate_limits_own_read ON public.rate_limits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS subscriptions_read ON public.subscriptions;
CREATE POLICY subscriptions_read ON public.subscriptions
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

-- ── RPC: redeem an activation code ──────────────────────────────────────
-- Rate-limited (5 attempts / 15 min); code is SHA-256 hashed before lookup.
CREATE OR REPLACE FUNCTION public.redeem_activation_code(p_code TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_user_id   UUID;
  v_code      TEXT;
  v_code_hash TEXT;
  v_code_row  public.activation_codes%ROWTYPE;
  v_plan      TEXT;
  v_days      INT;
  v_end_date  TIMESTAMPTZ;
  v_now       TIMESTAMPTZ := now();
  v_rate      public.rate_limits%ROWTYPE;
  v_wait      INT;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Must be signed in.');
  END IF;

  v_code := upper(regexp_replace(p_code, '[^A-Z0-9]', '', 'g'));
  IF length(v_code) < 6 OR length(v_code) > 32 THEN
    RETURN jsonb_build_object('error', 'Invalid code format.');
  END IF;
  v_code_hash := encode(extensions.digest(v_code, 'sha256'), 'hex');

  -- Rate limiting: max 5 failed attempts per 15 minutes
  SELECT * INTO v_rate FROM public.rate_limits WHERE user_id = v_user_id;
  IF FOUND THEN
    IF EXTRACT(EPOCH FROM (v_now - v_rate.window_start)) > 900 THEN
      UPDATE public.rate_limits SET count = 1, window_start = v_now WHERE user_id = v_user_id;
    ELSIF v_rate.count >= 5 THEN
      v_wait := CEIL(900 - EXTRACT(EPOCH FROM (v_now - v_rate.window_start)));
      RETURN jsonb_build_object('error', 'Too many attempts. Wait ' || v_wait || 's.');
    ELSE
      UPDATE public.rate_limits SET count = count + 1 WHERE user_id = v_user_id;
    END IF;
  ELSE
    INSERT INTO public.rate_limits (user_id, count, window_start) VALUES (v_user_id, 1, v_now);
  END IF;

  SELECT * INTO v_code_row FROM public.activation_codes WHERE code_hash = v_code_hash;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Invalid code.'); END IF;
  IF v_code_row.status != 'valid' THEN RETURN jsonb_build_object('error', 'Code already used.'); END IF;

  v_plan := COALESCE(v_code_row.plan, 'full-access');
  v_days := CASE WHEN v_plan = 'full-access' THEN 365 ELSE 30 END;
  v_end_date := v_now + (v_days || ' days')::INTERVAL;

  UPDATE public.activation_codes
     SET status = 'used', used_by = v_user_id, used_at = v_now
   WHERE code_hash = v_code_hash;

  INSERT INTO public.subscriptions
    (user_id, status, plan, start_date, end_date, auto_renew, price, redeemed_code_hash)
  VALUES
    (v_user_id, 'active', v_plan, v_now, v_end_date, false, v_code_row.amount, v_code_hash)
  ON CONFLICT (user_id) DO UPDATE
     SET status = 'active',
         plan = v_plan,
         start_date = v_now,
         end_date = v_end_date,
         auto_renew = false,
         price = v_code_row.amount,
         redeemed_code_hash = v_code_hash,
         updated_at = v_now;

  DELETE FROM public.rate_limits WHERE user_id = v_user_id;

  RETURN jsonb_build_object('success', true, 'plan', v_plan, 'end_date', v_end_date);
END;
$$;

-- ── RPC: void outstanding codes for a transaction (regenerate flow) ────
CREATE OR REPLACE FUNCTION public.admin_void_codes(p_original_transaction_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RETURN jsonb_build_object('error', 'Admin access required.');
  END IF;
  UPDATE public.activation_codes
     SET status = 'used'
   WHERE original_transaction_id = p_original_transaction_id
     AND status = 'valid';
  RETURN jsonb_build_object('success', true);
END;
$$;
