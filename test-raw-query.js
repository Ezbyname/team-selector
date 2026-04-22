import pg from 'pg';

const connectionString = process.env.SUPABASE_DB_URL;

if (!connectionString) {
  console.log('ERROR: SUPABASE_DB_URL not set in .env.local');
  console.log('This direct database connection URL is needed to bypass PostgREST.');
  process.exit(1);
}

const client = new pg.Client({ connectionString });

try {
  await client.connect();
  console.log('Connected to database directly');

  // Check if game_sessions table exists
  const tableCheck = await client.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'game_sessions'
    ORDER BY ordinal_position;
  `);

  if (tableCheck.rows.length === 0) {
    console.log('✗ game_sessions table does NOT exist in database');
  } else {
    console.log('✓ game_sessions table exists with columns:');
    tableCheck.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
  }

  await client.end();
} catch (error) {
  console.log('Error:', error.message);
  process.exit(1);
}
