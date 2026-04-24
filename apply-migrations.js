/**
 * Apply SQL migrations to Supabase
 * Run with: node --env-file=.env.local apply-migrations.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration(filename) {
  console.log(`\nApplying migration: ${filename}`);

  const filePath = path.join(__dirname, 'supabase', 'migrations', filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  // Split by statement (basic splitting on semicolons)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    if (!statement) continue;

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: statement + ';' });

      if (error) {
        // Try direct execution if RPC doesn't exist
        console.log(`  Statement ${i + 1}: Need to apply manually via Supabase dashboard`);
        console.log(`  Error: ${error.message}`);
      } else {
        console.log(`  ✓ Statement ${i + 1} applied`);
      }
    } catch (err) {
      console.log(`  Statement ${i + 1}: ${err.message}`);
    }
  }

  console.log(`\nMigration ${filename} needs manual application.`);
  console.log('Copy the SQL from the migration file and run it in Supabase SQL Editor:');
  console.log(`  https://supabase.com/dashboard/project/_/sql/new`);
  console.log(`\nFile: ${filePath}`);
}

// Apply the invite codes migration
applyMigration('003_add_team_invites.sql');
