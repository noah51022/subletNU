import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin client with the public URL env var
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL || '',
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
  if (!process.env.VITE_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing required environment variables')
    return res.status(500).json({ error: 'Server configuration error' })
  }

  const method = req.method
  let email = ''

  if (method === 'GET') {
    // Confirmation flow: verify existing token
    email = req.query.email
    if (!email || typeof email !== 'string' || email.trim() === '') {
      return res.status(400).json({ error: 'An email address is required' })
    }
    email = email.trim()

    // For GET requests (email confirmation), we'll use email verification instead
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: {
        shouldSendEmail: false,
        redirectTo: 'https://subletnu.vercel.app/confirm'
      }
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
      return res.status(500).json({ error: linkError.message })
    }

    const actionLink = data?.properties?.action_link
    if (!actionLink) {
      console.error('No action_link found in response:', data)
      return res.status(500).json({ error: 'No action_link found in response' })
    }

    let token
    try {
      const url = new URL(actionLink)
      token = url.searchParams.get('token')
      if (!token) {
        console.error('No token found in action_link:', actionLink)
        return res.status(500).json({ error: 'No token found in action_link' })
      }
    } catch (err) {
      console.error('Invalid action_link URL:', actionLink, err)
      return res.status(500).json({ error: 'Invalid action_link URL' })
    }

    return res.status(200).json({ token, email, type: 'magiclink' })

  } else if (method === 'POST') {
    // Signup flow: create user then generate signup token
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

    if (createError && !createError.message.includes('already registered')) {
      console.error('Create user error:', createError)
      return res.status(500).json({ error: createError.message })
    }

    // Generate signup token
    const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: {
        shouldSendEmail: false,
        redirectTo: 'https://subletnu.vercel.app/confirm'
      }
    })

    if (linkError) {
      console.error('Generate link error:', linkError)
      return res.status(500).json({ error: linkError.message })
    }

    const actionLink = data?.properties?.action_link
    if (!actionLink) {
      console.error('No action_link found in response:', data)
      return res.status(500).json({ error: 'No action_link found in response' })
    }

    // Extract token and create confirmation URL
    let token
    try {
      const url = new URL(actionLink)
      token = url.searchParams.get('token')
      if (!token) {
        console.error('No token found in action_link:', actionLink)
        return res.status(500).json({ error: 'No token found in action_link' })
      }

      // Create the confirmation URL with all necessary parameters
      const confirmUrl = new URL('https://subletnu.vercel.app/confirm')
      confirmUrl.searchParams.set('email', email)
      confirmUrl.searchParams.set('token', token)
      confirmUrl.searchParams.set('type', 'signup')

      return res.status(200).json({
        token,
        email,
        type: 'signup',
        confirmUrl: confirmUrl.toString()
      })
    } catch (err) {
      console.error('Invalid action_link URL:', actionLink, err)
      return res.status(500).json({ error: 'Invalid action_link URL' })
    }
  } else {
    return res.status(405).json({ error: 'Only GET and POST allowed' })
  }
}
