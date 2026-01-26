/**
 * Script para ejecutar el schema de memoria en Supabase
 * 
 * Ejecutar: node scripts/setup-memory-schema.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function setupMemorySchema() {
  console.log('🚀 Configurando schema de MemorySystem en Supabase...\n');

  // Verificar credenciales
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Error: Faltan credenciales de Supabase');
    console.error('   Requerido: SUPABASE_URL y SUPABASE_SECRET_KEY (o SUPABASE_SERVICE_KEY)');
    process.exit(1);
  }

  console.log(`📡 Conectando a: ${supabaseUrl}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Leer el schema SQL
  const schemaPath = path.join(__dirname, '..', 'brain', 'memory', 'strategies', 'supabase-rag-v1', 'schema.sql');
  
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: No se encontró el archivo schema.sql en ${schemaPath}`);
    process.exit(1);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  console.log(`📄 Schema cargado (${schemaSql.length} caracteres)\n`);

  // Dividir el schema en statements individuales
  // (Supabase no permite múltiples statements en una sola query vía API)
  const statements = schemaSql
    .split(/;[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  console.log(`📋 Ejecutando ${statements.length} statements...\n`);

  let success = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const preview = stmt.substring(0, 60).replace(/\n/g, ' ');
    
    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      
      if (error) {
        // Si exec_sql no existe, usar método alternativo
        if (error.message.includes('function') || error.code === '42883') {
          throw new Error('RPC exec_sql no disponible');
        }
        throw error;
      }
      
      console.log(`✅ [${i + 1}/${statements.length}] ${preview}...`);
      success++;
    } catch (err) {
      // Intentar con query directa si RPC falla
      console.log(`⚠️  [${i + 1}/${statements.length}] ${preview}... (requiere SQL Editor)`);
      errors++;
    }
  }

  console.log('\n' + '═'.repeat(50));
  
  if (errors > 0) {
    console.log(`
⚠️  Algunos statements no se pudieron ejecutar vía API.

Para completar la configuración:
1. Ve a https://supabase.com/dashboard/project/${process.env.SUPABASE_PROJECT_ID}/sql
2. Copia el contenido de: brain/memory/strategies/supabase-rag-v1/schema.sql
3. Pégalo en el SQL Editor y click "Run"

El schema incluye:
- Extensión pgvector
- Tabla 'memories' con columna vectorial
- Función 'search_memories' para búsqueda semántica
- Índices optimizados
`);
  } else {
    console.log(`
✅ Schema configurado exitosamente!

Tablas creadas:
- memories (con vector de 384 dimensiones)
- conversations
- conversation_memories

Funciones creadas:
- search_memories (búsqueda semántica)
- update_updated_at (trigger)
`);
  }

  // Verificar que la tabla existe
  console.log('\n🔍 Verificando instalación...');
  
  const { data: tables, error: tablesError } = await supabase
    .from('memories')
    .select('id')
    .limit(1);

  if (tablesError && tablesError.code === '42P01') {
    console.log('❌ Tabla "memories" no existe. Ejecuta el schema manualmente.');
  } else if (tablesError) {
    console.log(`⚠️  Error verificando: ${tablesError.message}`);
  } else {
    console.log('✅ Tabla "memories" existe y es accesible');
  }
}

setupMemorySchema().catch(console.error);
