interface ExchangeRateResponse {
  success: boolean;
  timestamp: number;
  base: string;
  date: string;
  rates: {
    PEN: number;
    [key: string]: number;
  };
}

interface CachedRate {
  rate: number;
  timestamp: number;
  lastUpdated: Date;
}

class ExchangeRateService {
  private static instance: ExchangeRateService;
  private cache: Map<string, CachedRate> = new Map();
  private readonly CACHE_DURATION = 10 * 60 * 1000; // 10 minutos en milisegundos
  private readonly DEFAULT_RATE = 3.54; // Fallback rate actualizado según SBS/SUNAT (promedio actual)
  private readonly API_KEY = 'your-api-key-here'; // Reemplazar con tu API key

  private constructor() {}

  static getInstance(): ExchangeRateService {
    if (!ExchangeRateService.instance) {
      ExchangeRateService.instance = new ExchangeRateService();
    }
    return ExchangeRateService.instance;
  }

  /**
   * Obtiene la tasa de cambio USD a PEN
   * Usa múltiples fuentes con fallback automático
   */
  async getUSDToPENRate(): Promise<number> {
    const cacheKey = 'USD_TO_PEN';
    
    // Verificar cache primero
    const cachedRate = this.getCachedRate(cacheKey);
    if (cachedRate) {
      console.log('💰 Using cached exchange rate:', cachedRate);
      return cachedRate;
    }

    console.log('🔄 Fetching fresh exchange rate...');

    // Intentar múltiples APIs en orden de preferencia
    const apis = [
      () => this.fetchFromExchangeRateHost(),
      () => this.fetchFromExchangeRateApi(),
      () => this.fetchFromExchangeRateSBS(),
    ];

    for (const apiCall of apis) {
      try {
        const rate = await apiCall();
        if (rate && rate > 0) {
          this.setCachedRate(cacheKey, rate);
          console.log('✅ Fresh exchange rate obtained:', rate);
          return rate;
        }
      } catch (error) {
        console.warn('⚠️ API call failed:', error.message);
        continue;
      }
    }

    // Si todas las APIs fallan, usar tasa por defecto
    console.warn('⚠️ All APIs failed, using default rate:', this.DEFAULT_RATE);
    return this.DEFAULT_RATE;
  }

  /**
   * API principal - ExchangeRate.host (datos actuales y confiables)
   */
  private async fetchFromExchangeRateHost(): Promise<number> {
    console.log('🌐 Consultando ExchangeRate.host API...');
    
    const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=PEN');
    
    if (!response.ok) {
      throw new Error(`ExchangeRate.host API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.rates?.PEN) {
      const rate = data.rates.PEN;
      console.log(`✅ Tasa ExchangeRate.host obtenida: ${rate.toFixed(4)}`);
      return Math.round(rate * 10000) / 10000;
    }

    throw new Error('Invalid response from ExchangeRate.host API');
  }

  /**
   * Obtiene tasa desde exchangerate-api.com (gratuita hasta 1500 requests/mes)
   */
  private async fetchFromExchangeRateApi(): Promise<number> {
    const response = await fetch('https://v6.exchangerate-api.com/v6/latest/USD');
    
    if (!response.ok) {
      throw new Error(`ExchangeRate API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.result === 'success' && data.conversion_rates?.PEN) {
      return data.conversion_rates.PEN;
    }

    throw new Error('Invalid response from ExchangeRate API');
  }

  /**
   * API alternativa - basada en datos SBS/SUNAT Perú
   */
  private async fetchFromExchangeRateSBS(): Promise<number> {
    console.log('🏦 Consultando API basada en SBS/SUNAT...');
    
    try {
      // API gratuita que consulta datos oficiales de Perú
      const response = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat', {
        headers: {
          'Referer': 'https://apis.net.pe/'
        }
      });
      
      if (!response.ok) {
        throw new Error(`SBS API failed: ${response.status}`);
      }

      const data = await response.json();
      
      // La API devuelve { "compra": 3.52, "venta": 3.54 }
      if (data.venta && data.compra) {
        // Usamos el promedio de compra y venta
        const rate = (parseFloat(data.compra) + parseFloat(data.venta)) / 2;
        console.log(`✅ Tasa SBS/SUNAT obtenida: ${rate.toFixed(4)} (compra: ${data.compra}, venta: ${data.venta})`);
        return Math.round(rate * 10000) / 10000;
      }

      throw new Error('Invalid response from SBS API');
    } catch (error) {
      console.error('❌ Error fetching from SBS API:', error);
      throw error;
    }
  }

  /**
   * API alternativa - currencyapi.com
   */
  private async fetchFromCurrencyAPI(): Promise<number> {
    // Esta API requiere registrarse para obtener una clave gratuita
    const response = await fetch(`https://api.currencyapi.com/v3/latest?apikey=${this.API_KEY}&base_currency=USD&currencies=PEN`);
    
    if (!response.ok) {
      throw new Error(`Currency API failed: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.data?.PEN?.value) {
      return data.data.PEN.value;
    }

    throw new Error('Invalid response from Currency API');
  }

  /**
   * Obtiene tasa desde cache si es válida
   */
  private getCachedRate(cacheKey: string): number | null {
    const cached = this.cache.get(cacheKey);
    
    if (!cached) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - cached.timestamp) > this.CACHE_DURATION;
    
    if (isExpired) {
      this.cache.delete(cacheKey);
      return null;
    }

    return cached.rate;
  }

  /**
   * Get cached rate (public method for checkoutService)
   */
  getCachedRatePublic(cacheKey: string): number | null {
    return this.getCachedRate(cacheKey);
  }

  /**
   * Guarda tasa en cache
   */
  private setCachedRate(cacheKey: string, rate: number): void {
    this.cache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
      lastUpdated: new Date()
    });
  }

  /**
   * Obtiene información del cache para debugging
   */
  getCacheInfo(): { size: number; rates: Record<string, CachedRate> } {
    const rates: Record<string, CachedRate> = {};
    this.cache.forEach((value, key) => {
      rates[key] = value;
    });

    return {
      size: this.cache.size,
      rates
    };
  }

  /**
   * Limpia el cache manualmente
   */
  clearCache(): void {
    this.cache.clear();
    console.log('🗑️ Exchange rate cache cleared');
  }

  /**
   * Fuerza actualización de tasa (ignora cache)
   */
  async forceRefresh(): Promise<number> {
    this.clearCache();
    return await this.getUSDToPENRate();
  }

  /**
   * Convierte monto USD a PEN usando tasa actual
   */
  async convertUSDToPEN(usdAmount: number): Promise<number> {
    const rate = await this.getUSDToPENRate();
    return Math.round((usdAmount * rate) * 10) / 10; // Redondear a 1 decimal
  }

  /**
   * Formatea precio con moneda
   */
  formatPrice(amount: number, currency: string = 'USD'): string {
    const locale = currency === 'PEN' ? 'es-PE' : 'en-US';
    
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(amount);
  }

  /**
   * Obtiene información detallada de la tasa actual
   */
  async getRateInfo(): Promise<{
    rate: number;
    cached: boolean;
    lastUpdated: Date | null;
    source: string;
  }> {
    const cached = this.cache.get('USD_TO_PEN');
    
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return {
        rate: cached.rate,
        cached: true,
        lastUpdated: cached.lastUpdated,
        source: 'cache'
      };
    }

    const rate = await this.getUSDToPENRate();
    const newCached = this.cache.get('USD_TO_PEN');
    
    return {
      rate,
      cached: false,
      lastUpdated: newCached?.lastUpdated || new Date(),
      source: rate === this.DEFAULT_RATE ? 'fallback' : 'api'
    };
  }
}

// Exportar instancia singleton
export const exchangeRateService = ExchangeRateService.getInstance();

// Exportar clase para testing
export { ExchangeRateService };

// Tipos para TypeScript
export type { CachedRate };