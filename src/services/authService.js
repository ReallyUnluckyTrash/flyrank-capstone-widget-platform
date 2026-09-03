import { createClient } from '@supabase/supabase-js';
import { pool } from './databaseService.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

export function createAccount(credentials) {
  return supabase.auth.signUp(credentials);
}

export function signIn(credentials) {
  return supabase.auth.signInWithPassword(credentials);
}

export async function getUser(accessToken) {
  const { data, error } = await supabase.auth.getUser(accessToken);
  return { user: data.user, error };
}

export async function upsertTenant(user, companyName = null) {
  await pool.query(
    `INSERT INTO tenants (id, email, company_name)
     VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET
       email = EXCLUDED.email,
       company_name = COALESCE(EXCLUDED.company_name, tenants.company_name),
       updated_at = NOW()`,
    [user.id, user.email, companyName],
  );
}