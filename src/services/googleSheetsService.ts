/**
 * Servicio para obtener datos de cursos desde Google Sheets
 * Conecta con la API de Google Sheets para obtener información en tiempo real
 */

interface CursoEnVivo {
  id: string;
  title: string;
  date: Date;
  time: string;
  duration: string;
  instructor: string;
  students: number;
  status: 'iniciado' | 'proximo' | 'programado';
  type: 'live' | 'qa' | 'masterclass';
  description: string;
  link?: string;
}

class GoogleSheetsService {
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  private spreadsheetId = import.meta.env.VITE_GOOGLE_SHEET_ID;
  private apiKey = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
  private range = 'INICIO_CURSOS!A:F'; // Ajustado para tu estructura: ID_cursoIniciado | Proyecto | Estrategia | FechaInicio | FechaFin | Estado

  // Cache para evitar múltiples requests
  private cache: {
    data: CursoEnVivo[] | null;
    timestamp: number;
    ttl: number; // 5 minutos
  } = {
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000
  };

  /**
   * Obtiene los datos de cursos desde Google Sheets
   */
  async getCursosEnVivo(): Promise<CursoEnVivo[]> {
    try {
      // Debug: Verificar configuración
      this.debugConfiguration();

      // Verificar cache
      if (this.cache.data && (Date.now() - this.cache.timestamp) < this.cache.ttl) {
        console.log('📋 Usando datos en caché de Google Sheets');
        return this.cache.data;
      }

      if (!this.spreadsheetId || !this.apiKey) {
        console.warn('⚠️ Google Sheets no configurado, usando datos de fallback');
        return this.getFallbackData();
      }

      console.log('🔄 Obteniendo datos frescos de Google Sheets...');
      
      const url = `${this.baseUrl}/${this.spreadsheetId}/values/${this.range}?key=${this.apiKey}`;
      console.log('🌐 URL de solicitud:', url);
      
      const response = await fetch(url);
      console.log('📡 Status de respuesta:', response.status, response.statusText);

      if (!response.ok) {
        // Intentar obtener más detalles del error
        let errorDetails = '';
        try {
          const errorData = await response.json();
          errorDetails = JSON.stringify(errorData, null, 2);
          console.error('📄 Detalles del error:', errorDetails);
        } catch (e) {
          console.error('📄 No se pudo parsear el error como JSON');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}\nDetalles: ${errorDetails}`);
      }

      const data = await response.json();
      const cursos = this.parseSheetData(data.values);

      // Actualizar cache
      this.cache.data = cursos;
      this.cache.timestamp = Date.now();

      console.log(`✅ ${cursos.length} cursos obtenidos de Google Sheets`);
      return cursos;

    } catch (error) {
      console.error('❌ Error obteniendo datos de Google Sheets:', error);
      console.error('💡 Soluciones posibles:');
      console.error('   1. Verifica que el Google Sheet sea público:');
      console.error('      - Abre el Sheet → Compartir → "Cualquier persona con el enlace puede ver"');
      console.error('   2. Verifica que el Sheet ID sea correcto en la URL');
      console.error('   3. Verifica que la hoja se llame "Sheet1" o cambia el rango');
      console.error('   4. Verifica que la API Key tenga permisos para Google Sheets API');
      console.error('   5. URL de prueba directa:');
      console.error(`      https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${this.range}?key=${this.apiKey?.slice(0, 10)}...`);
      
      return this.getFallbackData();
    }
  }

  /**
   * Helper de debug para verificar configuración
   */
  private debugConfiguration(): void {
    const hasSheetId = !!this.spreadsheetId;
    const hasApiKey = !!this.apiKey;
    
    console.log('🔧 Configuración Google Sheets:');
    console.log(`   Sheet ID: ${hasSheetId ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   API Key: ${hasApiKey ? '✅ Configurado' : '❌ Faltante'}`);
    console.log(`   Rango: ${this.range}`);
    
    if (hasSheetId) {
      console.log(`   Sheet ID (parcial): ...${this.spreadsheetId?.slice(-10)}`);
    }
    
    if (!hasSheetId || !hasApiKey) {
      console.log('💡 Para configurar:');
      console.log('   1. Agrega REACT_APP_GOOGLE_SHEET_ID a tu .env');
      console.log('   2. Agrega REACT_APP_GOOGLE_SHEETS_API_KEY a tu .env (formato: AIzaSy...)');
      console.log('   3. Reinicia el servidor de desarrollo');
    }
  }

  /**
   * Convierte los datos de la hoja en objetos CursoEnVivo
   * Estructura actual: ID_cursoIniciado | Proyecto | Estrategia | FechaInicio | FechaFin | Estado
   * Solo usamos: Proyecto (columna B) y FechaInicio (columna D)
   */
  private parseSheetData(rows: string[][]): CursoEnVivo[] {
    if (!rows || rows.length < 2) {
      console.log('📊 No hay datos en la hoja o solo hay headers');
      return [];
    }

    console.log(`📊 Procesando ${rows.length} filas de Google Sheets`);
    console.log('📊 Headers:', rows[0]);

    // Saltar la primera fila (headers)
    const dataRows = rows.slice(1);
    
    const cursosProcesados = dataRows
      .filter(row => row.length >= 4 && row[1] && row[3]) // Filtrar filas que tengan Proyecto y FechaInicio
      .map((row, index) => {
        try {
          const proyecto = row[1].trim(); // Columna B: Proyecto
          const fechaInicio = row[3].trim(); // Columna D: FechaInicio
          const estado = row[5] ? row[5].trim() : ''; // Columna F: Estado (opcional)
          
          console.log(`📊 Procesando fila ${index + 2}: Proyecto="${proyecto}", FechaInicio="${fechaInicio}"`);
          
          const fechaParseada = this.parseDate(fechaInicio);
          console.log(`📊 Fecha parseada: ${fechaParseada.toISOString()}`);
          
          return {
            id: `sheet-${index + 1}`,
            title: proyecto,
            date: fechaParseada,
            time: '19:00', // Hora por defecto
            duration: '2 horas', // Duración por defecto
            instructor: 'Pether Peri', // Instructor por defecto
            students: Math.floor(Math.random() * 30) + 15, // Número aleatorio entre 15-45
            status: this.parseStatus(estado),
            type: this.determineType(proyecto), // Determinar tipo basado en el nombre del proyecto
            description: `${proyecto} - Curso especializado de moda y diseño`,
            link: undefined
          };
        } catch (error) {
          console.warn(`⚠️ Error procesando fila ${index + 2}:`, error);
          return null;
        }
      })
      .filter(curso => curso !== null) as CursoEnVivo[];
      
    console.log(`📊 Total cursos procesados: ${cursosProcesados.length}`);
    return cursosProcesados;
  }

  /**
   * Convierte string de fecha a objeto Date
   * Formatos soportados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY
   */
  private parseDate(dateString: string): Date {
    if (!dateString) {
      console.log('📅 Fecha vacía, usando fecha actual');
      return new Date();
    }

    // Limpiar string
    const cleaned = dateString.trim();
    console.log(`📅 Parseando fecha: "${cleaned}"`);

    // Formato DD/MM/YYYY
    if (cleaned.includes('/')) {
      const [day, month, year] = cleaned.split('/');
      const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      console.log(`📅 Formato DD/MM/YYYY → ${fecha.toISOString()}`);
      return fecha;
    }

    // Formato YYYY-MM-DD o DD-MM-YYYY
    if (cleaned.includes('-')) {
      const parts = cleaned.split('-');
      if (parts[0].length === 4) {
        // YYYY-MM-DD
        const fecha = new Date(cleaned);
        console.log(`📅 Formato YYYY-MM-DD → ${fecha.toISOString()}`);
        return fecha;
      } else {
        // DD-MM-YYYY
        const [day, month, year] = parts;
        const fecha = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        console.log(`📅 Formato DD-MM-YYYY → ${fecha.toISOString()}`);
        return fecha;
      }
    }

    // Fallback: intentar parseo directo
    const parsed = new Date(cleaned);
    const esValida = !isNaN(parsed.getTime());
    const fecha = esValida ? parsed : new Date();
    console.log(`📅 Formato directo ${esValida ? 'exitoso' : 'falló'} → ${fecha.toISOString()}`);
    return fecha;
  }

  /**
   * Convierte string de estado a tipo válido
   */
  private parseStatus(statusString: string): CursoEnVivo['status'] {
    if (!statusString) return 'programado';
    
    const status = statusString.toLowerCase().trim();
    
    if (status.includes('iniciado') || status.includes('en vivo') || status.includes('live') || status.includes('activo')) {
      return 'iniciado';
    }
    if (status.includes('próximo') || status.includes('proximo') || status.includes('siguiente')) {
      return 'proximo';
    }
    
    return 'programado';
  }

  /**
   * Determina el tipo de curso basado en el nombre del proyecto
   */
  private determineType(proyecto: string): CursoEnVivo['type'] {
    if (!proyecto) return 'live';
    
    const nombreLower = proyecto.toLowerCase();
    
    if (nombreLower.includes('masterclass') || nombreLower.includes('master class') || nombreLower.includes('especial')) {
      return 'masterclass';
    }
    if (nombreLower.includes('q&a') || nombreLower.includes('qa') || nombreLower.includes('preguntas') || nombreLower.includes('consultas')) {
      return 'qa';
    }
    
    return 'live'; // Por defecto, curso en vivo normal
  }

  /**
   * Convierte string de tipo a tipo válido (método legacy, ahora usa determineType)
   */
  private parseType(typeString: string): CursoEnVivo['type'] {
    if (!typeString) return 'live';
    
    const type = typeString.toLowerCase().trim();
    
    if (type.includes('qa') || type.includes('preguntas')) {
      return 'qa';
    }
    if (type.includes('master') || type.includes('especial')) {
      return 'masterclass';
    }
    
    return 'live';
  }

  /**
   * Datos de fallback cuando Google Sheets no está disponible
   */
  private getFallbackData(): CursoEnVivo[] {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    return [
      {
        id: 'fallback-1',
        title: 'Taller de Patronaje Básico',
        date: tomorrow,
        time: '19:00',
        duration: '2 horas',
        instructor: 'Pether Peri',
        students: 25,
        status: 'proximo',
        type: 'live',
        description: 'Aprende los fundamentos del patronaje con técnicas profesionales'
      },
      {
        id: 'fallback-2',
        title: 'Masterclass: Técnicas Avanzadas',
        date: nextWeek,
        time: '18:00',
        duration: '3 horas',
        instructor: 'Pether Peri',
        students: 15,
        status: 'proximo',
        type: 'masterclass',
        description: 'Sesión especial para estudiantes avanzados'
      }
    ];
  }

  /**
   * Invalida el cache forzando una nueva consulta
   */
  clearCache(): void {
    this.cache.data = null;
    this.cache.timestamp = 0;
  }
}

// Singleton instance
const googleSheetsService = new GoogleSheetsService();

export default googleSheetsService;
export type { CursoEnVivo };