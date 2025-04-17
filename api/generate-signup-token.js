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
    // Confirmation flow: generate OTP token for existing user
    email = req.query.email
    console.log('[generate-signup-token] Processing email:', {
      rawEmail: email,
      type: typeof email,
      isEmpty: !email,
      trimmedEmpty: email && email.trim() === ''
    })

    if (!email || typeof email !== 'string' || email.trim() === '') {
      console.error('Invalid or missing email:', { email, type: typeof email })
      return res.status(400).json({ error: 'An email address is required' })
    }
    email = email.trim()
  } else if (method === 'POST') {
    // Signup flow: create user then generate OTP token
    const { firstName, lastName, email: bodyEmail, password } = JSON.parse(req.body || '{}')
    email = bodyEmail
    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' })
    }
    // Create user unconfirmed (allow retry if already registered)
    const { error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      user_metadata: { first_name: firstName, last_name: lastName },
      email_confirm: false,
    })
    if (createError && !createError.message.includes('already registered')) {
      console.error('Create user error:', createError)
      return res.status(500).json({ error: createError.message })
    }
  } else {
    return res.status(405).json({ error: 'Only GET and POST allowed' })
  }

  // Generate the OTP signup link using correct SDK signature
  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
    options: { shouldSendEmail: false, redirectTo: 'https://subletnu.vercel.app/confirm' }
  })

  // Debug: return raw Supabase generateLink response when GET & debug=true
  if (method === 'GET' && req.query.debug === 'true') {
    return res.status(200).json({ data, linkError })
  }

  // Debug: log the raw response
  console.log('[generateLink] data:', data, 'error:', linkError)
  if (linkError) {
    console.error('Generate link error:', linkError)
    return res.status(500).json({ error: linkError.message })
  }

  // Supabase v2 returns data.actionLink
  const actionLink = data?.actionLink || data?.action_link
  if (!actionLink) {
    console.error('No action_link returned by Supabase:', data)
    return res.status(500).json({ error: 'No action_link returned', data })
  }

  // Extract token
  let token
  try {
    const url = new URL(actionLink)
    token = url.searchParams.get('token') || url.searchParams.get('access_token')
    if (!token && url.hash) {
      const hashParams = new URLSearchParams(url.hash.substring(1))
      token = hashParams.get('token') || hashParams.get('access_token')
    }
  } catch (err) {
    console.error('Invalid action_link URL:', actionLink, err)
  }

  if (!token) {
    console.error('Failed to extract token from link:', actionLink)
    return res.status(500).json({ error: 'Failed to extract token from link', actionLink })
  }

  return res.status(200).json({ token, email, type: method === 'GET' ? 'magiclink' : 'signup' })
}
