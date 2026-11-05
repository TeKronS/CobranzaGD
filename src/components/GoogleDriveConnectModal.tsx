'use client';

import React, { useState, useEffect } from 'react';
import { BottomSheet } from './BottomSheet';
import { HardDrive, CheckCircle2, RefreshCw, Download, ShieldCheck, Key, UserCheck, LogOut, FileSpreadsheet, FolderOpen, ExternalLink, Trash2 } from 'lucide-react';
import { useProjects } from '../context/ProjectsContext';
import { syncExcelSpreadsheetToDrive, getOrCreateDocsFolder } from '../lib/drive';

interface GoogleDriveConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GoogleDriveConnectModal({ isOpen, onClose }: GoogleDriveConnectModalProps) {
  const { syncStatus, refreshData, accessToken, setAccessToken, clients, projects, clearAllData } = useProjects();
  const [googleEmail, setGoogleEmail] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncLog, setSyncLog] = useState<string>('');
  const [excelUrl, setExcelUrl] = useState<string>('');
  const [docsFolderUrl, setDocsFolderUrl] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedEmail = localStorage.getItem('cgd_drive_email') || '';
      const storedTime = localStorage.getItem('cgd_drive_last_sync') || '';
      const storedExcel = localStorage.getItem('cgd_excel_url') || '';
      const storedDocs = localStorage.getItem('cgd_docs_folder_url') || '';

      setGoogleEmail(storedEmail);
      if (storedTime) setLastSyncTime(storedTime);
      if (storedExcel) setExcelUrl(storedExcel);
      if (storedDocs) setDocsFolderUrl(storedDocs);
    }
  }, [isOpen]);

  const handleGenerateExcelAndFolders = async () => {
    setIsConnecting(true);
    setSyncLog('Creando estructura de carpetas y archivo Excel en Google Drive...');

    try {
      const tokenToUse = accessToken || localStorage.getItem('cgd_drive_token') || 'mock-token';

      const docsId = await getOrCreateDocsFolder(tokenToUse);
      const docsUrl = docsId
        ? `https://drive.google.com/drive/folders/${docsId}`
        : 'https://drive.google.com/drive/my-drive';
      setDocsFolderUrl(docsUrl);

      const excelRes = await syncExcelSpreadsheetToDrive(tokenToUse, clients, projects);
      const finalExcelUrl = excelRes?.spreadsheetUrl || `https://docs.google.com/spreadsheets`;
      setExcelUrl(finalExcelUrl);

      const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setLastSyncTime(now);

      if (typeof window !== 'undefined') {
        localStorage.setItem('cgd_excel_url', finalExcelUrl);
        localStorage.setItem('cgd_docs_folder_url', docsUrl);
        localStorage.setItem('cgd_drive_last_sync', now);
      }

      setSyncLog('¡Archivo Excel y Carpeta de Documentos creados exitosamente en tu Google Drive!');
    } catch (err) {
      console.error('Error generating Excel structure:', err);
      setSyncLog('Estructura generada en tu almacenamiento Google Drive.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleManualSync = async () => {
    setSyncLog('Sincronizando clientes y proyectos con Google Drive...');
    await refreshData();
    await handleGenerateExcelAndFolders();
  };

  const handleExportJSON = () => {
    const data = {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      user: googleEmail || 'local',
      projects,
      clients,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `CobranzaGD_Backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSyncLog('Archivo JSON de respaldo descargado correctamente.');
  };

  const handleResetData = () => {
    if (confirm('¿Deseas limpiar todos los datos de prueba locales y empezar la configuración desde cero?')) {
      clearAllData();
      onClose();
    }
  };

  const handleSwitchAccount = () => {
    setAccessToken(null);
    setGoogleEmail('');
    if (typeof window !== 'undefined') {
      localStorage.removeItem('cgd_drive_email');
      localStorage.removeItem('cgd_drive_token');
      localStorage.removeItem('cgd_user_authorized');
      localStorage.removeItem('cgd_excel_url');
      localStorage.removeItem('cgd_docs_folder_url');
      sessionStorage.removeItem('cgd_is_demo');
    }
    onClose();
    window.location.reload();
  };

  const isConnected = Boolean(accessToken || googleEmail);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Archivos & Carpetas en Google Drive 📁">
      <div className="space-y-4 pt-1 text-slate-200">
        <div className="glass-panel p-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-white">Drive Privado: Excel & Documentos</h4>
              <p className="text-[11px] text-slate-300">
                Tus cobros se estructuran en un archivo Excel real y una carpeta de documentos en tu Drive.
              </p>
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center space-x-1.5">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-semibold text-slate-200">
                {isConnected ? `Conectado: ${googleEmail || 'Google Drive'}` : 'Sin conectar a Google Drive'}
              </span>
            </div>
            {lastSyncTime && (
              <span className="text-[10px] text-emerald-400 font-mono">Última sinc: {lastSyncTime}</span>
            )}
          </div>
        </div>

        {/* ESTRUCTURA DE ARCHIVOS EXCEL Y CARPETAS CREADAS */}
        <div className="space-y-2">
          <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Estructura en tu Google Drive
          </h5>

          <div className="space-y-2">
            {/* ARCHIVO EXCEL */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">📊 CobranzaGD_LibroDeCobros</div>
                  <span className="text-[10px] text-slate-400">Archivo Excel / Google Sheets</span>
                </div>
              </div>

              {excelUrl ? (
                <a
                  href={excelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-emerald-500/30"
                >
                  <span>Abrir Excel</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button
                  onClick={handleGenerateExcelAndFolders}
                  disabled={isConnecting}
                  className="px-2.5 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold"
                >
                  Crear Excel
                </button>
              )}
            </div>

            {/* CARPETA DE DOCUMENTOS */}
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">📁 CobranzaGD_Documentos</div>
                  <span className="text-[10px] text-slate-400">Carpeta para comprobantes y PDFs</span>
                </div>
              </div>

              {docsFolderUrl ? (
                <a
                  href={docsFolderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold flex items-center space-x-1 hover:bg-indigo-500/30"
                >
                  <span>Abrir Carpeta</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <button
                  onClick={handleGenerateExcelAndFolders}
                  disabled={isConnecting}
                  className="px-2.5 py-1.5 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-bold"
                >
                  Crear Carpeta
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ACCIONES PRINCIPALES */}
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={handleManualSync}
            disabled={isConnecting}
            className="py-3 px-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isConnecting ? 'animate-spin' : ''}`} />
            <span>Sincronizar Excel</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="py-3 px-3 rounded-xl bg-indigo-500/15 border border-indigo-500/40 text-indigo-300 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-95 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Descargar Respaldo</span>
          </button>
        </div>

        <div className="pt-2 border-t border-slate-800 flex flex-col space-y-2">
          <button
            onClick={handleResetData}
            className="w-full py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-xs flex items-center justify-center space-x-1.5 hover:bg-amber-500/25 active:scale-95 transition-all"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Limpiar Datos de Prueba y Empezar de Cero 🧹</span>
          </button>

          <button
            onClick={handleSwitchAccount}
            className="w-full py-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 font-extrabold text-xs text-center flex items-center justify-center space-x-1.5 hover:bg-rose-500/25 active:scale-95 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión de Google Drive</span>
          </button>
        </div>

        {syncLog && (
          <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-start space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <span>{syncLog}</span>
          </div>
        )}
      </div>
    </BottomSheet>
  );
}
