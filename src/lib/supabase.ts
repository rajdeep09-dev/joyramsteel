import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://aqvjobantuhkubkditos.supabase.co';
const supabaseAnonKey = 'sb_publishable_EMayzlhcoa6zU3-xz9iF1Q_mM1AYXu5';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);