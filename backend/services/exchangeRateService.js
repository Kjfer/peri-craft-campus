// No need to import node-fetch, using native fetch (Node.js 18+)
// If Node.js version is < 18, uncomment the line below and install node-fetch
// const fetch = require('node-fetch');

class ExchangeRateService {
  constructor() {
    this.cache = new Map();
    this.CACHE_DURATION = 10 * 60 * 1000; // 10 minutos
    this.DEFAULT_RATE = 3.54; // Tasa actualizada según SBS/SUNAT (promedio actual)
  }

  /**
   * Obtiene la tasa de cambio USD a PEN
   * @returns {Promise<number>} Tasa de cambio USD/PEN
   */
  async getUSDToPENRate() {
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
      () => this.fetchFromOpenExchangeAPI(),
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
  async fetchFromExchangeRateHost() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      console.log('🌐 Consultando ExchangeRate.host API...');
      
      const response = await fetch('https://api.exchangerate.host/latest?base=USD&symbols=PEN', {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeout);
      
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
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * API alternativa - basada en datos SBS/SUNAT Perú
   */
  async fetchFromExchangeRateSBS() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      console.log('🏦 Consultando API basada en SBS/SUNAT...');
      
      // Esta es una API gratuita que consulta datos oficiales de Perú
      const response = await fetch('https://api.apis.net.pe/v1/tipo-cambio-sunat', {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0',
          'Referer': 'https://apis.net.pe/'
        }
      });
      
      clearTimeout(timeout);
      
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
      clearTimeout(timeout);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * API alternativa - Open Exchange Rates (requiere clave pero tiene tier gratuito)
   */
  async fetchFromOpenExchangeAPI() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    try {
      // Esta es una version básica sin API key
      // Para usar en producción, registrarse en openexchangerates.org
      const response = await fetch('https://open.er-api.com/v6/latest/USD', {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        throw new Error(`Open Exchange API failed: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.result === 'success' && data.rates?.PEN) {
        return data.rates.PEN;
      }

      throw new Error('Invalid response from Open Exchange API');
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Obtiene tasa desde cache si es válida
   */
  getCachedRate(cacheKey) {
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
   * Guarda tasa en cache
   */
  setCachedRate(cacheKey, rate) {
    this.cache.set(cacheKey, {
      rate,
      timestamp: Date.now(),
      lastUpdated: new Date()
    });
  }

  /**
   * Convierte monto USD a PEN usando tasa actual
   */
  async convertUSDToPEN(usdAmount) {
    const rate = await this.getUSDToPENRate();
    return Math.round((usdAmount * rate) * 10) / 10; // Redondear a 1 decimal
  }

  /**
   * Obtiene información del cache para debugging
   */
  getCacheInfo() {
    const rates = {};
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
  clearCache() {
    this.cache.clear();
    console.log('🗑️ Exchange rate cache cleared');
  }

  /**
   * Fuerza actualización de tasa (ignora cache)
   */
  async forceRefresh() {
    this.clearCache();
    return await this.getUSDToPENRate();
  }

  /**
   * Obtiene información detallada de la tasa actual
   */
  async getRateInfo() {
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
const exchangeRateService = new ExchangeRateService();

module.exports = { exchangeRateService, ExchangeRateService };