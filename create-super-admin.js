#!/usr/bin/env node
/**
 * Create super admin user directly in database
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcrypt';

const supabaseUrl = 'https://xtregredwnlkuocytmqy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh0cmVncmVkd25sa3VvY3l0bXF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc5Mzg0MiwiZXhwIjoyMDkyMzY5ODQyfQ.HWtkj7FxctY8yXgclBTflxUkSYUEJIXb4nKzlWmzm8c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSuperAdmin() {
  const phone = '+972525502281';
  const displayName = 'Erez (Admin)';
  const password = 'admin123'; // Change this to your preferred password

  console.log(`🔧 Creating super admin user...`);
  console.log(`   Phone: ${phone}`);
  console.log(`   Name: ${displayName}`);
  console.log(`   Password: ${password}`);
  console.log('');

  // Check if user already exists
  const { data: existing, error: checkError } = await supabase
    .from('auth_users')
    .select('*')
    .eq('phone', phone);

  if (checkError) {
    console.error('❌ Error checking for existing user:', checkError);
    process.exit(1);
  }

  if (existing && existing.length > 0) {
    console.log('⚠️  User already exists!');
    console.log(`   ID: ${existing[0].id}`);
    console.log(`   Current Role: ${existing[0].role || 'user'}`);
    console.log('');
    console.log('💡 Use check-and-promote-admin.js to promote existing user');
    process.exit(0);
  }

  // Hash password
  const password_hash = await bcrypt.hash(password, 12);

  // Normalize phone (already in E.164 format)
  const phone_normalized = phone;

  // Create user
  // NOTE: displayName is stored in phone field (see api/auth/register.js line 82)
  const { data: newUser, error: createError } = await supabase
    .from('auth_users')
    .insert({
      phone: displayName,  // displayName goes in phone field
      phone_normalized,    // actual phone goes here
      password_hash,
      role: 'admin',
      phone_verified_at: new Date().toISOString()
    })
    .select();

  if (createError) {
    console.error('❌ Error creating user:', createError);
    process.exit(1);
  }

  console.log('✅ Super admin created successfully!');
  console.log('');
  console.log('📋 User Details:');
  console.log(`   ID: ${newUser[0].id}`);
  console.log(`   Phone: ${newUser[0].phone}`);
  console.log(`   Name: ${newUser[0].displayName}`);
  console.log(`   Role: ${newUser[0].role}`);
  console.log('');
  console.log('🔐 Login credentials:');
  console.log(`   Phone: ${phone.replace('+972', '0')}`);
  console.log(`   Password: ${password}`);
  console.log('');
  console.log('🚀 You can now login at: http://localhost:3006/index.html');
}

createSuperAdmin().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
