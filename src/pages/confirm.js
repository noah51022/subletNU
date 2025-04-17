import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const Confirm = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Verifying...')

  useEffect(() => {
    const email = searchParams.get('email')
    console.log('Extracted email:', email)

    if (!email) {
      setStatus('Missing email from URL.')
      return
    }

    const verify = async () => {
      // Call backend to generate signup token
      let token
      try {
        const res = await fetch(`/api/generate-signup-token?email=${encodeURIComponent(email)}`)
        const result = await res.json()
        if (!res.ok || !result.token) throw new Error(result.error || 'Failed to get token')
        token = result.token
      } catch (err) {
        setStatus(`Failed to generate signup token: ${err.message}`)
        return
      }
      // Now verify with Supabase
      const { data, error } = await supabase.auth.verifyOtp({ token, type: 'signup', email })
      console.log('verifyOtp response:', { data, error })
      if (error) {
        setStatus(`Verification failed: ${error.message}`)
      } else {
        if (data?.session) {
          await supabase.auth.setSession(data.session)
          console.log('Logged in with session:', data.session)
          setStatus('Email verified and logged in! Redirecting...')
          setTimeout(() => navigate('/'), 3000)
        } else {
          setStatus('Email verified, but please log in manually.')
          setTimeout(() => navigate('/auth'), 3000)
        }
      }
    }
    verify()
  }, [searchParams, navigate])

  return (
    <div style={{ padding: '2rem' }}>
      <h1>{status}</h1>
    </div>
  )
}

export default Confirm
