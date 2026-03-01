import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// In production, use the Vercel proxy to bypass ISP blocks on supabase.co in India
const isProduction = import.meta.env.PROD;
const supabaseUrl = isProduction
    ? `${window.location.origin}/supabase-proxy`
    : rawSupabaseUrl;

// Check if credentials are properly configured (not placeholder values)
const isConfigured = rawSupabaseUrl &&
    supabaseAnonKey &&
    !rawSupabaseUrl.includes('your_') &&
    !supabaseAnonKey.includes('your_') &&
    rawSupabaseUrl !== 'https://demo.supabase.co';

if (!isConfigured) {
    console.warn('⚠️  Supabase not configured. Auth features will not work. Please set environment variables in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = isConfigured;
