-- ========================================================
-- TEST USERS SEED SCRIPT (OTP Auth)
-- ========================================================
-- PURPOSE: Populates the database with 3 test users and mock data
-- ========================================================

DO $$
DECLARE
    v_admin_id UUID := gen_random_uuid();
    v_user_id UUID := gen_random_uuid();
    v_manager_id UUID := gen_random_uuid();
    
    v_proj_fb UUID := gen_random_uuid();
    v_proj_google UUID := gen_random_uuid();
    v_proj_events UUID := gen_random_uuid();
    
    v_req_1 UUID := gen_random_uuid();
    v_req_2 UUID := gen_random_uuid();
    v_req_3 UUID := gen_random_uuid();
    v_req_4 UUID := gen_random_uuid();
    v_req_5 UUID := gen_random_uuid();
BEGIN
    -- 1. Create Test Profiles
    -- Admin User (FA Role)
    INSERT INTO public.profiles (id, name, email, department, role)
    VALUES (v_admin_id, 'Admin User', 'admin@company.com', 'Finance Admin', 'FA')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, role = EXCLUDED.role;

    -- Regular User (USER Role)
    INSERT INTO public.profiles (id, name, email, department, role)
    VALUES (v_user_id, 'Somchai K.', 'somchai@company.com', 'Marketing', 'USER')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, role = EXCLUDED.role;

    -- Manager User (MANAGER Role)
    INSERT INTO public.profiles (id, name, email, department, role)
    VALUES (v_manager_id, 'Nittaya P.', 'nittaya@company.com', 'Management', 'MANAGER')
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, department = EXCLUDED.department, role = EXCLUDED.role;

    -- Get actual IDs if they already existed
    SELECT id INTO v_admin_id FROM public.profiles WHERE email = 'admin@company.com';
    SELECT id INTO v_user_id FROM public.profiles WHERE email = 'somchai@company.com';
    SELECT id INTO v_manager_id FROM public.profiles WHERE email = 'nittaya@company.com';

    -- 2. Clean start for data (Optional, un-comment if you want a fresh start)
    -- DELETE FROM public.audit_logs;
    -- DELETE FROM public.receipts;
    -- DELETE FROM public.request_payments;
    -- DELETE FROM public.requests;
    -- DELETE FROM public.projects;

    -- 3. Mock Projects (Owned by Manager)
    INSERT INTO public.projects (id, project_name, total_budget, remaining_budget, created_by)
    VALUES 
        (v_proj_fb, 'Facebook Marketing 2024', 1000000.00, 850000.00, v_manager_id),
        (v_proj_google, 'Google SEM Campaign', 500000.00, 480000.00, v_manager_id),
        (v_proj_events, 'Impact Arena Event Q4', 2500000.00, 2500000.00, v_manager_id)
    ON CONFLICT (id) DO NOTHING;

    -- 4. Mock Requests (Created by User 'somchai')
    -- Completed Facebook Ads
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date, promotional_channels)
    VALUES (v_req_1, 'REQ-2024-0001', v_user_id, v_proj_fb, 'Facebook Marketing 2024', 'Brand Awareness Video Ads', 50000.00, 'ONE_TIME', 'COMPLETED', '2024-01-01', '2024-01-31', 
    '[{"channel": "Facebook", "mediaAccountEmail": "social@impact.co.th", "accessList": "Admin, MarketingTeam"}]'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- Approved Monthly Google Ads
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date, promotional_channels)
    VALUES (v_req_2, 'REQ-2024-0002', v_user_id, v_proj_google, 'Google SEM Campaign', 'Search Term Optimization', 20000.00, 'MONTHLY', 'APPROVED', '2024-02-01', '2024-12-31', 
    '[{"channel": "Google", "mediaAccountEmail": "sem@impact.co.th", "accessList": "AdsManager"}]'::jsonb)
    ON CONFLICT (id) DO NOTHING;

    -- Pending Yearly Subscription (Server) - Created by Manager
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date)
    VALUES (v_req_3, 'REQ-2024-0003', v_manager_id, v_proj_events, 'Impact Arena Event Q4', 'AWS Cloud Server Subscription', 120000.00, 'YEARLY_MONTHLY', 'PENDING', '2024-03-01', '2025-02-28')
    ON CONFLICT (id) DO NOTHING;

    -- 5. Mock Payments
    INSERT INTO public.request_payments (request_id, month_year, amount_due, status)
    VALUES 
        (v_req_3, '2024-03', 10000.00, 'PENDING'),
        (v_req_3, '2024-04', 10000.00, 'PENDING'),
        (v_req_3, '2024-05', 10000.00, 'PENDING')
    ON CONFLICT DO NOTHING;

    -- 6. Audit Logs
    INSERT INTO public.audit_logs (entity_type, entity_id, action, user_id, user_name, changes)
    VALUES 
        ('REQUEST', v_req_1, 'CREATE', v_user_id, 'Somchai K.', '{"amount": 50000}'),
        ('REQUEST', v_req_1, 'APPROVE', v_admin_id, 'Admin User', '{"note": "Approved by board"}'),
        ('REQUEST', v_req_3, 'CREATE', v_manager_id, 'Nittaya P.', '{"amount": 120000}');

    RAISE NOTICE 'Test users and mock data inserted successfully!';
END $$;
