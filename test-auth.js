// Script para diagnosticar el problema de autenticación
import fetch from 'node-fetch';

async function testAuth() {
  const apiUrl = 'http://localhost:3003/api';
  
  try {
    console.log('1. Probando login...');
    
    // Login
    const loginResponse = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'fer06david@gmail.com',
        password: 'admin123456'
      })
    });
    
    const loginData = await loginResponse.json();
    
    if (!loginData.success) {
      console.log('❌ Login falló:', loginData.error);
      return;
    }
    
    console.log('✅ Login exitoso');
    const token = loginData.token;
    
    console.log('2. Probando endpoint /auth/me...');
    
    // Test /auth/me endpoint
    const meResponse = await fetch(`${apiUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('Status:', meResponse.status);
    
    if (meResponse.status === 200) {
      const meData = await meResponse.json();
      console.log('✅ /auth/me funciona correctamente');
      console.log('Profile role:', meData.profile?.role);
      console.log('User:', meData.user?.email);
    } else {
      const errorText = await meResponse.text();
      console.log('❌ /auth/me falló');
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testAuth();
