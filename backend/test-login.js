const fetch = require('node-fetch');

async function testLogin() {
  try {
    console.log('Testing login endpoint...');
    
    const response = await fetch('http://localhost:3003/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'test@test.com',
        password: 'password123'
      })
    });
    
    console.log('Response status:', response.status);
    
    const data = await response.json();
    console.log('Response data:', JSON.stringify(data, null, 2));
    
    if (data.success && data.token) {
      console.log('\n=== Testing /me endpoint ===');
      
      const meResponse = await fetch('http://localhost:3003/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${data.token}`
        }
      });
      
      console.log('Me response status:', meResponse.status);
      const meData = await meResponse.json();
      console.log('Me response data:', JSON.stringify(meData, null, 2));
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();
