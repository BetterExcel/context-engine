const fetch = require('node-fetch');

async function testBasicEndpoint() {
  try {
    console.log('Testing basic endpoint...');
    
    const response = await fetch('http://localhost:3003/', {
      timeout: 5000
    });
    
    console.log('Response status:', response.status);
    const text = await response.text();
    console.log('Response:', text);
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testBasicEndpoint();