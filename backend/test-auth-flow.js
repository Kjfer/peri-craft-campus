// Script para probar el proceso completo de registro y obtención de perfil

async function testAuthFlow() {
  console.log('🧪 Iniciando test del flujo de autenticación...');
  
  const baseUrl = 'http://localhost:3003/api';
  const testUser = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'password123',
    fullName: 'Usuario de Prueba'
  };
  
  try {
    // 1. Registro
    console.log('📝 1. Registrando usuario...');
    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testUser),
    });
    
    const registerData = await registerResponse.json();
    console.log('📝 Registro respuesta:', registerData);
    
    if (!registerData.success) {
      console.error('❌ Error en registro:', registerData.error);
      return;
    }
    
    const token = registerData.token;
    console.log('🔑 Token obtenido:', token ? `${token.substring(0, 20)}...` : 'None');
    
    // 2. Obtener perfil
    console.log('👤 2. Obteniendo perfil...');
    const profileResponse = await fetch(`${baseUrl}/auth/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    const profileData = await profileResponse.json();
    console.log('👤 Perfil respuesta:', profileData);
    
    if (profileData.success) {
      console.log('✅ Flujo completado exitosamente');
      console.log('📊 Resumen:');
      console.log('   - Usuario:', profileData.user);
      console.log('   - Perfil:', profileData.profile);
    } else {
      console.error('❌ Error obteniendo perfil:', profileData.error);
    }
    
  } catch (error) {
    console.error('🚨 Error en el test:', error);
  }
}

// Ejecutar test
testAuthFlow();
