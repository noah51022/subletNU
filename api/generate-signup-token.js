import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin client with the service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req, res) {
  // Validate environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const method = req.method
  let email = ''

  if (method === 'GET') {
    // Confirmation flow: Find user and mark email as confirmed
    email = req.query.email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'An email address is required' })
    }
    email = email.trim()

    try {
      // Find the user by email
      const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers({ email });
      if (listError) throw listError;
      if (!users || users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];
      let userJustConfirmed = false;

      // Check if email needs confirmation
      if (!user.email_confirmed_at) {
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        if (updateError) throw updateError;
        userJustConfirmed = true;
      }

      return res.status(200).json({
        message: userJustConfirmed ? 'Email successfully confirmed. Please log in.' : 'Email already confirmed. Please log in.',
        email: user.email
        // No token returned
      });

    } catch (error) {
      // Provide a more specific error message if possible
      const errorMessage = error instanceof Error ? error.message : 'Internal server error during email confirmation';
      // Determine appropriate status code based on error type if needed
      const statusCode = error.message?.includes('User not found') ? 404 : 500;
      return res.status(statusCode).json({ error: errorMessage });
    }

  } else if (method === 'POST') {
    // Signup flow: create user (unconfirmed)
    const { firstName, lastName, email: bodyEmail, password } = JSON.parse(req.body || '{}')
    email = bodyEmail
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }

    // Create user unconfirmed
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name: firstName, last_name: lastName },
      email_confirm: false,
    })

    if (createError) { // Don't need to check for 'already registered' here if listUsers above handles it
      return res.status(500).json({ error: createError.message })
    }

    // We just need to return success after creating the user
    return res.status(200).json({
      message: 'User created successfully. Please check your email to confirm.',
      email
      // No token or confirmUrl needed here anymore
    });

  } else {
    return res.status(405).json({ error: 'Only GET and POST allowed' })
  }
}
