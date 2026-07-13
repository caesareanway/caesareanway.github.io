const { createClient } = require('@supabase/supabase-js');

// Scheduled function — runs every 6 days via netlify.toml
// Purpose: keeps the Supabase free-tier project from auto-pausing (7-day inactivity threshold)
exports.handler = async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

  const { error } = await supabase
    .from('email_signups')
    .select('id')
    .limit(1);

  if (error) {
    console.error('Keep-alive ping failed:', error.message);
    return { statusCode: 500, body: 'ping failed' };
  }

  console.log('Supabase keep-alive ping OK —', new Date().toISOString());
  return { statusCode: 200, body: 'ok' };
};
