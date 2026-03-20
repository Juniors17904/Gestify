// =============================================
// CONFIGURACIÓN DE SUPABASE
// Reemplaza estos valores con los de tu proyecto
// =============================================

const SUPABASE_URL = 'https://rvxcgjwzmbmmdwvfvkiu.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bzyT1vyOW9xUDTne82TRfQ_6OSX259C';

// Inicializar Supabase
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Configuración global de la app
const APP_CONFIG = {
  moneda: 'S/',
  stockMinimo: 5,
  version: '1.0.0'
};
