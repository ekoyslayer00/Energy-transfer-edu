// js/supabase.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// 1. Replace these with your actual Supabase project credentials
const supabaseUrl = 'https://supabase.com/dashboard/project/svstlntiklpekqlajsyd';
const supabaseAnonKey = 'sb_publishable_wnHhvSopPALjQ8ELIquRXg_da3cqhUb';

// 2. Initialize and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);