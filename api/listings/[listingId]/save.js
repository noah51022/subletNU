import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Admin client - consider if service role is needed or user context is enough
// For saving/unsaving, user context should be sufficient due to RLS.
// However, admin client might be used in other parts of your API, so consistency is key.
// Let's start with the standard client and adjust if needed.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY; // Or service key if admin actions are needed

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not set.');
  // Potentially throw an error or handle this more gracefully
}

// This client will respect RLS policies
const getSupabaseClient = (req) => {
  // In a Vercel serverless function, the user's JWT is often passed in the Authorization header.
  // Supabase client can be initialized with this token to act on behalf of the user.
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
      auth: {
        // It's important to ensure the client can authenticate requests properly.
        // autoRefreshToken and persistSession might not be relevant/work the same in serverless.
        // The key is to correctly pass the user's JWT.
      }
    });
  }
  // Fallback or error if no auth header - user must be authenticated
  return createClient(supabaseUrl, supabaseAnonKey); // Or throw error
};


export default async function handler(req, res) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error: Supabase credentials missing.' });
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = getSupabaseClient(req);

  // 1. Get Authenticated User
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: You must be logged in to save listings.' });
  }

  // 2. Get listingId from path
  // In Vercel, dynamic path parameters are available in req.query
  const { listingId } = req.query;
  if (!listingId || typeof listingId !== 'string') {
    return res.status(400).json({ error: 'Bad Request: listingId is required.' });
  }

  // 3. Get 'saved' state from request body
  let saved;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    saved = body.saved;
    if (typeof saved !== 'boolean') {
      return res.status(400).json({ error: 'Bad Request: "saved" field (boolean) is required in the request body.' });
    }
  } catch (parseError) {
    return res.status(400).json({ error: 'Bad Request: Invalid JSON body.' });
  }

  const userId = user.id;

  try {
    if (saved) {
      // Save the listing: Insert into saved_listings
      // The RLS policy "Allow authenticated users to save listings" allows this.
      // The RLS policy "Users can update their own saved listings" might also come into play with ON CONFLICT.
      // We should ensure not to create duplicates if the user clicks "save" multiple times.
      const { error: insertError } = await supabase
        .from('saved_listings')
        .insert({
          user_id: userId,
          listing_id: listingId,
          // created_at will be set by default by Postgres
        })
        .select() // select to check if it worked, RLS might prevent seeing it otherwise immediately
        .maybeSingle(); // Use maybeSingle to handle potential conflicts gracefully or if it's already there.

      // Check for unique constraint violation (user_id, listing_id)
      // Supabase error code for unique violation is '23505'
      if (insertError && insertError.code === '23505') {
        // Listing is already saved, which is fine.
        return res.status(200).json({ message: 'Listing already saved.' });
      } else if (insertError) {
        console.error('Error saving listing:', insertError);
        return res.status(500).json({ error: 'Failed to save listing.', details: insertError.message });
      }
      return res.status(201).json({ message: 'Listing saved successfully.' });

    } else {
      // Unsave the listing: Delete from saved_listings
      // The RLS policy "Allow users to delete their own saved listings" handles this.
      const { error: deleteError } = await supabase
        .from('saved_listings')
        .delete()
        .eq('user_id', userId)
        .eq('listing_id', listingId);

      if (deleteError) {
        console.error('Error unsaving listing:', deleteError);
        return res.status(500).json({ error: 'Failed to unsave listing.', details: deleteError.message });
      }
      return res.status(200).json({ message: 'Listing unsaved successfully.' });
    }
  } catch (e) {
    console.error('Unexpected error in save/unsave logic:', e);
    return res.status(500).json({ error: 'An unexpected error occurred.', details: e.message });
  }
} 