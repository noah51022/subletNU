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
    const type = searchParams.get('type') || 'signup'

    if (!email) {
      setStatus('Missing email from URL.')
      return
    }

    if (!token) {
      setStatus('Missing token from URL.')
      return
    }

    const verify = async () => {
      try {
        const { data, error } = await supabase.auth.verifyOtp({
          token,
          type,
          email
        })

        if (error) {
          console.error('Verification error:', error)
          setStatus(`Verification failed: ${error.message}`)
          // If token expired, redirect to login
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
