import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://vxtfqgcybzsntegtvwfk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ4dGZxZ2N5YnpzbnRlZ3R2d2ZrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM3ODMyNDMsImV4cCI6MjA3OTM1OTI0M30.3UmZuiEGLN16_uY3T7vaLc9HFENI-6pvnpEhwmqRkwc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
