import { createClient } from '@supabase/supabase-js'

// Initialize Supabase Admin client with the public URL env var
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  // Debug: log incoming method and query
  console.log('[generate-signup-token] method:', req.method, 'query:', req.method === 'GET' ? req.query : JSON.parse(req.body || '{}'))
  const method = req.method
  let email

  if (method === 'GET') {
    // Confirmation flow: generate OTP token for existing user
    email = req.query.email
    if (!email) {
      return res.status(400).json({ error: 'Missing email parameter' })
    }
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
  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink(
    'signup',
    email,
    { shouldSendEmail: false, redirectTo: 'https://subletnu.vercel.app/confirm' }
  )

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

  // Debug route: return raw generateLink response when ?debug=true
  if (method === 'GET' && req.query.debug === 'true') {
    const { data: debugData, error: debugError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'signup',
      email,
      options: { shouldSendEmail: false, emailRedirectTo: 'https://subletnu.vercel.app/confirm' }
    });
    return res.status(200).json({ debugData, debugError });
  }

  return res.status(200).json({ token, email, type: method === 'GET' ? 'magiclink' : 'signup' })
}
