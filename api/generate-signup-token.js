import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { email } = req.query

  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }

  // Step 1: Create user if not already created
  const { error: createError } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: false
  })

  if (createError && !createError.message.includes('already registered')) {
    console.error('Create user error:', createError)
    return res.status(500).json({ error: createError.message })
  }

  // Step 2: Generate signup token/link
  const { data, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
  })

  if (linkError) {
    console.error('Generate link error:', linkError)
    return res.status(500).json({ error: linkError.message })
  }

  const token = data?.action_link?.split('token=')[1]?.split('&')[0]

  return res.status(200).json({
    token,
    type: 'signup',
    email,
  })
}
