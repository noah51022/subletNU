import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is not set for /api/users/me/saved-listings.');
}

const getSupabaseClient = (req) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const jwt = authHeader.substring(7);
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
  }
  // If no auth header, the RLS policies will prevent data access for protected routes.
  // For fetching saved listings, user must be authenticated.
  return createClient(supabaseUrl, supabaseAnonKey); // Or throw an error immediately if auth is always required.
};

export default async function handler(req, res) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ error: 'Server configuration error: Supabase credentials missing.' });
  }

  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const supabase = getSupabaseClient(req);

  // 1. Get Authenticated User
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return res.status(401).json({ error: 'Unauthorized: You must be logged in to view saved listings.' });
  }

  const userId = user.id;

  try {
    // Fetch saved listings for the user, joining with the sublets table to get listing details.
    // The RLS policy "Allow users to view their own saved listings" on 'saved_listings' ensures
    // that users can only fetch their own save records.
    // We assume the 'sublets' table is generally readable or has its own RLS that allows access
    // to listings that have been saved (e.g., public listings).
    const { data: savedListingsData, error: fetchError } = await supabase
      .from('saved_listings')
      .select(`
        created_at, 
        sublets (*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false }); // Optionally order by when it was saved

    if (fetchError) {
      console.error('Error fetching saved listings:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch saved listings.', details: fetchError.message });
    }

    // The result will be an array of objects, where each object is a saved_listing record
    // and has a nested 'sublets' object with the details of the listing.
    // We can map this to a cleaner format if needed, e.g., just an array of sublet objects.
    const savedSublets = savedListingsData ? savedListingsData.map(sl => ({
      ...sl.sublets, // Spread all properties of the sublet
      saved_at: sl.created_at // Add the timestamp when this listing was saved by the user
    })) : [];

    return res.status(200).json(savedSublets);

  } catch (e) {
    console.error('Unexpected error fetching saved listings:', e);
    return res.status(500).json({ error: 'An unexpected error occurred.', details: e.message });
  }
} 