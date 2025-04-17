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
    const token = searchParams.get('token')
    const type = searchParams.get('type')
    const email = searchParams.get('email')
    console.log('Extracted token:', token)
    console.log('Extracted type:', type)
    console.log('Extracted email:', email)

    if (!token || !type) {
      setStatus('Missing token or type from URL.')
      return
    }

    const verify = async () => {
      const { data, error } = await supabase.auth.verifyOtp({ token, type, email })
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
