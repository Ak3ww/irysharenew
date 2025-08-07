// Test script for Vercel API deployment
// Run this after deploying to test your API

const testAPI = async () => {
  const API_URL = 'https://your-app-name.vercel.app/api/approve-user'; // Replace with your actual URL
  
  console.log('🧪 Testing Vercel API deployment...');
  console.log('URL:', API_URL);
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userAddress: '0x1234567890123456789012345678901234567890' // Test address
      })
    });
    
    const result = await response.json();
    
    console.log('📊 Response Status:', response.status);
    console.log('📊 Response Body:', result);
    
    if (response.ok) {
      console.log('✅ API is working!');
    } else {
      console.log('❌ API error:', result.error);
      if (result.debug) {
        console.log('🔍 Debug info:', result.debug);
      }
    }
    
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
};

// Run the test
testAPI(); 