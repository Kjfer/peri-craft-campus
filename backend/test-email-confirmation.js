// Script para probar el endpoint de confirmación de email

const testEmailConfirmation = async () => {
  try {
    console.log('🧪 Probando endpoint de confirmación de email...');
    
    const testEmail = 'testuser@example.com';
    
    const response = await fetch('http://localhost:3003/api/auth/confirm-email-dev', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: testEmail }),
    });

    const data = await response.json();
    
    console.log('📩 Respuesta del servidor:');
    console.log('Status:', response.status);
    console.log('Data:', data);
    
    if (data.success) {
      console.log('✅ Email confirmado exitosamente');
    } else {
      console.log('❌ Error:', data.error);
    }
    
  } catch (error) {
    console.log('🚨 Error de conexión:', error.message);
  }
};

// Ejecutar test
testEmailConfirmation();
