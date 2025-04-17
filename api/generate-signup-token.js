import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    // Handle both GET and POST requests
    let email, password, firstName, lastName;

    if (req.method === 'GET') {
      // Handle GET request with email as query parameter
      email = req.query.email;

      if (!email) {
        return res.status(400).json({ error: 'Missing email parameter' });
      }

      // For GET requests, we only generate a token for an existing user
    } else {
      // Handle POST request with full user data in body
      ({ email, password, firstName, lastName } = JSON.parse(req.body || '{}'));

      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Create user with metadata and email unconfirmed
      const { error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: {
          first_name: firstName,
          last_name: lastName
        },
        email_confirm: false
      });

      // Allow "already registered" so user can retry safely
      if (createError && !createError.message.includes('already registered')) {
        console.error('Create user error:', createError);
        return res.status(500).json({ error: createError.message });
      }
    }

    // Generate confirmation link for both GET and POST requests
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        shouldSendEmail: false,
        emailRedirectTo: 'https://subletnu.vercel.app/confirm'
      }
    });

    if (linkError) {
      console.error('Generate link error:', linkError);
      return res.status(500).json({ error: linkError.message });
    }

    const actionLink = data?.action_link;
    const token = actionLink?.split('token=')[1]?.split('&')[0];

    if (!token) {
      return res.status(500).json({ error: 'Failed to extract token from link' });
    }

    return res.status(200).json({
      token,
      type: 'signup',
      email
    });
  } catch (err) {
    console.error('Signup endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
