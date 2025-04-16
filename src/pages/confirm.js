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
    const confirmationUrl = searchParams.get('confirmation_url')

    if (!confirmationUrl) {
      setStatus('Missing confirmation URL.')
      return
    }

    let url
    try {
      url = new URL(confirmationUrl)
    } catch (e) {
      setStatus('Invalid confirmation URL.')
      return
    }
    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')

    if (!token || !type) {
      setStatus('Missing token or type from confirmation URL.')
      return
    }

    const verify = async () => {
      const { data, error } = await supabase.auth.verifyOtp({ token, type })

      if (error) {
        setStatus(`Verification failed: ${error.message}`)
      } else {
        setStatus('Email verified! Redirecting...')
        setTimeout(() => navigate('/'), 3000)
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