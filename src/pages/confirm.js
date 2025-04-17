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
    const token = searchParams.get('token')

    if (!email) {
      setStatus('Missing email from URL.')
      return
    }

    const verify = async () => {
      try {
        let verifyToken = token

        // If no token in URL, get a fresh one from backend
        if (!token) {
          const res = await fetch('/api/generate-signup-token?email=' + encodeURIComponent(email))
          if (!res.ok) {
            const text = await res.text()
            throw new Error(`Failed to generate signup token: ${text}`)
          }
          const result = await res.json()
          if (!result.token) {
            throw new Error(result.error || 'Failed to get token')
          }
          verifyToken = result.token
        }

        // Verify with Supabase
        const { data, error } = await supabase.auth.verifyOtp({
          token: verifyToken,
          type: 'signup',
          email
        })

        if (error) {
          console.error('Verification error:', error)
          setStatus(`Verification failed: ${error.message}`)
          if (error.message.includes('expired')) {
            setTimeout(() => navigate('/auth'), 3000)
          }
        } else {
          if (data?.session) {
            await supabase.auth.setSession(data.session)
            setStatus('Email verified and logged in! Redirecting...')
            setTimeout(() => navigate('/'), 3000)
          } else {
            setStatus('Email verified, but please log in manually.')
            setTimeout(() => navigate('/auth'), 3000)
          }
        }
      } catch (err) {
        console.error('Verification error:', err)
        setStatus(`Verification failed: ${err.message}`)
        // If user not found, redirect to signup
        if (err.message.includes('User not found')) {
          setTimeout(() => navigate('/auth?mode=signup'), 3000)
        } else {
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
