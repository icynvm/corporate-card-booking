-- ========================================================
-- ADVANCED MOCK DATA SEED SCRIPT (Phase 8)
-- ========================================================
-- PURPOSE: Populates your Dashboard with realistic data
-- 
-- REQUIRES: ONE user in 'profiles' table. 
-- TIP: Click [Quick Admin Login] on your Login page first!
-- ========================================================

DO $$
DECLARE
    v_user_id UUID;
    v_proj_fb UUID := gen_random_uuid();
    v_proj_google UUID := gen_random_uuid();
    v_proj_events UUID := gen_random_uuid();
    v_req_1 UUID := gen_random_uuid();
    v_req_2 UUID := gen_random_uuid();
    v_req_3 UUID := gen_random_uuid();
    v_req_4 UUID := gen_random_uuid();
    v_req_5 UUID := gen_random_uuid();
BEGIN
    -- 1. Get the admin user we just created
    SELECT id INTO v_user_id FROM public.profiles WHERE email = 'admin@company.com' LIMIT 1;
    
    -- Fallback if admin@company.com not found, just take any user
    IF v_user_id IS NULL THEN
        SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    END IF;

    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Please click QUICK ADMIN LOGIN on the website before running this script!';
        RETURN;
    END IF;

    -- 2. Clear existing (Optional - uncomment if you want a clean start)
    -- DELETE FROM public.audit_logs;
    -- DELETE FROM public.receipts;
    -- DELETE FROM public.request_payments;
    -- DELETE FROM public.requests;
    -- DELETE FROM public.projects;

    -- 3. Mock Projects
    INSERT INTO public.projects (id, project_name, total_budget, remaining_budget, created_by)
    VALUES 
        (v_proj_fb, 'Facebook Marketing 2024', 1000000.00, 850000.00, v_user_id),
        (v_proj_google, 'Google SEM Campaign', 500000.00, 480000.00, v_user_id),
        (v_proj_events, 'Impact Arena Event Q4', 2500000.00, 2500000.00, v_user_id);

    -- 4. Mock Requests
    
    -- Request 1: Completed Facebook Ads
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date, promotional_channels)
    VALUES (v_req_1, 'REQ-2024-0001', v_user_id, v_proj_fb, 'Facebook Marketing 2024', 'Brand Awareness Video Ads', 50000.00, 'ONE_TIME', 'COMPLETED', '2024-01-01', '2024-01-31', 
    '[{"channel": "Facebook", "mediaAccountEmail": "social@impact.co.th", "accessList": "Admin, MarketingTeam"}]'::jsonb);

    -- Request 2: Approved Monthly Google Ads
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date, promotional_channels)
    VALUES (v_req_2, 'REQ-2024-0002', v_user_id, v_proj_google, 'Google SEM Campaign', 'Search Term Optimization', 20000.00, 'MONTHLY', 'APPROVED', '2024-02-01', '2024-12-31', 
    '[{"channel": "Google", "mediaAccountEmail": "sem@impact.co.th", "accessList": "AdsManager"}]'::jsonb);

    -- Request 3: Pending Yearly Subscription (Server)
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date)
    VALUES (v_req_3, 'REQ-2024-0003', v_user_id, v_proj_events, 'Impact Arena Event Q4', 'AWS Cloud Server Subscription', 120000.00, 'YEARLY_MONTHLY', 'PENDING', '2024-03-01', '2025-02-28');

    -- Request 4: Rejected Budget Request
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date)
    VALUES (v_req_4, 'REQ-2024-0004', v_user_id, v_proj_fb, 'Facebook Marketing 2024', 'Experimental TikTok Ads', 150000.00, 'ONE_TIME', 'REJECTED', '2024-03-15', '2024-04-15');

    -- Request 5: Approved One-time Event Deposit
    INSERT INTO public.requests (id, event_id, user_id, project_id, project_name, objective, amount, billing_type, status, start_date, end_date)
    VALUES (v_req_5, 'REQ-2024-0005', v_user_id, v_proj_events, 'Impact Arena Event Q4', 'Venue Decoration Deposit', 300000.00, 'ONE_TIME', 'APPROVED', '2024-10-01', '2024-10-05');

    -- 5. Mock Payments for Yearly Request (REQ-0003)
    INSERT INTO public.request_payments (request_id, month_year, amount_due, status)
    VALUES 
        (v_req_3, '2024-03', 10000.00, 'PENDING'),
        (v_req_3, '2024-04', 10000.00, 'PENDING'),
        (v_req_3, '2024-05', 10000.00, 'PENDING');

    -- 6. Mock Receipts
    INSERT INTO public.receipts (request_id, month_year, receipt_file_url, status)
    VALUES 
        (v_req_1, '2024-01', 'https://placeholder.com/receipt1.pdf', 'VERIFIED'),
        (v_req_2, '2024-02', 'https://placeholder.com/receipt2.pdf', 'UPLOADED');

    -- 7. Audit Logs
    INSERT INTO public.audit_logs (entity_type, entity_id, action, user_id, user_name, details)
    VALUES 
        ('REQUEST', v_req_1, 'CREATE', v_user_id, 'System Admin', '{"amount": 50000}'),
        ('REQUEST', v_req_1, 'APPROVE', v_user_id, 'System Admin', '{"note": "Approved by board"}'),
        ('REQUEST', v_req_1, 'COMPLETED', v_user_id, 'System Admin', '{"note": "Campaign finished"}'),
        ('REQUEST', v_req_2, 'CREATE', v_user_id, 'System Admin', '{"amount": 20000, "type": "MONTHLY"}'),
        ('RECEIPT', v_req_2, 'UPLOAD', v_user_id, 'System Admin', '{"month": "2024-02"}');

    RAISE NOTICE 'Mock data successfully inserted!';
END $$;
