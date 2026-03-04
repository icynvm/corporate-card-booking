-- ========================================================
-- TEST USERS SEED SCRIPT (Password Auth + Roles)
-- ========================================================
-- Default password for all test users: password123
-- ========================================================

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_user_id UUID := gen_random_uuid();
    v_manager_id UUID := gen_random_uuid();
    v_pw_hash TEXT := 'c468216a2dabfeaffca9302fe66589187c9856d4d17c741e61dfa781b454ee39';
    
    v_proj_fb UUID := gen_random_uuid();
    v_proj_google UUID := gen_random_uuid();
    v_proj_events UUID := gen_random_uuid();
    
    v_req_1 UUID := gen_random_uuid();
    v_req_2 UUID := gen_random_uuid();
    v_req_3 UUID := gen_random_uuid();
BEGIN
    -- 1. Create Test Profiles (password: password123)
    INSERT INTO public.profiles (id, name, email, password_hash, department, role, email_verified)
    VALUES (v_admin_id, 'Admin User', 'admin@company.com', v_pw_hash, 'Finance Admin', 'admin', TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, email_verified = TRUE;

    INSERT INTO public.profiles (id, name, email, password_hash, department, role, email_verified)
    VALUES (v_user_id, 'Somchai K.', 'somchai@company.com', v_pw_hash, 'Marketing', 'user', TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, email_verified = TRUE;

    INSERT INTO public.profiles (id, name, email, password_hash, department, role, email_verified)
    VALUES (v_manager_id, 'Nittaya P.', 'nittaya@company.com', v_pw_hash, 'Management', 'manager', TRUE)
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, role = EXCLUDED.role, password_hash = EXCLUDED.password_hash, email_verified = TRUE;

    SELECT id INTO v_admin_id FROM public.profiles WHERE email = 'admin@company.com';
    SELECT id INTO v_user_id FROM public.profiles WHERE email = 'somchai@company.com';
    SELECT id INTO v_manager_id FROM public.profiles WHERE email = 'nittaya@company.com';

    -- 2. Mock Projects
    INSERT INTO public.projects (id, project_name, total_budget, remaining_budget, created_by)
    VALUES 
        (v_proj_fb, 'Facebook Marketing 2024', 1000000.00, 850000.00, v_manager_id),
        (v_proj_google, 'Google SEM Campaign', 500000.00, 480000.00, v_manager_id),
        (v_proj_events, 'Impact Arena Event Q4', 2500000.00, 2500000.00, v_manager_id)
    ON CONFLICT (id) DO NOTHING;

    -- 3. Mock Requests
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date, promotional_channels)
    VALUES (v_req_1, 'REQ-2024-0001', v_user_id, v_proj_fb, 'Facebook Marketing 2024', 'Brand Awareness Video Ads', 50000.00, 'ONE_TIME', 'COMPLETED', '2024-01-01', '2024-01-31', 
    '[{"channel": "Facebook", "mediaAccountEmail": "social@impact.co.th", "accessList": "Admin, MarketingTeam"}]'::jsonb)
    ON CONFLICT (event_id) DO NOTHING;

    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date, promotional_channels)
    VALUES (v_req_2, 'REQ-2024-0002', v_user_id, v_proj_google, 'Google SEM Campaign', 'Search Term Optimization', 20000.00, 'MONTHLY', 'APPROVED', '2024-02-01', '2024-12-31', 
    '[{"channel": "Google", "mediaAccountEmail": "sem@impact.co.th", "accessList": "AdsManager"}]'::jsonb)
    ON CONFLICT (event_id) DO NOTHING;

    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date)
    VALUES (v_req_3, 'REQ-2024-0003', v_manager_id, v_proj_events, 'Impact Arena Event Q4', 'AWS Cloud Server Subscription', 120000.00, 'YEARLY_MONTHLY', 'PENDING', '2024-03-01', '2025-02-28')
    ON CONFLICT (event_id) DO NOTHING;

    -- 4. Audit Logs
    INSERT INTO public.audit_logs (entity_type, entity_id, action, user_id, user_name, changes)
    VALUES 
        ('REQUEST', v_req_1::text, 'CREATE', v_user_id, 'Somchai K.', '{"amount": 50000}'),
        ('REQUEST', v_req_1::text, 'APPROVE', v_admin_id, 'Admin User', '{"note": "Approved by board"}'),
        ('REQUEST', v_req_3::text, 'CREATE', v_manager_id, 'Nittaya P.', '{"amount": 120000}');

    RAISE NOTICE 'Test users and mock data inserted successfully!';
    RAISE NOTICE 'Login credentials: admin@company.com / somchai@company.com / nittaya@company.com  Password: password123';
END $$;
