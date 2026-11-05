'use client';

import React, { useState } from 'react';
import { useProjects } from '../context/ProjectsContext';
import { HardDrive, ChevronDown, Database, CreditCard, Repeat, ShoppingBag, LogOut, RefreshCw } from 'lucide-react';
import { GoogleDriveConnectModal } from './GoogleDriveConnectModal';
import { BusinessOnboardingModal } from './BusinessOnboardingModal';

export function MobileHeader() {
  const { activeProject, syncStatus, accessToken, setAccessToken, refreshData, isCheckingDrive } = useProjects();
  const [showBusinessModal, setShowBusinessModal] = useState(false);
  const [showDriveModal, setShowDriveModal] = useState(false);

  const handleLogout = () => {
    if (confirm('¿Estás seguro de que deseas cerrar sesión?')) {
      setAccessToken(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cgd_drive_email');
        localStorage.removeItem('cgd_drive_token');
        localStorage.removeItem('cgd_user_authorized');
        localStorage.removeItem('cgd_excel_url');
        localStorage.removeItem('cgd_docs_folder_url');
        sessionStorage.removeItem('cgd_is_demo');
      }
      window.location.href = '/';
    }
  };

  const getModelBadge = (tipo?: string) => {
    switch (tipo) {
      case 'suscripcion':
        return { label: 'Suscripción', icon: <Repeat className="w-3 h-3 text-indigo-400" />, bg: 'bg-indigo-950 border-indigo-700 text-indigo-300' };
      case 'unico':
        return { label: 'Pago Único', icon: <ShoppingBag className="w-3 h-3 text-amber-400" />, bg: 'bg-amber-950 border-amber-700 text-amber-300' };
      default:
        return { label: 'Crédito', icon: <CreditCard className="w-3 h-3 text-emerald-400" />, bg: 'bg-emerald-950 border-emerald-700 text-emerald-300' };
    }
  };

  const currentBadge = getModelBadge(activeProject?.tipo);

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 bg-[#0d1322] border-b border-slate-800 px-4 py-2.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <button
            onClick={() => setShowBusinessModal(true)}
            className="flex items-center space-x-2 text-left active:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-xs font-bold tracking-tight text-white">Cobranza GD</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </div>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-[10px] text-emerald-400 font-medium truncate max-w-[100px]">
                  {activeProject?.nombre || 'Seleccionar Negocio'}
                </span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-semibold border flex items-center space-x-1 ${currentBadge.bg}`}>
                  {currentBadge.icon}
                  <span>{currentBadge.label}</span>
                </span>
              </div>
            </div>
          </button>

          <div className="flex items-center space-x-1.5">
            {accessToken ? (
              <button
                onClick={() => refreshData()}
                disabled={isCheckingDrive}
                className="p-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-emerald-400 active:scale-95 transition-all disabled:opacity-50"
                title="Sincronizar con Google Sheets"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDrive ? 'animate-spin text-emerald-400' : ''}`} />
              </button>
            ) : null}

            <button
              onClick={() => setShowDriveModal(true)}
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] text-slate-300 active:scale-95 transition-all"
              title="Conexión Google Drive"
            >
              <HardDrive className="w-3 h-3 text-emerald-400" />
              <span className="font-medium">
                {accessToken ? 'Drive Conectado' : 'Conectar Drive'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  accessToken || syncStatus === 'synced' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>

            <button
              onClick={handleLogout}
              className="p-1.5 rounded-full bg-slate-800 border border-slate-700 text-rose-400 hover:text-rose-300 active:scale-95 transition-all"
              title="Cerrar Sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <GoogleDriveConnectModal isOpen={showDriveModal} onClose={() => setShowDriveModal(false)} />
      <BusinessOnboardingModal isOpen={showBusinessModal} onClose={() => setShowBusinessModal(false)} />
    </>
  );
}
