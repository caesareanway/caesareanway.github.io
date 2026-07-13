const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

const headers = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: 'Method Not Allowed' };
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase env vars');
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server misconfigured' })
    };
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  try {
    const { email, source } = JSON.parse(event.body || '{}');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ success: false, error: 'Invalid email' })
      };
    }

    const normalizedEmail = email.toLowerCase();

    // Upsert — silently handles duplicate emails (SELECT is blocked for anon by RLS)
    const { error } = await supabase
      .from('email_signups')
      .upsert({ email: normalizedEmail, source: source || 'music_page' }, { onConflict: 'email', ignoreDuplicates: true });

    if (error) {
      console.error('Supabase insert error:', JSON.stringify(error));
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ success: false, error: 'Signup failed', detail: error.message })
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Subscribed!' })
    };
  } catch (err) {
    console.error('Unexpected error:', err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
};
