import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin client with the service role key
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
)

export default async function handler(req, res) {
  // Detailed request logging
  console.log('[generate-signup-token] Full request details:', {
    method: req.method,
    query: req.query,
    headers: req.headers,
    email: req.query.email,
    emailType: typeof req.query.email
  })

  // Validate environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables:', {
      url: !!process.env.SUPABASE_URL,
      key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    })
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
        console.log(`Confirming email for user ${user.id}`);
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          { email_confirm: true }
        );
        if (updateError) throw updateError;
        console.log(`Successfully confirmed email for user ${user.id}`);
        userJustConfirmed = true;
      } else {
        console.log(`Email ${email} already confirmed for user ${user.id}`);
      }

      console.log(`Returning success message for user ${user.id}`);
      return res.status(200).json({
        message: userJustConfirmed ? 'Email successfully confirmed. Please log in.' : 'Email already confirmed. Please log in.',
        email: user.email
        // No token returned
      });

    } catch (error) {
      console.error(`Error confirming email ${email}:`, error);
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
      console.error('Create user error:', createError)
      return res.status(500).json({ error: createError.message })
    }

    // *** Remove token generation for POST as well, confirmation happens via GET ***
    // We just need to return success after creating the user
    console.log(`Successfully created unconfirmed user: ${email}`);
    // Optionally, trigger the confirmation email sending here if desired
    // For now, just return success, user needs to click the link manually
    return res.status(200).json({
      message: 'User created successfully. Please check your email to confirm.',
      email
      // No token or confirmUrl needed here anymore
    });

  } else {
    return res.status(405).json({ error: 'Only GET and POST allowed' })
  }
}
