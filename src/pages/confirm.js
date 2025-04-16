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
    console.log('Raw confirmationUrl:', confirmationUrl)

    if (!confirmationUrl) {
      setStatus('Missing confirmation URL.')
      return
    }

    let url
    try {
      const decodedUrl = decodeURIComponent(confirmationUrl)
      console.log('Decoded confirmationUrl:', decodedUrl)
      url = new URL(decodedUrl)
    } catch (e) {
      setStatus('Invalid confirmation URL.')
      console.error('Error parsing confirmationUrl:', e)
      return
    }

    const token = url.searchParams.get('token')
    const type = url.searchParams.get('type')
    console.log('Extracted token:', token)
    console.log('Extracted type:', type)

    if (!token || !type) {
      setStatus('Missing token or type from confirmation URL.')
      return
    }

    const verify = async () => {
      const { data, error } = await supabase.auth.verifyOtp({ token, type })
      console.log('verifyOtp response:', { data, error })

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
