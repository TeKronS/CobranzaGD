'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ProjectsProvider, useProjects } from '../context/ProjectsContext';
import { MandatoryAuthGuard } from '../components/MandatoryAuthGuard';
import { GuidedBusinessOnboarding } from '../components/GuidedBusinessOnboarding';
import { Search, RefreshCw } from 'lucide-react';

function RootAuthenticatedContent() {
  const router = useRouter();
  const { projects, isCheckingDrive } = useProjects();

  useEffect(() => {
    if (!isCheckingDrive && projects.length > 0) {
      router.replace('/dashboard');
    }
  }, [projects, isCheckingDrive, router]);

  if (isCheckingDrive) {
    return (
      <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col items-center justify-center p-5 relative overflow-hidden">
        <div className="max-w-sm w-full text-center space-y-4 glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-slate-900/90 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
            <Search className="w-8 h-8 animate-bounce" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-white">Verificando tu Google Drive...</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Buscando tu archivo Excel <span className="text-emerald-400 font-mono">📊 CobranzaGD_LibroDeCobros</span> y carteras configuradas.
            </p>
          </div>
          <div className="flex items-center justify-center space-x-2 text-xs text-emerald-300 font-bold pt-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
            <span>Consultando API Google Drive</span>
          </div>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return <GuidedBusinessOnboarding onComplete={() => router.push('/dashboard')} />;
  }

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex items-center justify-center p-5">
      <div className="text-center space-y-2">
        <RefreshCw className="w-6 h-6 animate-spin text-emerald-400 mx-auto" />
        <p className="text-xs text-slate-400">Abriendo tu Panel de Control...</p>
      </div>
    </div>
  );
}

export default function RootPage() {
  return (
    <ProjectsProvider>
      <MandatoryAuthGuard>
        <RootAuthenticatedContent />
      </MandatoryAuthGuard>
    </ProjectsProvider>
  );
}
