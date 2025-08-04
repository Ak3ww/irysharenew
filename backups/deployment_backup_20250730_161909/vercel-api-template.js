// Vercel API Route Template
// File: /api/approve-user/index.js
// Based on: server.js

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address, signature, message } = req.body;

    // Validate required fields
    if (!address || !signature || !message) {
      return res.status(400).json({ 
        error: 'Missing required fields: address, signature, message' 
      });
    }

    // Verify the signature matches the expected message
    const expectedMessage = `Approve user registration for address: ${address.toLowerCase()}`;
    if (message !== expectedMessage) {
      return res.status(400).json({ 
        error: 'Invalid message format' 
      });
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('usernames')
      .select('*')
      .eq('address', address.toLowerCase().trim())
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError);
      return res.status(500).json({ 
        error: 'Database error while checking user' 
      });
    }

    if (existingUser) {
      return res.status(400).json({ 
        error: 'User already exists' 
      });
    }

    // Insert new user
    const { data: newUser, error: insertError } = await supabase
      .from('usernames')
      .insert([
        {
          address: address.toLowerCase().trim(),
          registration_signature: signature,
          profile_public: true, // Default to public profile
          profile_bio: null,
          profile_avatar: null
        }
      ])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting user:', insertError);
      return res.status(500).json({ 
        error: 'Failed to create user',
        details: insertError.message 
      });
    }

    // Return success response
    res.status(200).json({
      success: true,
      message: 'User approved successfully',
      user: {
        address: newUser.address,
        profile_public: newUser.profile_public,
        created_at: newUser.created_at
      }
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}; 