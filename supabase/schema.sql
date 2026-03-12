-- ============================================
-- Corporate Card Booking System - Schema (with Password Auth)
-- Run this in Supabase SQL Editor
-- ============================================

-- 0. Cleanup old triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 1. Profiles table (with password_hash)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL DEFAULT '',
    department TEXT NOT NULL DEFAULT '',
    contact_no TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user', 'manager')),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Projects table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_name TEXT NOT NULL,
    total_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
    remaining_budget NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_by UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Requests table
CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    user_id UUID NOT NULL REFERENCES profiles(id),
    project_id UUID REFERENCES projects(id),
    project_name TEXT NOT NULL DEFAULT '',
    amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    objective TEXT NOT NULL DEFAULT '',
    contact_no TEXT DEFAULT '',
    email TEXT DEFAULT '',
    billing_type TEXT NOT NULL DEFAULT 'ONE_TIME' CHECK (billing_type IN ('ONE_TIME', 'MONTHLY', 'YEARLY', 'YEARLY_MONTHLY')),
    start_date DATE,
    end_date DATE,
    booking_date DATE,
    effective_date DATE,
    status TEXT NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
    promotional_channels JSONB DEFAULT '[]',
    pdf_url TEXT,
    approval_file_url TEXT,
    approval_notes TEXT DEFAULT '',
    approval_token TEXT UNIQUE,
    approval_token_expiry TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3b. Hosting Allocations
CREATE TABLE IF NOT EXISTS hosting_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hosting_name TEXT NOT NULL,
    provider TEXT DEFAULT '',
    max_sites INT NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hosting_sites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hosting_id UUID NOT NULL REFERENCES hosting_allocations(id) ON DELETE CASCADE,
    request_id UUID REFERENCES requests(id) ON DELETE SET NULL,
    domain_name TEXT NOT NULL,
    is_subdomain BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Request Payments
CREATE TABLE IF NOT EXISTS request_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    amount_due NUMERIC(12,2) NOT NULL DEFAULT 0,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'OVERDUE')),
    payment_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Receipts table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    month_year TEXT NOT NULL,
    receipt_file_url TEXT NOT NULL,
    storage_path TEXT,
    status TEXT NOT NULL DEFAULT 'UPLOADED' CHECK (status IN ('UPLOADED', 'VERIFIED')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Audit Logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    action TEXT NOT NULL,
    user_id UUID REFERENCES profiles(id),
    user_name TEXT DEFAULT '',
    changes JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. OTP Codes table
CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. App Settings table (for email config etc)
CREATE TABLE IF NOT EXISTS app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS for dev
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE request_payments DISABLE ROW LEVEL SECURITY;
ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE hosting_allocations DISABLE ROW LEVEL SECURITY;
ALTER TABLE hosting_sites DISABLE ROW LEVEL SECURITY;
ALTER TABLE otp_codes DISABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- Triggers
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at_profiles ON profiles;
CREATE TRIGGER set_updated_at_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_projects ON projects;
CREATE TRIGGER set_updated_at_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_requests ON requests;
CREATE TRIGGER set_updated_at_requests BEFORE UPDATE ON requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at_receipts ON receipts;
CREATE TRIGGER set_updated_at_receipts BEFORE UPDATE ON receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- App Settings (Global Application Settings)
CREATE TABLE IF NOT EXISTS public.app_settings (
    key text PRIMARY KEY,
    value text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS for app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Everyone can read settings
CREATE POLICY "Public read access for app_settings" ON public.app_settings
    FOR SELECT USING (true);

-- Only admins/managers can update settings if needed (you can restrict this further)
CREATE POLICY "Public update access for app_settings" ON public.app_settings
    FOR UPDATE USING (true);

CREATE POLICY "Public insert access for app_settings" ON public.app_settings
    FOR INSERT WITH CHECK (true);

-- Base Data
INSERT INTO public.app_settings (key, value, description)
VALUES ('MANAGER_EMAIL', 'manager@company.com', 'The default email address for manager approval notifications')
ON CONFLICT (key) DO NOTHING;

DROP TRIGGER IF EXISTS set_updated_at_app_settings ON app_settings;
CREATE TRIGGER set_updated_at_app_settings BEFORE UPDATE ON app_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
