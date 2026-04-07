const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://hgrhtrwgrauwjguahvjv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhncmh0cndncmF1d2pndWFodmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUyNzk4MDgsImV4cCI6MjA5MDg1NTgwOH0.0ywVMVVYqwQxehNDFRsPs2PYRVBrndZxz6ZnYl6g1b0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

exports.handler = async (event) => {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { email, source } = JSON.parse(event.body || '{}');

    // Validate email
    if (!email || !email.includes('@')) {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Invalid email' })
      };
    }

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('email_signups')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existing) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true, message: 'Already subscribed' })
      };
    }

    // Insert new signup
    const { error } = await supabase
      .from('email_signups')
      .insert({
        email: email.toLowerCase(),
        source: source || 'music_page',
        subscribed: true
      });

    if (error) {
      console.error('Signup error:', error);
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, error: 'Signup failed' })
      };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, message: 'Subscribed!' })
    };
  } catch (err) {
    console.error('Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, error: 'Server error' })
    };
  }
};
