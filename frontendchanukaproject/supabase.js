import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://altpysjlcjifckilnomq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_kpkKcjiQck7a3hNzqxJtmw_dFJOAV-8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);