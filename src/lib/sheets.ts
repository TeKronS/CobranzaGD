// ============================================================
// Cobranza GD — Google Sheets & LocalStorage Persistence Engine
// ============================================================

import type { Client, Project } from '../types';
import { CONFIG } from './config';

// Updated v4 keys to prevent old browser localStorage cache from showing mock data
const LOCAL_STORAGE_CLIENTS_KEY = 'cgd_v4_user_clients';
const LOCAL_STORAGE_PROJECTS_KEY = 'cgd_v4_user_projects';

// INITIAL CLEAN SLATE FOR NEW USERS (0 DUMMY DATA)
export const INITIAL_PROJECTS: Project[] = [];
export const INITIAL_CLIENTS: Client[] = [];

// Automatic cleanup of legacy mock storage keys
function wipeLegacyMockCache() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem('cobranza_gd_clients');
    localStorage.removeItem('cobranza_gd_projects');
  } catch (err) {
    // Ignore cleanup error
  }
}

export function getLocalProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  wipeLegacyMockCache();
  
  const stored = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
  if (!stored) return [];
  
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
}

function cleanClientFields(c: Client): Client {
  if (!c) return c;
  let tel = c.telefono ? String(c.telefono).trim() : '';
  if (tel.startsWith('#') || tel.toLowerCase() === 'error') {
    tel = '';
  } else if (tel.startsWith("'")) {
    tel = tel.slice(1);
  }
  let ced = c.cedula ? String(c.cedula).trim() : '';
  if (ced.startsWith('#') || ced.toLowerCase() === 'error') {
    ced = '';
  } else if (ced.startsWith("'")) {
    ced = ced.slice(1);
  }
  return {
    ...c,
    telefono: tel,
    cedula: ced,
    identificacion: c.identificacion ? (c.identificacion.startsWith('#') ? '' : c.identificacion.replace(/^'/, '')) : ced,
  };
}

function sanitizePhoneForSheetLocal(phone?: string): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (trimmed.startsWith('#') || trimmed.toLowerCase() === 'error') return '';
  if (trimmed.startsWith('+') || trimmed.startsWith('=') || trimmed.startsWith('-')) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function getLocalClients(): Client[] {
  if (typeof window === 'undefined') return [];
  wipeLegacyMockCache();
  
  const stored = localStorage.getItem(LOCAL_STORAGE_CLIENTS_KEY);
  if (!stored) return [];

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(cleanClientFields);
  } catch {
    return [];
  }
}

export function saveLocalClients(clients: Client[]): void {
  if (typeof window === 'undefined') return;
  const cleaned = (clients || []).map(cleanClientFields);
  localStorage.setItem(LOCAL_STORAGE_CLIENTS_KEY, JSON.stringify(cleaned));
}

export function clearAllLocalState(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(LOCAL_STORAGE_CLIENTS_KEY);
  localStorage.removeItem(LOCAL_STORAGE_PROJECTS_KEY);
  localStorage.removeItem('cobranza_gd_clients');
  localStorage.removeItem('cobranza_gd_projects');
}

export async function syncClientsFromSheets(accessToken: string): Promise<Client[] | null> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEETS_ID}/values/${CONFIG.SHEETS.CLIENTES}!A2:Z`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const rows = data.values || [];

    const sanitizeVal = (val: any) => {
      if (!val) return '';
      const s = String(val).trim();
      if (s.startsWith('#') || s.toLowerCase() === 'error') return '';
      return s.startsWith("'") ? s.slice(1) : s;
    };

    const clients: Client[] = rows.map((row: any[], i: number) => ({
      id: row[0] || `cli-${i + 1}`,
      proyectoId: row[1] || 'p-default',
      nombre: sanitizeVal(row[2]) || 'Cliente',
      cedula: sanitizeVal(row[3]),
      identificacion: sanitizeVal(row[3]),
      telefono: sanitizeVal(row[4]),
      email: sanitizeVal(row[5]),
      monto: parseFloat(row[6]) || 0,
      moneda: row[7] || 'USD',
      fechaInicio: sanitizeVal(row[8]),
      fechaVence: sanitizeVal(row[9]),
      frecuencia: row[10] || 'mensual',
      estado: row[11] || 'activo',
      notas: sanitizeVal(row[12]),
      driveFotoURL: row[13] || '',
      fechaRegistro: sanitizeVal(row[14]) || new Date().toISOString().split('T')[0],
      planPagos: row[15] ? JSON.parse(row[15]) : [],
      config: row[16] ? JSON.parse(row[16]) : {},
    }));

    saveLocalClients(clients);
    return clients;
  } catch (err) {
    console.error('Sheets sync error:', err);
    return null;
  }
}

export async function pushClientsToSheets(clients: Client[], accessToken: string): Promise<boolean> {
  try {
    const values = clients.map(c => [
      c.id,
      c.proyectoId,
      c.nombre,
      sanitizePhoneForSheetLocal(c.cedula),
      sanitizePhoneForSheetLocal(c.telefono),
      c.email,
      c.monto,
      c.moneda,
      c.fechaInicio,
      c.fechaVence,
      c.frecuencia,
      c.estado,
      c.notas,
      c.driveFotoURL,
      c.fechaRegistro,
      JSON.stringify(c.planPagos || []),
      JSON.stringify(c.config || {}),
    ]);

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${CONFIG.SHEETS_ID}/values/${CONFIG.SHEETS.CLIENTES}!A2:Z?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    return res.ok;
  } catch (err) {
    console.error('Sheets push error:', err);
    return false;
  }
}
