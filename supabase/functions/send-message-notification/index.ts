import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const resendKey = Deno.env.get('RESEND_API_KEY')

    if (!supabaseUrl || !serviceRoleKey || !resendKey) {
      throw new Error('Missing required environment variables')
    }

    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)
    const { messageId } = await req.json()
    
    // Get message and profile details
    const { data: message } = await supabaseClient
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .single()

    const { data: receiverProfile } = await supabaseClient
      .from('profiles')
      .select('email, first_name, last_name')
      .eq('id', message.receiver_id)
      .single()

    const { data: senderProfile } = await supabaseClient
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', message.sender_id)
      .single()

    // Send email notification
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: receiverProfile.email,
        subject: `New message from ${senderProfile.first_name}`,
        html: `
          <div>
            <h2>You have a new message on SubletNU</h2>
            <p><strong>${senderProfile.first_name} ${senderProfile.last_name}</strong> sent you a message:</p>
            <p style="padding: 15px; background-color: #f5f5f5; border-radius: 5px;">${message.text}</p>
            <p>
              <a href="https://subletnu.vercel.app/messages/${message.sender_id}" 
                 style="padding: 10px 20px; background-color: #E31837; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Message
              </a>
            </p>
            <p><small>Note: This is a test email. In production, this would be sent to: ${receiverProfile.email}</small></p>
          </div>
        `,
      }),
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 