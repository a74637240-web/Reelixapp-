import { createClient } from '@supabase/supabase-js';

const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || 'https://qsporshyjjbaepgsdljo.supabase.co';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_tEeQGCKCL8TfbSI-WXImVw_xpAVO8kO';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

