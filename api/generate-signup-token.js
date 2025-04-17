import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: `Only POST allowed` })

  const { firstName, lastName, email, password } = req.body
  if (!firstName || !lastName || !email || !password)
    return res.status(400).json({ error: 'All fields required' })
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be ≥ 6 chars' })

  // create user
  const { data: user, error: createError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: false,
    user_metadata: { firstName, lastName }
  })
  if (createError) return res.status(400).json({ error: createError.message })

  // generate link
  const { data: linkData, error: linkError } =
    await supabase.auth.admin.generateLink('signup', email, {
      redirectTo: 'https://subletnu.vercel.app/confirm'
    })
  if (linkError) return res.status(400).json({ error: linkError.message })

  console.log('Raw actionLink:', linkData.actionLink)

  // parse token
  const url = new URL(linkData.actionLink)
  const token = url.searchParams.get('token')
  if (!token) {
    console.error('No token param in:', linkData.actionLink)
    return res.status(500).json({ error: 'Failed to extract token from link' })
  }

  // respond
  return res.status(200).json({ token, email, type: 'signup' })
}
