/**
 * Utilidades de debugging para PayPal
 */

export interface PayPalDebugInfo {
  clientId: string;
  environment: 'sandbox' | 'production';
  merchantId?: string;
  configValid: boolean;
  errors: string[];
}

export const debugPayPalConfiguration = (): PayPalDebugInfo => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
  const errors: string[] = [];
  
  // Verificar que existe el Client ID
  if (!clientId) {
    errors.push("VITE_PAYPAL_CLIENT_ID no está configurado");
  }
  
  // Determinar el entorno basado en el Client ID
  let environment: 'sandbox' | 'production' = 'sandbox';
  if (clientId.startsWith('Aa') || clientId.startsWith('Ab')) {
    environment = 'sandbox';
  } else if (clientId.startsWith('AY') || clientId.startsWith('AX')) {
    environment = 'production';
  } else if (clientId.length > 0) {
    errors.push("Formato de Client ID no reconocido");
  }
  
  // Verificar longitud del Client ID
  if (clientId.length > 0 && clientId.length < 80) {
    errors.push("Client ID parece ser muy corto");
  }
  
  const configValid = errors.length === 0 && clientId.length > 0;
  
  return {
    clientId: clientId.slice(0, 10) + "..." + clientId.slice(-10),
    environment,
    configValid,
    errors
  };
};

export const testPayPalConnection = async (): Promise<{
  success: boolean;
  error?: string;
  details?: any;
}> => {
  try {
    const debugInfo = debugPayPalConfiguration();
    
    if (!debugInfo.configValid) {
      return {
        success: false,
        error: "Configuración de PayPal inválida: " + debugInfo.errors.join(", "),
        details: debugInfo
      };
    }
    
    // Test básico de conectividad (sin hacer requests reales)
    console.log("🧪 PayPal Configuration Test:");
    console.log("   Environment:", debugInfo.environment);
    console.log("   Client ID:", debugInfo.clientId);
    console.log("   Valid:", debugInfo.configValid);
    
    return {
      success: true,
      details: debugInfo
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Error desconocido",
    };
  }
};

export const validateMerchantIds = (expectedMerchantId?: string): {
  valid: boolean;
  message: string;
} => {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";
  
  if (!clientId) {
    return {
      valid: false,
      message: "No se encontró Client ID de PayPal"
    };
  }
  
  // En sandbox, el merchant ID suele ser diferente al Client ID
  if (clientId.startsWith('Ab') || clientId.startsWith('Aa')) {
    return {
      valid: true,
      message: "Configuración de sandbox válida"
    };
  }
  
  if (expectedMerchantId && expectedMerchantId !== clientId) {
    return {
      valid: false,
      message: `Merchant ID mismatch. Esperado: ${expectedMerchantId}, Actual: ${clientId.slice(0, 10)}...`
    };
  }
  
  return {
    valid: true,
    message: "Configuración válida"
  };
};