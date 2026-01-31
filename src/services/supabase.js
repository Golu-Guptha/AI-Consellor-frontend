import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo-key';

// Check if credentials are properly configured (not placeholder values)
const isConfigured = supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes('your_') &&
    !supabaseAnonKey.includes('your_') &&
    supabaseUrl !== 'https://demo.supabase.co';

if (!isConfigured) {
    console.warn('⚠️  Supabase not configured. Auth features will not work. Please set environment variables in .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const isSupabaseConfigured = isConfigured;
