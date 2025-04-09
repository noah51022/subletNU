/// <reference types="https://deno.land/x/types/index.d.ts" />
/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing required environment variables')
      return new Response(
        JSON.stringify({ 
          error: 'Server configuration error',
          details: 'Missing required environment variables'
        }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    // Create Supabase client with auth context from the incoming request
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get user ID from the request's authentication context
    const { data: { user }, error: getUserError } = await supabaseClient.auth.getUser()

    if (getUserError) {
      console.error('Auth error getting user:', getUserError);
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    console.log(`Attempting deletion for user ID: ${user.id}`);

    // Create Supabase Admin client to perform administrative actions
    const supabaseAdmin = createClient(
      supabaseUrl,
      supabaseServiceRoleKey
    )

    // --- Deletion Steps (in reverse order of dependency is often safer) ---

    // 1. Delete associated sublets
    console.log(`Deleting sublets for user ${user.id}...`);
    const { error: deleteSubletsError } = await supabaseAdmin
      .from('sublets')
      .delete()
      .eq('user_id', user.id)

    if (deleteSubletsError) {
      console.error(`Error deleting sublets for user ${user.id}:`, deleteSubletsError)
      // Depending on requirements, you might want to stop or continue.
      // We log and continue for now.
    } else {
      console.log(`Sublets deleted for user ${user.id}.`);
    }

    // 2. Delete messages where user is sender or receiver
    console.log(`Deleting messages for user ${user.id}...`);
    const { error: deleteMessagesError } = await supabaseAdmin
      .from('messages')
      .delete()
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

    if (deleteMessagesError) {
      console.error(`Error deleting messages for user ${user.id}:`, deleteMessagesError)
      // Log and continue
    } else {
      console.log(`Messages deleted for user ${user.id}.`);
    }

    // 3. Delete user profile
    console.log(`Deleting profile for user ${user.id}...`);
    const { error: deleteProfileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id)

    if (deleteProfileError) {
      console.error(`Error deleting profile for user ${user.id}:`, deleteProfileError)
      // Log and continue
    } else {
      console.log(`Profile deleted for user ${user.id}.`);
    }

    // 4. Delete the user from auth.users (requires admin privileges)
    console.log(`Deleting auth user ${user.id}...`);
    const { error: deleteAuthUserError } = await supabaseAdmin.auth.admin.deleteUser(user.id)

    if (deleteAuthUserError) {
      console.error(`CRITICAL Error deleting auth user ${user.id}:`, deleteAuthUserError)
      // This is a critical failure, the function should report an error.
      return new Response(JSON.stringify({ error: 'Failed to delete user authentication record.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    } else {
      console.log(`Auth user ${user.id} deleted.`);
    }

    // --- Deletion Successful ---
    console.log(`Successfully deleted user ${user.id}`);
    return new Response(JSON.stringify({ message: 'User deleted successfully' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in delete-user function:', error)
    return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 