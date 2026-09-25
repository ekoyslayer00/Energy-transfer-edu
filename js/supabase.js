import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabaseUrl = 'https://svstlntiklpekqlajsyd.supabase.co';
const supabaseAnonKey = 'sb_publishable_wnHhvSopPALjQ8ELIquRXg_da3cqhUb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);