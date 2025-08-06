import { supabase } from './supabase';
// Utility function to update profile privacy and refresh cache
export const updateProfilePrivacy = async (
  address: string, 
  profilePublic: boolean, 
  profileBio: string = '', 
  profileAvatar: string = ''
) => {
  try {
    // Update profile settings
    const { data, error } = await supabase
      .from('usernames')
      .update({
        profile_public: profilePublic,
        profile_bio: profileBio,
        profile_avatar: profileAvatar,
        last_active: new Date().toISOString() // Force cache refresh
      })
      .eq('address', address.toLowerCase().trim())
      .select();
    if (error) {
      throw error;
    }
    // Broadcast change to other components
    if (data && data[0]) {
      window.dispatchEvent(new CustomEvent('profilePrivacyChanged', {
        detail: {
          username: data[0].username,
          profile_public: profilePublic
        }
      }));
    }
    return { success: true, data };
  } catch (error) {
    console.error('Failed to update profile privacy:', error);
    return { success: false, error };
  }
};
// Utility function to get fresh profile data (bypassing cache)
export const getFreshProfileData = async (username: string) => {
  try {
    // Use direct query to bypass function cache
    const { data, error } = await supabase
      .from('usernames')
      .select('username, address, profile_bio, profile_avatar, profile_public, created_at, last_active')
      .eq('username', username)
      .single();
    if (error) {
      throw error;
    }
    return { success: true, data };
  } catch (error) {
    console.error('Failed to get fresh profile data:', error);
    return { success: false, error };
  }
}; 
