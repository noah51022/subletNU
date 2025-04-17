import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // ❗ do NOT expose this to the frontend!
)

export default async function handler(req, res) {
  const { email } = req.query

  if (!email) {
    return res.status(400).json({ error: 'Missing email' })
  }

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: 'signup',
    email,
  })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.status(200).json({
    token: data?.action_link?.split('token=')[1]?.split('&')[0],
    type: 'signup',
    email,
  })
} 