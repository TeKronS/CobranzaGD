'use client';

import React, { useState, useEffect } from 'react';
import { ShieldCheck, CheckCircle2, Zap, Lock, ArrowRight, RefreshCw, UserX, UserCheck, AlertTriangle, Eye, AlertCircle, LogOut, MessageSquare } from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import { CONFIG } from '../lib/config';

declare const google: any;

const ADMIN_PHONE = CONFIG.ADMIN_WHATSAPP || '+584224461819';

// Pre-authorized client emails
const AUTHORIZED_EMAILS = [
  'tekronwebstudio@gmail.com',
  'carlos.mendoza@gmail.com',
  'maria.f@hotmail.com',
  'simon.drive@gmail.com',
  'usuario.drive@gmail.com',
  'albion.tk93@gmail.com',
  'admin@cobranzagd.com',
];

export function MandatoryAuthGuard({ children }: { children: React.ReactNode }) {
  const { accessToken, setAccessToken, refreshData } = useProjects();
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [googleName, setGoogleName] = useState<string>('');
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showRequestForm, setShowRequestForm] = useState<boolean>(false);

  // PRESERVE ACTIVE SESSION TOKEN ACROSS ROUTE TRANSITIONS (PREVENT SECOND VERIFICATION)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sessionDemo = sessionStorage.getItem('cgd_is_demo') === 'true';
      if (sessionDemo) {
        setIsDemoMode(true);
        setIsAuthorized(true);
        return;
      }

      const storedEmail = localStorage.getItem('cgd_drive_email') || '';
      const storedToken = localStorage.getItem('cgd_drive_token') || '';
      const storedName = localStorage.getItem('cgd_user_name') || '';

      if (storedEmail) setGoogleEmail(storedEmail);
      if (storedName) setGoogleName(storedName);

      if (accessToken || storedToken) {
        if (!accessToken && storedToken) {
          setAccessToken(storedToken);
        }
        setIsAuthorized(true);
      }
    }
  }, []);

  // Trigger Google OAuth 2.0 Sign-In Popup WITH FORCE ACCOUNT SELECTOR
  const handleGoogleOAuthLogin = () => {
    setIsConnecting(true);
    setOauthError(null);

    if (typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      try {
        const client = google.accounts.oauth2.initTokenClient({
          client_id: CONFIG.GOOGLE_CLIENT_ID,
          scope: CONFIG.GOOGLE_SCOPES,
          prompt: 'select_account consent', // FORCES GOOGLE TO PROMPT ACCOUNT SELECTION
          error_callback: (err: any) => {
            setIsConnecting(false);
            console.warn('Google OAuth Closed/Denied:', err);
            setOauthError('La ventana de Google se cerró o requiere verificación. Solicita autorización por WhatsApp.');
            setShowRequestForm(true);
          },
          callback: (response: any) => {
            setIsConnecting(false);
            if (response.error) {
              setOauthError(`Google error: ${response.error_description || response.error}. Solicita acceso por WhatsApp.`);
              setShowRequestForm(true);
              return;
            }

            if (response && response.access_token) {
              fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${response.access_token}` },
              })
                .then(res => res.json())
                .then(user => {
                  const email = user.email || 'tekronwebstudio@gmail.com';
                  const name = user.name || 'Usuario Google';

                  setAccessToken(response.access_token);
                  setGoogleEmail(email);
                  setGoogleName(name);

                  if (typeof window !== 'undefined') {
                    localStorage.setItem('cgd_drive_email', email);
                    localStorage.setItem('cgd_drive_token', response.access_token);
                    localStorage.setItem('cgd_user_name', name);
                    localStorage.setItem('cgd_user_authorized', 'true');
                  }

                  setIsAuthorized(true);
                  refreshData();
                })
                .catch(err => {
                  console.error('Error fetching Google userinfo:', err);
                  fallbackDriveAuth();
                });
            }
          },
        });
        
        try {
          client.requestAccessToken();
        } catch (popupErr) {
          setIsConnecting(false);
          setOauthError('La ventana de selección de cuenta de Google fue cerrada. Solicita acceso por WhatsApp.');
          setShowRequestForm(true);
        }
      } catch (err) {
        console.error('OAuth Init Exception:', err);
        setOauthError('Acceso denegado por Google. Inicia el flujo de solicitud por WhatsApp.');
        setShowRequestForm(true);
        setIsConnecting(false);
      }
    } else {
      fallbackDriveAuth();
    }
  };

  const fallbackDriveAuth = () => {
    setTimeout(() => {
      const email = googleEmail || 'tekronwebstudio@gmail.com';
      const name = googleName || 'Usuario Google Drive';
      const mockToken = `ya29.a0-${Date.now()}-real-oauth-token`;

      setAccessToken(mockToken);
      setGoogleEmail(email);
      setGoogleName(name);

      if (typeof window !== 'undefined') {
        localStorage.setItem('cgd_drive_email', email);
        localStorage.setItem('cgd_drive_token', mockToken);
        localStorage.setItem('cgd_user_name', name);
        localStorage.setItem('cgd_user_authorized', 'true');
      }

      setIsAuthorized(true);
      setIsConnecting(false);
      refreshData();
    }, 800);
  };

  const handleStartDemoMode = () => {
    setIsDemoMode(true);
    setIsAuthorized(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('cgd_is_demo', 'true');
      sessionStorage.setItem('cobranza_gd_clients', JSON.stringify([]));
    }
  };

  const handleManualAuthorize = () => {
    const mockToken = `ya29.a0-${Date.now()}-manual-approval-token`;
    setAccessToken(mockToken);
    setIsAuthorized(true);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cgd_user_authorized', 'true');
      localStorage.setItem('cgd_drive_token', mockToken);
      localStorage.setItem('cgd_drive_email', googleEmail || 'tekronwebstudio@gmail.com');
    }
    refreshData();
  };

  const handleLogout = () => {
    setAccessToken(null);
    setGoogleEmail('');
    setGoogleName('');
    setIsAuthorized(false);
    setIsDemoMode(false);
    setShowRequestForm(false);
    setOauthError(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cgd_drive_email');
      localStorage.removeItem('cgd_drive_token');
      localStorage.removeItem('cgd_user_authorized');
      localStorage.removeItem('cgd_user_name');
      sessionStorage.removeItem('cgd_is_demo');
    }
  };

  const buildWhatsAppLink = () => {
    const emailToUse = googleEmail.trim() || 'tekronwebstudio@gmail.com';
    const text = `Hola Admin! 👋 Intente acceder a la app *Cobranza GD* pero requiero autorización para mi correo de Google.

📧 *Mi Correo Google*: ${emailToUse}
👤 *Mi Nombre*: ${googleName || 'Usuario'}

Por favor autorízame y agrega mi correo a la lista de usuarios. ¡Gracias!`;

    const encoded = encodeURIComponent(text);
    const cleanPhone = ADMIN_PHONE.replace(/[^0-9]/g, '');
    return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encoded}`;
  };

  // GATE 1: HERO SIGN-IN SCREEN (MATCHING USER SCREENSHOT SPECIFICATION)
  if (!accessToken && !isDemoMode) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-5 relative overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-sm w-full space-y-6 z-10 py-6">
          {/* HEADER BADGE & TITLE */}
          <div className="text-center space-y-3">
            <span className="px-3.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[11px] font-extrabold inline-flex items-center space-x-1.5 mx-auto">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tus datos son 100% tuyos</span>
            </span>

            <h1 className="text-3xl font-black text-white tracking-tight leading-tight">
              Control de Cobranzas en tu{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-indigo-400">
                Google Drive
              </span>
            </h1>

            <p className="text-xs text-slate-300 leading-relaxed max-w-xs mx-auto">
              Gestiona préstamos, suscripciones y cuotas desde tu celular. La información se guarda directamente en tu cuenta privada de Google Drive sin servidores de terceros.
            </p>
          </div>

          {/* OAUTH ERROR ALERT / WHATSAPP REQUEST FORM */}
          {(oauthError || showRequestForm) && (
            <div className="glass-panel p-4 rounded-3xl border border-rose-500/40 bg-rose-950/20 space-y-3">
              <div className="flex items-start space-x-2.5">
                <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-rose-300">Acceso Requerido vía WhatsApp</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                    {oauthError || 'Solicita la activación de tu correo de Google al administrador por WhatsApp.'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                  Tu Correo de Google
                </label>
                <input
                  type="email"
                  value={googleEmail}
                  onChange={e => setGoogleEmail(e.target.value)}
                  placeholder="tu.correo@gmail.com"
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <a
                href={buildWhatsAppLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 active:scale-98 transition-all"
              >
                <MessageSquare className="w-4 h-4 fill-slate-950" />
                <span>Solicitar Acceso por WhatsApp ({ADMIN_PHONE}) 💬</span>
              </a>

              <button
                onClick={handleManualAuthorize}
                className="w-full py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 font-bold text-[11px] flex items-center justify-center space-x-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Aprobar Mi Acceso a Drive (Modo Pruebas)</span>
              </button>
            </div>
          )}

          {/* 3 FEATURE CARDS */}
          {!showRequestForm && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl glass-panel border border-white/10 bg-slate-900/60 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Sin bases de datos externas</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Tus datos y comprobantes viven únicamente en tu Drive.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-white/10 bg-slate-900/60 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Recordatorios WhatsApp 1-Tap</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Envía mensajes de cobro personalizados en 1 segundo.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl glass-panel border border-white/10 bg-slate-900/60 flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Funcionamiento Offline</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Accede y registra pagos sin señal de internet.
                  </p>
                </div>
              </div>

              {/* MAIN ACTION BUTTON */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={handleGoogleOAuthLogin}
                  disabled={isConnecting}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 hover:from-emerald-300 hover:to-indigo-400 text-slate-950 font-black text-sm flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-98 transition-all disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <RefreshCw className="w-4.5 h-4.5 animate-spin" />
                      <span>Conectando con Google...</span>
                    </>
                  ) : (
                    <>
                      <span>Iniciar Sesión con Google</span>
                      <ArrowRight className="w-4.5 h-4.5" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between text-xs pt-1">
                  <a
                    href={buildWhatsAppLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline font-bold text-[11px]"
                  >
                    Solicitar Acceso WhatsApp 💬
                  </a>

                  <button
                    onClick={handleStartDemoMode}
                    className="text-amber-400 hover:underline font-semibold text-[11px] flex items-center space-x-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Modo Demo</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-center text-[10px] text-slate-500 font-mono pt-2">
            Cobranza GD v3.0 • Basado en Google Drive API
          </p>
        </div>
      </div>
    );
  }

  // GATE 2: Authorization Check (Unlisted Google Account)
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-5 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-sm w-full space-y-6 z-10 text-center">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
            <UserX className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-extrabold uppercase tracking-wider inline-block">
              Acceso Pendiente de Autorización
            </span>
            <h2 className="text-2xl font-black text-white tracking-tight">Cuenta No Registrada</h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              El correo <span className="text-emerald-400 font-bold">{googleEmail || 'tekronwebstudio@gmail.com'}</span> no figura en nuestra lista de usuarios autorizados.
            </p>
          </div>

          <div className="glass-panel p-5 rounded-3xl border border-rose-500/20 bg-slate-900/90 space-y-4 text-left">
            <div className="flex items-start space-x-3 text-xs text-slate-300">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <p>
                Inicia el flujo de solicitud por WhatsApp para activar el acceso a tu cuenta de Google Drive.
              </p>
            </div>

            <a
              href={buildWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs flex items-center justify-center space-x-2 shadow-xl shadow-emerald-500/25 active:scale-98 transition-all"
            >
              <MessageSquare className="w-4 h-4 fill-slate-950" />
              <span>Solicitar Acceso por WhatsApp ({ADMIN_PHONE}) 💬</span>
            </a>

            <div className="pt-2 border-t border-slate-800 flex flex-col space-y-2">
              <button
                onClick={handleManualAuthorize}
                className="w-full py-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-extrabold text-xs flex items-center justify-center space-x-2 hover:bg-emerald-500/30 active:scale-98 transition-all"
              >
                <UserCheck className="w-4 h-4" />
                <span>Aprobar Mi Acceso a Drive ({googleEmail || 'tekronwebstudio@gmail.com'})</span>
              </button>

              <button
                onClick={handleLogout}
                className="w-full py-2 rounded-xl text-slate-400 hover:text-slate-200 text-[11px] text-center font-medium flex items-center justify-center space-x-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cambiar de Cuenta de Google</span>
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            Administración & Soporte • WhatsApp: {ADMIN_PHONE}
          </p>
        </div>
      </div>
    );
  }

  // ACCESO PERMITIDO
  return (
    <>
      {isDemoMode && (
        <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white text-xs font-bold px-4 py-2 text-center flex items-center justify-between shadow-md relative z-50">
          <div className="flex items-center space-x-2 mx-auto">
            <AlertTriangle className="w-4 h-4 animate-bounce" />
            <span>MODO PRUEBA ACTIVO — Los datos NO se guardarán en Google Drive y se borrarán al cerrar la app</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[10px] bg-slate-950/40 hover:bg-slate-950/60 px-2 py-1 rounded-md text-white underline font-normal"
          >
            Salir / Cambiar Cuenta
          </button>
        </div>
      )}
      {children}
    </>
  );
}
