// Script para probar el endpoint de confirmación de email usando axios

const axios = require('axios');

const testEmailConfirmation = async () => {
  try {
    console.log('🧪 Probando endpoint de confirmación de email...');
    
    const testEmail = 'testuser@example.com';
    
    const response = await axios.post('http://localhost:3003/api/auth/confirm-email-dev', {
      email: testEmail
    });

    console.log('📩 Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Data:', response.data);
    
    if (response.data.success) {
      console.log('✅ Email confirmado exitosamente');
    } else {
      console.log('❌ Error:', response.data.error);
    }
    
  } catch (error) {
    console.log('🚨 Error:', error.response?.data || error.message);
  }
};

// Ejecutar test
testEmailConfirmation();
