#!/usr/bin/env node

/**
 * Database Migration Script for Tally Finance App
 * Supabase Setup Automation
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Tally Finance - Supabase Migration');
console.log('=====================================\n');

// Check if migrations exist
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
if (!fs.existsSync(migrationsDir)) {
  console.error('❌ Migrations directory not found!');
  process.exit(1);
}

const migrations = fs.readdirSync(migrationsDir)
  .filter(file => file.endsWith('.sql'))
  .sort();

console.log('📦 Found migrations:');
migrations.forEach(file => {
  console.log(`   - ${file}`);
});

console.log('\n📝 Instructions:');
console.log('   1. Create a Supabase project at https://supabase.com');
console.log('   2. Update .env file with your Supabase URL and Key');
console.log('   3. Apply migrations using one of these methods:\n');
console.log('   Method A - Supabase Dashboard (Recommended):');
console.log('      - Go to SQL Editor in Supabase Dashboard');
console.log('      - Copy contents of each migration file');
console.log('      - Paste and run in order\n');
console.log('   Method B - Supabase CLI:');
console.log('      - Install: npm install -g supabase');
console.log('      - Login: supabase login');
console.log('      - Link: supabase link --project-ref YOUR_PROJECT_REF');
console.log('      - Apply: supabase db push\n');

console.log('✅ Migration files are ready!');
console.log('📖 See SUPABASE_SETUP.md for detailed instructions');
