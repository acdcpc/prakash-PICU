-- Subscription and payment-request foundation for prakash-PICU.
-- Live card/mobile-wallet charging must be implemented server-side with a licensed provider.

CREATE TABLE IF NOT EXISTS public.subscription_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price_npr INTEGER NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','cancelled')),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  provider TEXT,
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active ON public.subscriptions(user_id) WHERE status IN ('pending','active');
CREATE INDEX IF NOT EXISTS subscriptions_user_idx ON public.subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_id TEXT NOT NULL REFERENCES public.subscription_plans(id),
  amount_npr INTEGER NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted','under_review','paid','rejected','refunded')),
  reference TEXT,
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES auth.users(id)
);
CREATE INDEX IF NOT EXISTS payment_requests_user_idx ON public.payment_requests(user_id, created_at DESC);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_plans_public_read ON public.subscription_plans;
CREATE POLICY subscription_plans_public_read ON public.subscription_plans FOR SELECT USING (active = true);
DROP POLICY IF EXISTS subscriptions_own_read ON public.subscriptions;
CREATE POLICY subscriptions_own_read ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS payment_requests_own_read ON public.payment_requests;
CREATE POLICY payment_requests_own_read ON public.payment_requests FOR SELECT USING (auth.uid() = user_id OR public.is_admin());
DROP POLICY IF EXISTS payment_requests_own_insert ON public.payment_requests;
CREATE POLICY payment_requests_own_insert ON public.payment_requests FOR INSERT WITH CHECK (auth.uid() = user_id OR (auth.uid() IS NULL AND user_id IS NULL));
DROP POLICY IF EXISTS payment_requests_admin_update ON public.payment_requests;
CREATE POLICY payment_requests_admin_update ON public.payment_requests FOR UPDATE USING (public.is_admin());

INSERT INTO public.subscription_plans (id, name, description, price_npr, duration_days, features)
VALUES
  ('monthly', 'Monthly Clinical', 'Access to the pediatric clinical workspace for one month.', 200, 30, '["Clinical tools", "Growth and immunization workspace", "Guideline-linked pathways"]'),
  ('yearly', 'Yearly Clinical', 'Full access for one year with priority content updates.', 2000, 365, '["Everything in Monthly", "Expanded disease library", "POCUS documentation workspace"]')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price_npr = EXCLUDED.price_npr, duration_days = EXCLUDED.duration_days, features = EXCLUDED.features;

CREATE OR REPLACE FUNCTION public.activate_subscription_from_payment(p_payment_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE payment_row public.payment_requests; plan_row public.subscription_plans; ends_at TIMESTAMPTZ;
BEGIN
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('error', 'Admin access required'); END IF;
  SELECT * INTO payment_row FROM public.payment_requests WHERE id = p_payment_id FOR UPDATE;
  IF NOT FOUND OR payment_row.status NOT IN ('submitted','under_review','paid') THEN RETURN jsonb_build_object('error', 'Payment request is not activatable'); END IF;
  SELECT * INTO plan_row FROM public.subscription_plans WHERE id = payment_row.plan_id AND active = true;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Plan not found'); END IF;
  ends_at := now() + make_interval(days => plan_row.duration_days);
  INSERT INTO public.subscriptions (user_id, plan_id, status, starts_at, ends_at, provider)
    VALUES (payment_row.user_id, plan_row.id, 'active', now(), ends_at, payment_row.provider);
  UPDATE public.payment_requests SET status = 'paid', reviewed_at = now(), reviewed_by = auth.uid() WHERE id = p_payment_id;
  RETURN jsonb_build_object('success', true, 'ends_at', ends_at, 'plan_id', plan_row.id);
END;
$$;
