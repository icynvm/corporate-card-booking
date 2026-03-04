-- ========================================================
-- SAMPLE DATA SEED SCRIPT FOR CORPORATE CARD BOOKING APP
-- ========================================================
-- IMPORTANT INSTRUCTION:
-- Before running this script, please create at least ONE user account 
-- via your app's /register page.
-- This script will automatically grab the FIRST user in your database 
-- and assign all these sample projects and requests to them!

DO $$
DECLARE
    v_user_id UUID;
    v_project_id_1 UUID := gen_random_uuid();
    v_project_id_2 UUID := gen_random_uuid();
    v_request_id_1 UUID := gen_random_uuid();
    v_request_id_2 UUID := gen_random_uuid();
    v_request_id_3 UUID := gen_random_uuid();
BEGIN
    -- 1. Get the first available user ID
    SELECT id INTO v_user_id FROM public.profiles LIMIT 1;
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'No users found! Please register a user in your Next.js app first.';
    END IF;

    -- 2. Insert Sample Projects
    INSERT INTO public.projects (id, project_name, budget, remaining_budget, created_by)
    VALUES 
        (v_project_id_1, 'Digital Marketing Q3', 500000.00, 350000.00, v_user_id),
        (v_project_id_2, 'Annual Expo Event', 1200000.00, 1200000.00, v_user_id)
    ON CONFLICT DO NOTHING;

    -- 3. Insert Sample Requests
    INSERT INTO public.requests (id, event_id, user_id, project_name, objective, booking_date, start_date, end_date, amount, billing_type, status, promotional_channels)
    VALUES 
        -- A Completed One-time Request
        (v_request_id_1, 'REQ-2023-0001', v_user_id, 'Digital Marketing Q3', 'Facebook Ads for Summer Campaign', '2023-06-01', '2023-06-05', '2023-06-30', 25000.00, 'ONE_TIME', 'COMPLETED', 
         '[{"channel": "Facebook", "mediaAccountEmail": "marketing@company.com", "accessList": "John, Jane"}]'::jsonb),
         
        -- An Approved Monthly Request
        (v_request_id_2, 'REQ-2023-0002', v_user_id, 'Digital Marketing Q3', 'Google Search Ads Ongoing', '2023-07-01', '2023-07-15', '2024-07-15', 5000.00, 'MONTHLY', 'APPROVED', 
         '[{"channel": "Google", "mediaAccountEmail": "ads@company.com", "accessList": "Jane Doe"}]'::jsonb),
         
        -- A Pending Yearly (Monthly payment) Request
        (v_request_id_3, 'REQ-2023-0003', v_user_id, 'Annual Expo Event', 'Cloud Server Hosting Subscription', '2023-08-10', '2023-09-01', '2024-08-31', 120000.00, 'YEARLY_MONTHLY', 'PENDING', 
         '[]'::jsonb)
    ON CONFLICT DO NOTHING;

    -- 4. Insert Sample Request Payments (for the Yearly_Monthly type)
    INSERT INTO public.request_payments (request_id, amount, status, due_date)
    VALUES 
        (v_request_id_3, 10000.00, 'PENDING', '2023-09-01'),
        (v_request_id_3, 10000.00, 'PENDING', '2023-10-01'),
        (v_request_id_3, 10000.00, 'PENDING', '2023-11-01')
    ON CONFLICT DO NOTHING;

    -- 5. Insert Sample Receipts (for the Monthly request)
    INSERT INTO public.receipts (request_id, month_year, file_url, status)
    VALUES 
        (v_request_id_2, '2023-07', 'https://example.com/receipt-july.pdf', 'VERIFIED'),
        (v_request_id_2, '2023-08', 'https://example.com/receipt-aug.pdf', 'PENDING')
    ON CONFLICT DO NOTHING;

    -- 6. Insert Sample Audit Logs
    INSERT INTO public.audit_logs (entity_type, entity_id, action, user_id, details)
    VALUES 
        ('REQUEST', v_request_id_1, 'CREATE', v_user_id, '{"amount": 25000, "objective": "Facebook Ads for Summer Campaign"}'),
        ('REQUEST', v_request_id_1, 'APPROVE', v_user_id, '{"notes": "Approved by FA."}'),
        ('PROJECT', v_project_id_1, 'CREATE', v_user_id, '{"budget": 500000}'),
        ('RECEIPT', v_request_id_2, 'UPLOAD', v_user_id, '{"month_year": "2023-07"}'),
        ('RECEIPT', v_request_id_2, 'VERIFY', v_user_id, '{"status": "VERIFIED"}')
    ON CONFLICT DO NOTHING;

END $$;
