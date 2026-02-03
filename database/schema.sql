-- ============================================================================
-- LEAK DETECTOR - Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLE: profiles
-- Extension de auth.users avec données métier
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    
    -- Plan & Billing
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'agency')),
    stripe_customer_id TEXT UNIQUE,
    
    -- Quotas
    analyses_used INTEGER NOT NULL DEFAULT 0,
    analyses_limit INTEGER NOT NULL DEFAULT 3,
    analyses_reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan ON profiles(plan);


-- ============================================
-- TABLE: analyses
-- Requêtes d'analyse soumises par les users
-- ============================================
CREATE TABLE IF NOT EXISTS public.analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Input
    url TEXT NOT NULL,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    error_code TEXT,
    error_message TEXT,
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Index
CREATE INDEX IF NOT EXISTS idx_analyses_user_id ON analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_analyses_status ON analyses(status);
CREATE INDEX IF NOT EXISTS idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analyses_user_status ON analyses(user_id, status);


-- ============================================
-- TABLE: reports
-- Résultats d'analyse générés par l'IA
-- ============================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    analysis_id UUID NOT NULL UNIQUE REFERENCES analyses(id) ON DELETE CASCADE,
    
    -- Scores
    score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
    summary TEXT NOT NULL,
    
    -- Detailed results (JSONB)
    categories JSONB NOT NULL DEFAULT '[]',
    issues JSONB NOT NULL DEFAULT '[]',
    
    -- Assets
    screenshot_url TEXT,
    
    -- Page metadata
    page_metadata JSONB DEFAULT '{}',
    
    -- Timing
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_reports_analysis_id ON reports(analysis_id);
CREATE INDEX IF NOT EXISTS idx_reports_score ON reports(score);


-- ============================================
-- TABLE: subscriptions
-- Abonnements Stripe
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Stripe IDs
    stripe_subscription_id TEXT NOT NULL UNIQUE,
    stripe_price_id TEXT NOT NULL,
    
    -- Status
    status TEXT NOT NULL CHECK (status IN (
        'active', 'canceled', 'incomplete', 'incomplete_expired',
        'past_due', 'trialing', 'unpaid', 'paused'
    )),
    
    -- Billing period
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at TIMESTAMPTZ,
    canceled_at TIMESTAMPTZ,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);


-- ============================================
-- TABLE: usage_logs
-- Audit trail des actions
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    action TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_action ON usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at DESC);


-- ============================================
-- TRIGGERS
-- ============================================

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- ANALYSES
DROP POLICY IF EXISTS "Users can view own analyses" ON analyses;
CREATE POLICY "Users can view own analyses"
    ON analyses FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own analyses" ON analyses;
CREATE POLICY "Users can create own analyses"
    ON analyses FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- REPORTS
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM analyses
            WHERE analyses.id = reports.analysis_id
            AND analyses.user_id = auth.uid()
        )
    );

-- SUBSCRIPTIONS
DROP POLICY IF EXISTS "Users can view own subscriptions" ON subscriptions;
CREATE POLICY "Users can view own subscriptions"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- USAGE_LOGS
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
CREATE POLICY "Users can view own usage logs"
    ON usage_logs FOR SELECT
    USING (auth.uid() = user_id);


-- ============================================
-- FUNCTIONS
-- ============================================

-- Fonction: Vérifier et décrémenter quota
CREATE OR REPLACE FUNCTION public.use_analysis_quota(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_used INTEGER;
    v_limit INTEGER;
    v_reset_at TIMESTAMPTZ;
BEGIN
    -- Get current quota info
    SELECT analyses_used, analyses_limit, analyses_reset_at
    INTO v_used, v_limit, v_reset_at
    FROM profiles
    WHERE id = p_user_id
    FOR UPDATE;
    
    -- Reset if new month
    IF now() >= v_reset_at THEN
        UPDATE profiles
        SET analyses_used = 0,
            analyses_reset_at = date_trunc('month', now()) + interval '1 month'
        WHERE id = p_user_id;
        v_used := 0;
    END IF;
    
    -- Check quota
    IF v_used >= v_limit THEN
        RETURN FALSE;
    END IF;
    
    -- Increment usage
    UPDATE profiles
    SET analyses_used = analyses_used + 1
    WHERE id = p_user_id;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Incrémenter le compteur d'analyses utilisées
CREATE OR REPLACE FUNCTION public.increment_analyses_used(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE profiles
    SET analyses_used = analyses_used + 1
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction: Upgrade plan
CREATE OR REPLACE FUNCTION public.upgrade_plan(
    p_user_id UUID,
    p_new_plan TEXT,
    p_stripe_customer_id TEXT DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    v_new_limit INTEGER;
BEGIN
    -- Determine new limit
    v_new_limit := CASE p_new_plan
        WHEN 'free' THEN 3
        WHEN 'pro' THEN 50
        WHEN 'agency' THEN 200
        ELSE 3
    END;
    
    -- Update profile
    UPDATE profiles
    SET plan = p_new_plan,
        analyses_limit = v_new_limit,
        stripe_customer_id = COALESCE(p_stripe_customer_id, stripe_customer_id)
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- STORAGE BUCKETS (run separately in Dashboard)
-- ============================================
-- 1. Go to Storage in Supabase Dashboard
-- 2. Create bucket: "screenshots" (public)
-- 3. Create bucket: "exports" (private)
