import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  try {
    // Handle both GET and POST requests
    let email;

    if (req.method === 'GET') {
      // Handle GET request with email as query parameter
      email = req.query.email;

      if (!email) {
        return res.status(400).json({ error: 'Missing email parameter' });
      }
    } else {
      // Handle POST request with full user data in body
      const { email: bodyEmail, password, firstName, lastName } = JSON.parse(req.body || '{}');
      email = bodyEmail;

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
      type: 'magiclink',  // Changed from 'signup' to 'magiclink' since we're just verifying email
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
    let token;
    if (actionLink) {
      try {
        const linkUrl = new URL(actionLink);
        token = linkUrl.searchParams.get('token') || linkUrl.searchParams.get('access_token');
      } catch (err) {
        console.error('Invalid action_link URL:', actionLink, err);
      }
    }

    if (!token) {
      return res.status(500).json({ error: 'Failed to extract token from link' });
    }

    return res.status(200).json({
      token,
      type: req.method === 'GET' ? 'magiclink' : 'signup',
      email
    });
  } catch (err) {
    console.error('Signup endpoint error:', err);
    return res.status(500).json({ error: err.message || 'Unexpected error' });
  }
}
