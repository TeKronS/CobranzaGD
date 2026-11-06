// ============================================================
// Cobranza GD — Google Drive Powered Configuration
// ============================================================

import type { AppConfig } from '../types';

export const CONFIG = {
  GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '369087388399-63sc0eeit4pbuqbdhcnrju44ab4pf3rr.apps.googleusercontent.com',
  SHEETS_ID: process.env.NEXT_PUBLIC_SHEETS_ID || '1KQmzHzP5iuC7192TK4C0ZYHykMF0QWvtBG0yno8Hduc',
  GOOGLE_SCOPES: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive',
    'openid',
    'email',
    'profile'
  ].join(' '),

  SHEETS: {
    CLIENTES: 'Clientes',
    USUARIOS: 'Usuarios',
  },

  DRIVE_FOLDER_NAME: 'Cobranza GD',
  DIAS_AVISO: 7,
  APP_NAME: 'Cobranza GD',
  APP_VERSION: '3.0.0 (Mobile PWA)',
  ADMIN_WHATSAPP: '+584224461819',
} as const;
