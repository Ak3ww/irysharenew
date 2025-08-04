-- ========================================
-- EXPORT CURRENT DATABASE SCHEMA
-- Run this in Supabase SQL Editor to see your current structure
-- ========================================

-- ========================================
-- 1. SHOW ALL TABLES
-- ========================================

SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- ========================================
-- 2. SHOW TABLE STRUCTURES
-- ========================================

-- Show files table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'files'
ORDER BY ordinal_position;

-- Show file_shares_new table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'file_shares_new'
ORDER BY ordinal_position;

-- Show usernames table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'usernames'
ORDER BY ordinal_position;

-- Show user_storage table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default,
    character_maximum_length
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'user_storage'
ORDER BY ordinal_position;

-- ========================================
-- 3. SHOW CONSTRAINTS
-- ========================================

-- Show all constraints for files table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'files'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Show all constraints for file_shares_new table
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu 
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public' 
AND tc.table_name = 'file_shares_new'
ORDER BY tc.constraint_type, tc.constraint_name;

-- ========================================
-- 4. SHOW INDEXES
-- ========================================

-- Show all indexes for files table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'files'
ORDER BY indexname;

-- Show all indexes for file_shares_new table
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename = 'file_shares_new'
ORDER BY indexname;

-- ========================================
-- 5. SHOW RLS POLICIES
-- ========================================

-- Show RLS policies for files table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'files'
ORDER BY policyname;

-- Show RLS policies for file_shares_new table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'file_shares_new'
ORDER BY policyname;

-- ========================================
-- 6. SHOW FUNCTIONS
-- ========================================

-- Show all functions in public schema
SELECT 
    p.proname as function_name,
    pg_get_function_arguments(p.oid) as arguments,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;

-- ========================================
-- 7. SHOW TRIGGERS
-- ========================================

-- Show all triggers
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers 
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ========================================
-- 8. SAMPLE DATA (FIRST 5 ROWS)
-- ========================================

-- Sample data from files table
SELECT * FROM public.files LIMIT 5;

-- Sample data from file_shares_new table
SELECT * FROM public.file_shares_new LIMIT 5;

-- Sample data from usernames table
SELECT * FROM public.usernames LIMIT 5;

-- Sample data from user_storage table
SELECT * FROM public.user_storage LIMIT 5; 