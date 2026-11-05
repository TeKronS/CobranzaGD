// ============================================================
// Cobranza GD — Google Drive & Google Sheets Integration
// ============================================================
// Structure:
//   📁 Cobranza GD/
//   ├── 📊 CobranzaGD_LibroDeCobros (Spreadsheet)
//   │   ├── Negocios                       ← First sheet: all businesses
//   │   ├── Clientes Activos - [Negocio]   ← Dynamic per business
//   │   ├── Clientes Inactivos - [Negocio] ← Dynamic per business
//   │   └── Productos - [Negocio]          ← Only if credito/unico
//   └── 📁 Documentos/
//       └── 📁 [Negocio]/
//           └── 📁 [Cliente]/
//               └── Foto de Perfil.jpg
// ============================================================

import { CONFIG } from './config';
import type { DriveUploadResult, Client, Project, CreditProduct } from '../types';
import { getLocalProjects, saveLocalProjects, getLocalClients, saveLocalClients } from './sheets';

let rootFolderId: string | null = null;
let docsFolderId: string | null = null;
let spreadsheetId: string | null = null;

export interface DriveCheckResult {
  exists: boolean;
  hasData: boolean;
  isUnauthorized?: boolean;
  projects?: Project[];
  clients?: Client[];
  spreadsheetUrl?: string;
  docsFolderUrl?: string;
}

// ────────────────────────────────────────────────────────
// Helper: Throw error if Google response is 401 Unauthenticated
// ────────────────────────────────────────────────────────
function checkAuthStatus(res: Response) {
  if (res.status === 401) {
    const error = new Error('UNAUTHENTICATED');
    (error as any).status = 401;
    throw error;
  }
}

// ────────────────────────────────────────────────────────
// 1. Get or Create Root Folder "Cobranza GD"
// ────────────────────────────────────────────────────────
export async function getOrCreateRootFolder(accessToken: string): Promise<string | null> {
  if (rootFolderId) return rootFolderId;

  try {
    // Search for both new name and legacy name
    const searchNames = [CONFIG.DRIVE_FOLDER_NAME, 'Cobranza GD Data'];
    for (const name of searchNames) {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
          name
        )}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      checkAuthStatus(searchRes);
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        rootFolderId = searchData.files[0].id;
        return rootFolderId;
      }
    }

    // Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: CONFIG.DRIVE_FOLDER_NAME,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    checkAuthStatus(createRes);

    const folder = await createRes.json();
    rootFolderId = folder.id || null;
    return rootFolderId;
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) throw err;
    console.error('Failed to get/create Google Drive root folder:', err);
    return null;
  }
}

// ────────────────────────────────────────────────────────
// 2. Get or Create Documents Subfolder "Documentos"
// ────────────────────────────────────────────────────────
export async function getOrCreateDocsFolder(accessToken: string): Promise<string | null> {
  if (docsFolderId) return docsFolderId;

  const parentId = await getOrCreateRootFolder(accessToken);
  if (!parentId) return null;

  try {
    // Search for both new name and legacy name
    const searchNames = ['Documentos', 'CobranzaGD_Documentos_y_Comprobantes'];
    for (const folderName of searchNames) {
      const searchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
          folderName
        )}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      checkAuthStatus(searchRes);
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        docsFolderId = searchData.files[0].id;
        return docsFolderId;
      }
    }

    // Create new folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Documentos',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
    checkAuthStatus(createRes);

    const folder = await createRes.json();
    docsFolderId = folder.id || null;
    return docsFolderId;
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) throw err;
    console.error('Failed to create Docs subfolder in Drive:', err);
    return null;
  }
}

// ────────────────────────────────────────────────────────
// Helper: Ensure Sheet tabs exist in spreadsheet
// ────────────────────────────────────────────────────────
async function ensureSheetTabsExist(
  sheetId: string,
  accessToken: string,
  requiredTitles: string[]
): Promise<boolean> {
  try {
    const getSheetRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (getSheetRes.ok) {
      const metadata = await getSheetRes.json();
      const existingTitles = new Set(metadata.sheets?.map((s: any) => s.properties?.title) || []);
      const missingTitles = requiredTitles.filter(t => !existingTitles.has(t));

      if (missingTitles.length > 0) {
        const requests = missingTitles.map(title => ({
          addSheet: { properties: { title } },
        }));

        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ requests }),
        });
      }
    }
    return true;
  } catch (err) {
    console.warn('Could not verify/create custom sheet tabs:', err);
    return false;
  }
}

// ────────────────────────────────────────────────────────
// Helper: Find existing spreadsheet in Drive (scoped to root folder)
// ────────────────────────────────────────────────────────
async function findExistingSpreadsheet(accessToken: string): Promise<string | null> {
  try {
    // First try scoped to root folder
    if (rootFolderId) {
      const scopedRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=name contains 'CobranzaGD_LibroDeCobros' and mimeType='application/vnd.google-apps.spreadsheet' and '${rootFolderId}' in parents and trashed=false`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      checkAuthStatus(scopedRes);
      const scopedData = await scopedRes.json();
      if (scopedData.files && scopedData.files.length > 0) {
        return scopedData.files[0].id;
      }
    }
    // Fallback: search anywhere in Drive
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name contains 'CobranzaGD_LibroDeCobros' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    checkAuthStatus(searchRes);
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }
    return null;
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) throw err;
    console.error('Error finding spreadsheet in Drive:', err);
    return null;
  }
}

// ────────────────────────────────────────────────────────
// Helper: Get all existing tab names in a spreadsheet
// ────────────────────────────────────────────────────────
async function getSpreadsheetTabNames(
  sheetId: string,
  accessToken: string
): Promise<Set<string>> {
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return new Set();
    const data = await res.json();
    return new Set(data.sheets?.map((s: any) => s.properties?.title) || []);
  } catch {
    return new Set();
  }
}

// ────────────────────────────────────────────────────────
// Helper: Sanitize cell values for Google Sheets (50k char limit)
// ────────────────────────────────────────────────────────
function sanitizeCellUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('data:')) return '';
  if (url.length > 2000) return '';
  return url;
}

function sanitizeConfig(cfg: any): any {
  if (!cfg || typeof cfg !== 'object') return {};
  const copy: any = { ...cfg };
  for (const k of Object.keys(copy)) {
    if (typeof copy[k] === 'string' && (copy[k].startsWith('data:') || copy[k].length > 2000)) {
      copy[k] = '';
    }
  }
  return copy;
}

// ────────────────────────────────────────────────────────
// Helpers: Sanitize phone and strings to prevent Sheets formula errors
// ────────────────────────────────────────────────────────
export function sanitizePhoneForSheet(phone?: string): string {
  if (!phone) return '';
  const trimmed = String(phone).trim();
  if (trimmed.startsWith('#') || trimmed.toLowerCase() === 'error') return '';
  // If phone starts with '+', '=', or '-', Google Sheets USER_ENTERED treats it as a formula.
  // Prefixing with single quote tells Google Sheets to store it strictly as text.
  if (trimmed.startsWith('+') || trimmed.startsWith('=') || trimmed.startsWith('-')) {
    return `'${trimmed}`;
  }
  return trimmed;
}

export function sanitizeSheetString(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  // Filter out any Google Sheets formula errors like #ERROR!, #REF!, #VALUE!, etc.
  if (str.startsWith('#') || str.toLowerCase() === 'error') return '';
  if (str.startsWith("'")) return str.slice(1);
  return str;
}

// ────────────────────────────────────────────────────────
// Helper: Match client to project by various ID forms
// ────────────────────────────────────────────────────────
function clientBelongsToProject(c: Client, proj: Project, isFirstProject: boolean): boolean {
  return (
    c.proyectoId === proj.id ||
    c.proyectoId?.toLowerCase() === proj.id.toLowerCase() ||
    c.proyectoId?.toLowerCase() === proj.nombre.toLowerCase() ||
    c.proyectoId?.toLowerCase() === `p-${proj.nombre.toLowerCase().replace(/\s+/g, '-')}` ||
    (!c.proyectoId && isFirstProject)
  );
}

// ────────────────────────────────────────────────────────
// Helper: Write values to a sheet range
// ────────────────────────────────────────────────────────
async function writeSheetRange(
  sheetId: string,
  accessToken: string,
  tabName: string,
  values: any[][]
): Promise<boolean> {
  // 1. Clear tab first to ensure old rows are completely wiped out
  try {
    const clearRange = encodeURIComponent(`'${tabName}'!A1:Z10000`);
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${clearRange}:clear`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (clearErr) {
    console.warn(`Could not clear sheet tab '${tabName}':`, clearErr);
  }

  // 2. Put new values
  const range = encodeURIComponent(`'${tabName}'!A1:Z`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );
  checkAuthStatus(res);
  if (!res.ok) {
    console.error(`Error writing to sheet tab '${tabName}':`, res.status, await res.text());
    return false;
  }
  return true;
}

// ────────────────────────────────────────────────────────
// Helper: Read values from a sheet range (returns rows or null)
// ────────────────────────────────────────────────────────
async function readSheetRange(
  sheetId: string,
  accessToken: string,
  tabName: string
): Promise<any[][] | null> {
  const range = encodeURIComponent(`'${tabName}'!A2:Z`);
  try {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    checkAuthStatus(res);
    if (!res.ok) return null;
    const data = await res.json();
    return data.values || [];
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) throw err;
    return null;
  }
}

// ────────────────────────────────────────────────────────
// CLIENT ROW HEADERS (shared across all business sheets)
// ────────────────────────────────────────────────────────
const CLIENT_HEADERS = [
  'ID Cliente',
  'Negocio / Cartera',
  'Modelo de Negocio',
  'Nombre Cliente',
  'RIF / DNI / Identificación',
  'Teléfono WhatsApp',
  'Email',
  'Monto Cuota / Total',
  'Moneda',
  'Frecuencia',
  'Fecha Vencimiento',
  'Estado',
  'Notas',
  'Fecha Registro',
  'Foto Cliente URL',
  'Documento Legal URL',
  'Configuración Avanzada',
];

const PRODUCT_HEADERS = [
  'ID Producto',
  'ID Negocio',
  'Negocio',
  'Nombre Producto',
  'Modelo',
  'Precio Base',
  'Serial / VIN / ID',
  'Fecha Registro',
];

function formatClientRow(c: Client, proj?: Project) {
  return [
    c.id,
    proj?.nombre || 'General',
    proj?.tipo || (c.config?.planNombre ? 'Suscripción' : 'Préstamo'),
    c.nombre,
    sanitizePhoneForSheet(c.identificacion || c.cedula || ''),
    sanitizePhoneForSheet(c.telefono),
    c.email || '',
    c.monto,
    c.moneda,
    c.frecuencia,
    c.fechaVence,
    c.estado,
    c.notas || '',
    c.fechaRegistro,
    sanitizeCellUrl(c.driveFotoURL),
    sanitizeCellUrl(c.documentoLegalURL || c.config?.documentoLegalUrl),
    JSON.stringify(sanitizeConfig(c.config || {})),
  ];
}

function formatProductRow(prod: CreditProduct, projName: string) {
  return [
    prod.id,
    prod.proyectoId,
    projName,
    prod.nombre,
    prod.modelo || '',
    prod.precio,
    prod.serial || '',
    prod.fechaRegistro || new Date().toISOString().split('T')[0],
  ];
}

// ════════════════════════════════════════════════════════
// 3. SYNC SPREADSHEET TO DRIVE (MAIN WRITE FUNCTION)
// ════════════════════════════════════════════════════════
export async function syncExcelSpreadsheetToDrive(
  accessToken: string,
  clients: Client[],
  projects: Project[]
): Promise<{ spreadsheetId: string; spreadsheetUrl: string } | null> {
  try {
    const parentId = await getOrCreateRootFolder(accessToken);
    const fileName = '📊 CobranzaGD_LibroDeCobros';

    let currentId = spreadsheetId;
    if (!currentId) {
      currentId = await findExistingSpreadsheet(accessToken);
    }

    // CREATE NEW SPREADSHEET if none exists
    if (!currentId) {
      console.log('[Cobranza GD] Creating new spreadsheet...');
      const createSheetRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          properties: { title: fileName },
          sheets: [{ properties: { title: 'Negocios' } }],
        }),
      });

      if (!createSheetRes.ok) {
        checkAuthStatus(createSheetRes);
        console.error('[Cobranza GD] Failed to create spreadsheet:', createSheetRes.status, await createSheetRes.text());
        return null;
      }

      const sheetData = await createSheetRes.json();
      currentId = sheetData.spreadsheetId;
      console.log('[Cobranza GD] Spreadsheet created:', currentId);

      // Move into Cobranza GD folder (remove from root, add to folder)
      if (currentId && parentId) {
        const moveRes = await fetch(
          `https://www.googleapis.com/drive/v3/files/${currentId}?addParents=${parentId}&removeParents=root&fields=id,parents`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${accessToken}` },
          }
        );
        if (!moveRes.ok) {
          console.warn('[Cobranza GD] Could not move spreadsheet to folder:', moveRes.status);
        } else {
          console.log('[Cobranza GD] Spreadsheet moved to Cobranza GD folder');
        }
      }
    }

    if (!currentId) return null;
    spreadsheetId = currentId;

    // ── BUILD REQUIRED TABS ──
    const requiredTabs = ['Negocios'];
    for (const p of projects) {
      requiredTabs.push(`Clientes Activos - ${p.nombre}`);
      requiredTabs.push(`Clientes Inactivos - ${p.nombre}`);
      if (p.tipo === 'credito' || p.tipo === 'unico') {
        requiredTabs.push(`Productos - ${p.nombre}`);
      }
    }
    await ensureSheetTabsExist(currentId, accessToken, requiredTabs);

    // ── A. WRITE "Negocios" SHEET (first sheet) ──
    const negociosHeaders = [
      'ID Negocio',
      'Nombre Negocio',
      'Modelo de Negocio',
      'Fecha Registro',
      'Planes de Suscripción',
    ];
    const negociosRows = projects.map(p => [
      p.id,
      p.nombre,
      p.tipo,
      p.fechaRegistro || new Date().toISOString().split('T')[0],
      JSON.stringify(p.planesSuscripcion || []),
    ]);
    await writeSheetRange(currentId, accessToken, 'Negocios', [negociosHeaders, ...negociosRows]);

    // ── B. WRITE PER-BUSINESS SHEETS ──
    const projectMap = new Map(projects.map(p => [p.id, p]));

    for (const proj of projects) {
      const projClients = clients.filter(c => clientBelongsToProject(c, proj, projects[0]?.id === proj.id));

      // Active vs Inactive classification
      const isInactive = (c: Client) =>
        c.estado === 'inactivo' ||
        c.estado === 'pagado' ||
        c.estado === 'archivado' ||
        c.estado === 's_finalizado' ||
        c.estado === 'u_cero';

      const activeClients = projClients.filter(c => !isInactive(c));
      const inactiveClients = projClients.filter(c => isInactive(c));

      await writeSheetRange(currentId, accessToken, `Clientes Activos - ${proj.nombre}`, [
        CLIENT_HEADERS,
        ...activeClients.map(c => formatClientRow(c, proj)),
      ]);
      await writeSheetRange(currentId, accessToken, `Clientes Inactivos - ${proj.nombre}`, [
        CLIENT_HEADERS,
        ...inactiveClients.map(c => formatClientRow(c, proj)),
      ]);

      // Products sheet (only for credito / unico)
      if (proj.tipo === 'credito' || proj.tipo === 'unico') {
        const prods = proj.productosCredito || [];
        await writeSheetRange(currentId, accessToken, `Productos - ${proj.nombre}`, [
          PRODUCT_HEADERS,
          ...prods.map(prod => formatProductRow(prod, proj.nombre)),
        ]);
      }
    }

    const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${currentId}/edit`;
    return { spreadsheetId: currentId, spreadsheetUrl };
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) throw err;
    console.error('Error syncing Excel spreadsheet to Google Drive:', err);
    return null;
  }
}

// ════════════════════════════════════════════════════════
// 4. CHECK AND LOAD EXISTING DRIVE DATA ON LOGIN
// ════════════════════════════════════════════════════════
export async function checkAndLoadUserDriveStorage(accessToken: string): Promise<DriveCheckResult> {
  try {
    // Reset cached IDs to force fresh lookup
    rootFolderId = null;
    docsFolderId = null;
    spreadsheetId = null;

    await getOrCreateRootFolder(accessToken);
    const dFolderId = await getOrCreateDocsFolder(accessToken);

    const existingFileId = await findExistingSpreadsheet(accessToken);

    const docsFolderUrl = dFolderId
      ? `https://drive.google.com/drive/folders/${dFolderId}`
      : `https://drive.google.com/drive/my-drive`;

    let loadedProjects: Project[] = [];
    let loadedClients: Client[] = [];
    let spreadsheetUrl = '';

    // ════════════════════════════════════════════════════
    // CASE 1: Spreadsheet EXISTS on Drive → read from it
    // ════════════════════════════════════════════════════
    if (existingFileId) {
      spreadsheetId = existingFileId;
      spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${existingFileId}/edit`;

      // Pre-fetch all existing tab names to avoid 400 errors
      const existingTabs = await getSpreadsheetTabNames(existingFileId, accessToken);
      console.log('[Cobranza GD] Existing tabs:', Array.from(existingTabs));

      // ── READ "Negocios" SHEET (try new name, then legacy name) ──
      let projRows: any[][] | null = null;
      if (existingTabs.has('Negocios')) {
        projRows = await readSheetRange(existingFileId, accessToken, 'Negocios');
      } else if (existingTabs.has('Negocios y Carteras')) {
        projRows = await readSheetRange(existingFileId, accessToken, 'Negocios y Carteras');
      }

      if (projRows && projRows.length > 0) {
        const localProjects = getLocalProjects();
        const localProjectsMap = new Map(localProjects.map(p => [p.id, p]));

        loadedProjects = projRows.map((r: any[], i: number) => {
          const id = r[0] || `p-${i + 1}`;
          let planes: any[] = [];
          if (r[4]) {
            try {
              planes = typeof r[4] === 'string' ? JSON.parse(r[4]) : r[4];
            } catch { planes = []; }
          }
          if (!Array.isArray(planes) || planes.length === 0) {
            const localProj = localProjectsMap.get(id);
            if (localProj?.planesSuscripcion && localProj.planesSuscripcion.length > 0) {
              planes = localProj.planesSuscripcion;
            }
          }
          return {
            id,
            nombre: r[1] || 'Mi Negocio',
            tipo: (r[2] as any) || 'credito',
            fechaRegistro: r[3] || new Date().toISOString().split('T')[0],
            planesSuscripcion: planes,
            productosCredito: localProjectsMap.get(id)?.productosCredito || [],
          };
        });
      }

      // ── READ PER-BUSINESS CLIENT SHEETS ──
      for (const proj of loadedProjects) {
        const activeTabName = `Clientes Activos - ${proj.nombre}`;
        if (existingTabs.has(activeTabName)) {
          const activeRows = await readSheetRange(existingFileId, accessToken, activeTabName);
          if (activeRows && activeRows.length > 0) {
            const parsed = activeRows.map((r: any[], i: number) => parseClientRow(r, i, proj, loadedProjects));
            loadedClients.push(...parsed);
          }
        }

        const inactiveTabName = `Clientes Inactivos - ${proj.nombre}`;
        if (existingTabs.has(inactiveTabName)) {
          const inactiveRows = await readSheetRange(existingFileId, accessToken, inactiveTabName);
          if (inactiveRows && inactiveRows.length > 0) {
            const parsed = inactiveRows.map((r: any[], i: number) => parseClientRow(r, i, proj, loadedProjects));
            loadedClients.push(...parsed);
          }
        }

        if (proj.tipo === 'credito' || proj.tipo === 'unico') {
          const prodTabName = `Productos - ${proj.nombre}`;
          let prodRows: any[][] | null = null;
          if (existingTabs.has(prodTabName)) {
            prodRows = await readSheetRange(existingFileId, accessToken, prodTabName);
          } else if (existingTabs.has('Productos a Crédito')) {
            prodRows = await readSheetRange(existingFileId, accessToken, 'Productos a Crédito');
            if (prodRows) {
              prodRows = prodRows.filter((r: any[]) => r[1] === proj.id || r[2] === proj.nombre);
            }
          }
          if (prodRows && prodRows.length > 0) {
            const products: CreditProduct[] = prodRows.map((r: any[], i: number) => ({
              id: r[0] || `prod-${i + 1}`,
              proyectoId: r[1] || proj.id,
              nombre: r[3] || 'Producto',
              modelo: r[4] || '',
              precio: parseFloat(r[5]) || 0,
              serial: r[6] || '',
              fechaRegistro: r[7] || new Date().toISOString().split('T')[0],
            }));
            proj.productosCredito = products;
          }
        }
      }

      // ── LEGACY MIGRATION: Try reading "Libro de Cobros" if no clients found ──
      if (loadedClients.length === 0 && loadedProjects.length > 0 && existingTabs.has('Libro de Cobros')) {
        const legacyRows = await readSheetRange(existingFileId, accessToken, 'Libro de Cobros');
        if (legacyRows && legacyRows.length > 0) {
          loadedClients = legacyRows.map((r: any[], i: number) => parseClientRow(r, i, undefined, loadedProjects));
        }
      }

      // ── GOOGLE DRIVE SPREADSHEET IS SINGLE SOURCE OF TRUTH ──
      // Synchronize local storage to the exact state fetched from Google Sheets.
      // This ensures manual row deletions directly in Google Sheets/Excel are immediately reflected in the app.
      saveLocalProjects(loadedProjects);
      saveLocalClients(loadedClients);

      if (loadedProjects.length > 0) {
        return {
          exists: true,
          hasData: true,
          projects: loadedProjects,
          clients: loadedClients,
          spreadsheetUrl,
          docsFolderUrl,
        };
      }

      // Spreadsheet exists but has no projects → return empty with spreadsheet url
      return {
        exists: true,
        hasData: false,
        projects: [],
        clients: [],
        spreadsheetUrl,
        docsFolderUrl,
      };
    }

    // ════════════════════════════════════════════════════
    // CASE 2: NO Spreadsheet on Drive → fresh start
    // Clear localStorage to prevent stale data from reappearing
    // ════════════════════════════════════════════════════
    saveLocalProjects([]);
    saveLocalClients([]);

    const newExcel = await syncExcelSpreadsheetToDrive(accessToken, [], []);
    return {
      exists: false,
      hasData: false,
      projects: [],
      clients: [],
      spreadsheetUrl: newExcel?.spreadsheetUrl,
      docsFolderUrl,
    };
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) {
      console.warn('[Cobranza GD] Google Drive access token expired or invalid (401).');
      return { exists: false, hasData: false, isUnauthorized: true };
    }
    console.error('Error checking user drive storage:', err);
    return { exists: false, hasData: false };
  }
}

// ────────────────────────────────────────────────────────
// Helper: Parse a single client row from Google Sheets
// ────────────────────────────────────────────────────────
function parseClientRow(r: any[], i: number, proj?: Project, allProjects?: Project[]): Client {
  let configObj: any = {};
  if (r[16]) {
    try {
      configObj = typeof r[16] === 'string' ? JSON.parse(r[16]) : r[16];
    } catch { configObj = {}; }
  }

  let pId = proj?.id || 'p-default';
  if (!proj && allProjects && allProjects.length > 0) {
    const rawProjName = String(r[1] || 'General').trim();
    const matchedProj = allProjects.find(p => p.nombre.toLowerCase() === rawProjName.toLowerCase());
    pId = matchedProj ? matchedProj.id : `p-${rawProjName.toLowerCase().replace(/\s+/g, '-')}`;
  }

  return {
    id: r[0] || `cli-${Date.now()}-${i}`,
    proyectoId: pId,
    nombre: sanitizeSheetString(r[3]) || 'Cliente',
    cedula: sanitizeSheetString(r[4]),
    identificacion: sanitizeSheetString(r[4]),
    telefono: sanitizeSheetString(r[5]),
    email: sanitizeSheetString(r[6]),
    monto: parseFloat(r[7]) || 0,
    moneda: r[8] || 'USD',
    fechaInicio: sanitizeSheetString(r[13]) || new Date().toISOString().split('T')[0],
    frecuencia: r[9] || 'mensual',
    fechaVence: sanitizeSheetString(r[10]),
    estado: r[11] || 'activo',
    notas: sanitizeSheetString(r[12]),
    fechaRegistro: sanitizeSheetString(r[13]) || new Date().toISOString().split('T')[0],
    driveFotoURL: r[14] || '',
    documentoLegalURL: r[15] || '',
    config: configObj,
  };
}

// ════════════════════════════════════════════════════════
// 5. FOLDER HELPERS (for client documents)
// ════════════════════════════════════════════════════════

// Get or create any named subfolder under a parentId in Google Drive
export async function getOrCreateFolder(
  accessToken: string,
  folderName: string,
  parentId: string
): Promise<string | null> {
  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=name='${encodeURIComponent(
        folderName.replace(/'/g, "\\'")
      )}' and mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    checkAuthStatus(searchRes);

    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      return searchData.files[0].id;
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
    checkAuthStatus(createRes);

    const folder = await createRes.json();
    return folder.id || null;
  } catch (err: any) {
    if (err?.message === 'UNAUTHENTICATED' || err?.status === 401) throw err;
    console.error(`Error getting/creating folder '${folderName}' in Drive:`, err);
    return null;
  }
}

// ════════════════════════════════════════════════════════
// 6. UPLOAD CLIENT FILES TO DRIVE
// ════════════════════════════════════════════════════════
// Path: Cobranza GD / Documentos / [Negocio] / [Cliente] / Foto de Perfil.jpg
export async function uploadClientFileToDrive(
  file: File,
  accessToken: string,
  businessName: string,
  clientName: string,
  isProfilePhoto: boolean = false,
  clientCedula?: string
): Promise<DriveUploadResult | null> {
  try {
    const docsFId = await getOrCreateDocsFolder(accessToken);
    if (!docsFId) return null;

    const bName = businessName.trim() || 'General';
    const cName = clientName.trim() || 'Cliente';
    const clientFolderName = clientCedula ? `${cName} - ${clientCedula}` : cName;

    // 1. Documentos / [Negocio]
    const businessFolderId = await getOrCreateFolder(accessToken, bName, docsFId);
    if (!businessFolderId) return null;

    // 2. Documentos / [Negocio] / [Cliente]
    const clientFolderId = await getOrCreateFolder(accessToken, clientFolderName, businessFolderId);
    if (!clientFolderId) return null;

    // 3. File naming: profile photo → "Foto de Perfil"
    let fileName = file.name;
    if (isProfilePhoto) {
      const ext = file.name.includes('.') ? `.${file.name.split('.').pop()}` : '';
      fileName = `Foto de Perfil${ext}`;
    }

    const metadata = {
      name: fileName,
      parents: [clientFolderId],
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const res = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink,webContentLink',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      }
    );

    const data = await res.json();
    if (data.id) {
      return {
        id: data.id,
        viewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
        directLink: `https://lh3.googleusercontent.com/u/0/d/${data.id}`,
      };
    }
    return null;
  } catch (err) {
    console.error('Error uploading client file to Drive subfolder structure:', err);
    return null;
  }
}

// Legacy alias
export async function uploadDocumentToDriveFolder(
  file: File,
  accessToken: string,
  clientName: string,
  businessName?: string
): Promise<DriveUploadResult | null> {
  return uploadClientFileToDrive(file, accessToken, businessName || 'General', clientName, true);
}
