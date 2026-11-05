'use client';

import React, { useState, useEffect } from 'react';
import { ProjectsProvider, useProjects } from '../context/ProjectsContext';
import { MobileHeader } from './MobileHeader';
import { BottomNav } from './BottomNav';
import { BottomSheet } from './BottomSheet';
import { MandatoryAuthGuard } from './MandatoryAuthGuard';
import { GuidedBusinessOnboarding } from './GuidedBusinessOnboarding';
import { InitialBusinessSelector } from './InitialBusinessSelector';
import { CreditProductManagerModal } from './CreditProductManagerModal';
import { generateCuotasPlan } from '../lib/clients';
import { uploadClientFileToDrive, uploadDocumentToDriveFolder } from '../lib/drive';
import type { Frequency, Currency, TipoCobro, Project, Cuota } from '../types';
import {
  CreditCard,
  Repeat,
  ShoppingBag,
  HardDrive,
  RefreshCw,
  Search,
  Zap,
  Package,
  Plus,
  FileText,
  Camera,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Dices,
  Sparkles,
  Upload,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';

function computeDueDate(startDate: string, freq: Frequency): string {
  if (!startDate) return '';
  const d = new Date(startDate + 'T00:00:00');
  if (freq === 'semanal') d.setDate(d.getDate() + 7);
  else if (freq === 'quincenal') d.setDate(d.getDate() + 15);
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1); // mensual or default
  return d.toISOString().split('T')[0];
}

function AuthenticatedApp({ children }: { children: React.ReactNode }) {
  const {
    projects,
    activeProject,
    setActiveProject,
    addClient,
    isCheckingDrive,
    accessToken,
    refreshData,
    setAccessToken,
  } = useProjects();

  const [hasChosenBusinessForSession, setHasChosenBusinessForSession] = useState(false);
  const [showAddClientSheet, setShowAddClientSheet] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);

  // Photo / Camera Input State
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [fotoPreview, setFotoPreview] = useState('');
  const [isUploadingFoto, setIsUploadingFoto] = useState(false);

  // Legal Document / Contract File Input State
  const docInputRef = React.useRef<HTMLInputElement>(null);
  const [docFileName, setDocFileName] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  // Saving / Uploading state for Client Submission
  const [isSavingClient, setIsSavingClient] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Mode derived from active business project
  const currentModel: TipoCobro = activeProject?.tipo || 'credito';

  // Common Fields
  const [nombre, setNombre] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [email, setEmail] = useState('');
  const [notas, setNotas] = useState('');
  const [driveFotoURL, setDriveFotoURL] = useState('');
  const [documentoLegalURL, setDocumentoLegalURL] = useState('');

  // Subscription Fields
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [subMonto, setSubMonto] = useState('');
  const [subMoneda, setSubMoneda] = useState<Currency>('USD');
  const [subFrecuencia, setSubFrecuencia] = useState<Frequency>('mensual');
  const [subFechaInicio, setSubFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [subFechaVence, setSubFechaVence] = useState(computeDueDate(new Date().toISOString().split('T')[0], 'mensual'));

  // Credit / Loan Fields
  const [selectedProductId, setSelectedProductId] = useState('');
  const [credPrecioBase, setCredPrecioBase] = useState('');
  const [credPlazoMeses, setCredPlazoMeses] = useState('6');
  const [credPorcentaje, setCredPorcentaje] = useState('20');
  const [credMontoInicial, setCredMontoInicial] = useState('');
  const [credInicialPagada, setCredInicialPagada] = useState(true);
  const [credFrecuencia, setCredFrecuencia] = useState<Frequency>('mensual');
  const [credMoneda, setCredMoneda] = useState<Currency>('USD');
  const [credFechaInicio, setCredFechaInicio] = useState(new Date().toISOString().split('T')[0]);

  // Single Payment / Fiado Fields
  const [fiadoMonto, setFiadoMonto] = useState('');
  const [fiadoMoneda, setFiadoMoneda] = useState<Currency>('USD');
  const [fiadoProducto, setFiadoProducto] = useState('');
  const [fiadoCantidad, setFiadoCantidad] = useState('1');
  const [fiadoFechaVence, setFiadoFechaVence] = useState('');

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Instant local Data URL preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      setFotoPreview(resultStr);
    };
    reader.readAsDataURL(file);

    // 2. If Google Drive token is present, upload to Drive subfolder automatically
    const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);
    if (token) {
      setIsUploadingFoto(true);
      try {
        const uploadRes = await uploadClientFileToDrive(
          file,
          token,
          activeProject?.nombre || 'General',
          nombre || 'Cliente',
          true, // Profile Photo saved as "Foto de Perfil"
          identificacion || undefined
        );
        if (uploadRes?.viewLink) {
          setDriveFotoURL(uploadRes.viewLink);
        }
      } catch (err) {
        console.error('Error uploading photo to Drive:', err);
      } finally {
        setIsUploadingFoto(false);
      }
    }
  };

  const handleLegalDocFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setDocFileName(file.name);

    // If Google Drive token is present, upload to Drive subfolder automatically
    const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('cgd_drive_token') : null);
    if (token) {
      setIsUploadingDoc(true);
      try {
        const uploadRes = await uploadClientFileToDrive(
          file,
          token,
          activeProject?.nombre || 'General',
          nombre || 'Cliente',
          false, // Not profile photo -> keep original file name
          identificacion || undefined
        );
        if (uploadRes?.viewLink) {
          setDocumentoLegalURL(uploadRes.viewLink);
        }
      } catch (err) {
        console.error('Error uploading legal document to Drive:', err);
      } finally {
        setIsUploadingDoc(false);
      }
    } else {
      setDocumentoLegalURL(`local://${file.name}`);
    }
  };

  // Reset form when modal opens or model changes
  useEffect(() => {
    if (showAddClientSheet && activeProject) {
      if (activeProject.planesSuscripcion && activeProject.planesSuscripcion.length > 0) {
        const first = activeProject.planesSuscripcion[0];
        setSelectedPlanId(first.id);
        setSubMonto(String(first.monto));
        setSubFrecuencia(first.frecuencia);
        setSubMoneda(first.moneda);
        setSubFechaVence(computeDueDate(subFechaInicio, first.frecuencia));
      }
    }
  }, [showAddClientSheet, activeProject]);

  // 1. WHILE CHECKING GOOGLE DRIVE FOR EXISTING EXCEL FILE
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

  // 2. AFTER GOOGLE SIGN IN: IF NO CONFIGURED BUSINESS EXCEL FILE EXISTS -> SHOW GUIDED BUSINESS CREATOR
  if (projects.length === 0) {
    return <GuidedBusinessOnboarding onComplete={() => setHasChosenBusinessForSession(true)} />;
  }

  // 3. AFTER GOOGLE SIGN IN: PRESENT BUSINESS SELECTOR TO PICK WHICH PORTFOLIO TO MANAGE
  if (!hasChosenBusinessForSession) {
    return (
      <InitialBusinessSelector
        onSelectProject={(proj: Project) => {
          setActiveProject(proj);
          setHasChosenBusinessForSession(true);
        }}
      />
    );
  }

  // Helper calculations for Credit / Loan Amortization
  const computeCreditCalculations = () => {
    const base = parseFloat(credPrecioBase) || 0;
    const pct = parseFloat(credPorcentaje) || 0;
    const inicial = parseFloat(credMontoInicial) || 0;

    const montoInteres = (base * pct) / 100;
    const totalFinanciado = base + montoInteres;
    const saldoPendiente = Math.max(0, totalFinanciado - (credInicialPagada ? inicial : 0));

    const meses = parseInt(credPlazoMeses) || 1;
    let totalCuotas = meses;
    if (credFrecuencia === 'semanal') totalCuotas = meses * 4;
    if (credFrecuencia === 'quincenal') totalCuotas = meses * 2;

    const montoCuota = totalCuotas > 0 ? saldoPendiente / totalCuotas : saldoPendiente;

    return {
      base,
      montoInteres,
      totalFinanciado,
      saldoPendiente,
      totalCuotas,
      montoCuota,
    };
  };

  const handleFillTestData = () => {
    const randomNames = [
      'Carlos Eduardo Mendoza',
      'María Valentina Fernández',
      'Alejandro José Silva',
      'Sofía Elena Rodríguez',
      'Gabriel Alfonso Gómez',
      'Patricia Vanessa Blanco',
      'Ricardo Antonio Paredes',
      'Daniela Beatriz Suárez',
    ];
    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomNum = Math.floor(10000000 + Math.random() * 20000000);
    const randomPhone = `+58 414 ${Math.floor(1000000 + Math.random() * 9000000)}`;
    const cleanEmailName = randomName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/ñ/g, 'n')
      .replace(/Ñ/g, 'N')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '.');
    const randomEmail = `${cleanEmailName}${Math.floor(Math.random() * 99)}@gmail.com`;

    setNombre(randomName);
    setIdentificacion(`V-${randomNum}`);
    setTelefono(randomPhone);
    setEmail(randomEmail);
    setNotas(`[TEST AL AZAR] Cliente de prueba para verificación en Google Drive.`);

    // Randomize start date (between 35 days ago and today) so test clients have realistic varied expiration dates
    const randomDaysAgo = Math.floor(Math.random() * 35);
    const startDateObj = new Date();
    startDateObj.setDate(startDateObj.getDate() - randomDaysAgo);
    const randomStartDate = startDateObj.toISOString().split('T')[0];

    setSubFechaInicio(randomStartDate);
    setCredFechaInicio(randomStartDate);

    if (currentModel === 'suscripcion') {
      if (activeProject?.planesSuscripcion && activeProject.planesSuscripcion.length > 0) {
        const randomPlan = activeProject.planesSuscripcion[Math.floor(Math.random() * activeProject.planesSuscripcion.length)];
        setSelectedPlanId(randomPlan.id);
        setSubMonto(String(randomPlan.monto));
        setSubFrecuencia(randomPlan.frecuencia);
        setSubMoneda(randomPlan.moneda);
        setSubFechaVence(computeDueDate(randomStartDate, randomPlan.frecuencia));
      } else {
        const freqs: Frequency[] = ['semanal', 'quincenal', 'mensual'];
        const randomFreq = freqs[Math.floor(Math.random() * freqs.length)];
        setSubMonto(String(Math.floor(15 + Math.random() * 35)));
        setSubFrecuencia(randomFreq);
        setSubFechaVence(computeDueDate(randomStartDate, randomFreq));
      }
    } else if (currentModel === 'credito') {
      if (activeProject?.productosCredito && activeProject.productosCredito.length > 0) {
        const randomProd = activeProject.productosCredito[Math.floor(Math.random() * activeProject.productosCredito.length)];
        setSelectedProductId(randomProd.id);
        setCredPrecioBase(String(randomProd.precio));
      } else {
        setSelectedProductId('');
        setCredPrecioBase(String(Math.floor(200 + Math.random() * 600)));
      }
      const inicial = String(Math.floor(30 + Math.random() * 70));
      setCredMontoInicial(inicial);
      setCredPorcentaje('20');
      setCredPlazoMeses('6');
      setCredInicialPagada(true);
    } else {
      setFiadoMonto(String(Math.floor(30 + Math.random() * 120)));
      setFiadoProducto('Mercadería Variada Fiada');
      setFiadoCantidad('1');
      setFiadoFechaVence(computeDueDate(randomStartDate, 'mensual'));
    }
  };

  const handleCreateClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !activeProject || isSavingClient) return;

    setIsSavingClient(true);
    setSaveSuccess(false);

    try {
      let finalMonto = 0;
      let finalMoneda: Currency = 'USD';
      let finalFrecuencia: Frequency = 'mensual';
      let finalFechaInicio = new Date().toISOString().split('T')[0];
      let finalFechaVence = '';
      let planPagos: Cuota[] = [];
      let configObj: any = {};

      if (currentModel === 'suscripcion') {
        const selectedPlan = activeProject.planesSuscripcion?.find(p => p.id === selectedPlanId);
        finalMonto = isCustomPlan || !selectedPlan ? parseFloat(subMonto) || 0 : selectedPlan.monto;
        finalMoneda = isCustomPlan || !selectedPlan ? subMoneda : selectedPlan.moneda;
        finalFrecuencia = isCustomPlan || !selectedPlan ? subFrecuencia : selectedPlan.frecuencia;
        finalFechaInicio = subFechaInicio;
        finalFechaVence = subFechaVence || subFechaInicio;
        configObj = {
          planNombre: selectedPlan && !isCustomPlan ? selectedPlan.nombre : 'Plan Personalizado',
          precioTotal: finalMonto,
          diasSuscripcion: 30,
          documentoLegalUrl: documentoLegalURL.trim() || undefined,
        };
      } else if (currentModel === 'credito') {
        const calc = computeCreditCalculations();
        finalMonto = calc.saldoPendiente;
        finalMoneda = credMoneda;
        finalFrecuencia = credFrecuencia;
        finalFechaInicio = credFechaInicio;
        
        // Generate individual amortized cuotas schedule
        const totalCuotas = calc.totalCuotas;
        const montoPorCuota = parseFloat(calc.montoCuota.toFixed(2));
        const generatedCuotas: Cuota[] = [];
        let nextDue = new Date(credFechaInicio + 'T12:00:00');

        for (let i = 1; i <= totalCuotas; i++) {
          if (credFrecuencia === 'semanal') nextDue.setDate(nextDue.getDate() + 7);
          else if (credFrecuencia === 'quincenal') nextDue.setDate(nextDue.getDate() + 15);
          else if (credFrecuencia === 'anual') nextDue.setFullYear(nextDue.getFullYear() + 1);
          else nextDue.setMonth(nextDue.getMonth() + 1); // mensual

          const y = nextDue.getFullYear();
          const m = String(nextDue.getMonth() + 1).padStart(2, '0');
          const d = String(nextDue.getDate()).padStart(2, '0');

          generatedCuotas.push({
            id: `cuota-${i}-${Date.now()}`,
            fecha: `${y}-${m}-${d}`,
            monto: montoPorCuota,
            estado: 'pendiente',
            descripcion: `Cuota ${i} de ${totalCuotas}`,
          });
        }

        planPagos = generatedCuotas;
        finalFechaVence = generatedCuotas.length > 0 ? generatedCuotas[0].fecha : credFechaInicio;

        const prod = activeProject.productosCredito?.find(p => p.id === selectedProductId);
        configObj = {
          precioTotal: calc.totalFinanciado,
          pagoInicial: parseFloat(credMontoInicial) || 0,
          inicialPagada: credInicialPagada,
          porcentajeGanancia: parseFloat(credPorcentaje) || 0,
          plazoMeses: parseInt(credPlazoMeses) || 6,
          documentoLegalUrl: documentoLegalURL.trim() || undefined,
          productoCreditoId: selectedProductId || undefined,
          productoNombre: prod?.nombre || undefined,
          productoModelo: prod?.modelo || undefined,
          productoSerial: prod?.serial || undefined,
        };
      } else {
        // 'unico' / Fiado
        finalMonto = parseFloat(fiadoMonto) || 0;
        finalMoneda = fiadoMoneda;
        finalFrecuencia = 'unico';
        finalFechaInicio = new Date().toISOString().split('T')[0];
        finalFechaVence = '';
        configObj = {
          documentoLegalUrl: documentoLegalURL.trim() || undefined,
          productoNombre: fiadoProducto.trim() || undefined,
          productoCantidad: parseInt(fiadoCantidad) || 1,
        };
      }

      const success = await addClient({
        proyectoId: activeProject.id,
        nombre: nombre.trim(),
        cedula: identificacion.trim(),
        identificacion: identificacion.trim(),
        telefono: telefono.trim().startsWith('#') || telefono.trim().toLowerCase() === 'error' ? '' : telefono.trim(),
        email: email.trim(),
        monto: finalMonto,
        moneda: finalMoneda,
        fechaInicio: finalFechaInicio,
        fechaVence: finalFechaVence,
        frecuencia: finalFrecuencia,
        estado: 'activo',
        notas: notas.trim(),
        driveFotoURL: driveFotoURL.trim(),
        documentoLegalURL: documentoLegalURL.trim(),
        planPagos,
        config: configObj,
      });

      if (success) {
        setSaveSuccess(true);
        await new Promise(r => setTimeout(r, 850));

        // Reset Form State
        setNombre('');
        setIdentificacion('');
        setTelefono('');
        setEmail('');
        setNotas('');
        setDriveFotoURL('');
        setFotoPreview('');
        if (photoInputRef.current) photoInputRef.current.value = '';
        setDocumentoLegalURL('');
        setDocFileName('');
        if (docInputRef.current) docInputRef.current.value = '';
        setSubMonto('');
        setSelectedProductId('');
        setCredPrecioBase('');
        setCredMontoInicial('');
        setFiadoMonto('');
        setFiadoProducto('');
        setShowAddClientSheet(false);
        setSaveSuccess(false);
      }
    } catch (err) {
      console.error('Error al guardar cliente:', err);
    } finally {
      setIsSavingClient(false);
    }
  };

  const credCalc = computeCreditCalculations();

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col justify-between">
      <MobileHeader />

      <main className="flex-1 max-w-md mx-auto w-full px-4 pt-16 pb-24">
        {children}
      </main>

      <BottomNav onQuickAction={() => setShowAddClientSheet(true)} />

      <BottomSheet
        isOpen={showAddClientSheet}
        onClose={() => setShowAddClientSheet(false)}
        title={`Nuevo Cliente — ${activeProject?.nombre || 'Negocio'} 💳`}
      >
        <form onSubmit={handleCreateClientSubmit} className="space-y-4 pt-1 text-slate-200">
          {/* BOTÓN DE AUTO-RELLENAR TEST */}
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
            <span className="text-[11px] text-amber-300 font-extrabold flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Prueba Rápida</span>
            </span>
            <button
              type="button"
              onClick={handleFillTestData}
              className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-black text-xs flex items-center space-x-1.5 hover:bg-amber-500/30 active:scale-95 transition-all shadow-sm"
            >
              <Dices className="w-4 h-4 text-amber-400" />
              <span>🎲 Auto-Rellenar Campos</span>
            </button>
          </div>

          {/* 1. CAMPOS GENERALES DEL CLIENTE */}
          <div className="space-y-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Nombre Completo del Cliente *
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Carlos Eduardo Mendoza"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Identificación (RIF / DNI / CI)
                </label>
                <input
                  type="text"
                  placeholder="Ej: V-18928374 / RIF J-..."
                  value={identificacion}
                  onChange={e => setIdentificacion(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Teléfono WhatsApp
                </label>
                <input
                  type="tel"
                  placeholder="+58 414 1234567"
                  value={telefono}
                  onChange={e => setTelefono(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Email (Opcional)
                </label>
                <input
                  type="email"
                  placeholder="cliente@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Foto del Cliente</span>
                  {isUploadingFoto && (
                    <span className="text-[9px] text-emerald-400 font-bold flex items-center space-x-1 animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                      <span>Subiendo...</span>
                    </span>
                  )}
                </label>

                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  ref={photoInputRef}
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />

                {fotoPreview ? (
                  <div className="flex items-center space-x-2 p-1.5 rounded-xl glass-input border border-emerald-500/40">
                    <img
                      src={fotoPreview}
                      alt="Vista previa"
                      className="w-8 h-8 rounded-lg object-cover border border-emerald-500/50 flex-shrink-0"
                    />
                    <div className="flex-1 flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="px-2 py-1 rounded-lg bg-slate-800 text-slate-200 text-[10px] font-bold hover:bg-slate-700 transition-all flex items-center space-x-1"
                      >
                        <Camera className="w-3 h-3 text-emerald-400" />
                        <span>Cambiar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFotoPreview('');
                          setDriveFotoURL('');
                          if (photoInputRef.current) photoInputRef.current.value = '';
                        }}
                        className="px-1.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/30 transition-all"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-full py-2.5 px-2 rounded-xl border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-98"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>Tomar / Subir Foto</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* 2. FORMULARIO ESPECÍFICO DE SUSCRIPCIONES */}
          {currentModel === 'suscripcion' && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Repeat className="w-4 h-4" />
                <span>Detalles de la Suscripción</span>
              </h4>

              {/* SELECCIÓN DE PLAN DE SUSCRIPCIÓN */}
              {(!activeProject?.planesSuscripcion || activeProject.planesSuscripcion.length === 0) ? (
                <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-2">
                  <div className="flex items-start space-x-2 text-indigo-300 text-xs">
                    <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">💡 Recomendación de Gestión</span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        La mejor manera de agregar clientes en este modelo es mediante **Planes de Suscripción**.
                        Puedes crearlos en la pestaña <strong className="text-amber-400">Planes</strong> para autorrellenar tarifas en 1 toque.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Selecciona el Plan de Suscripción *
                  </label>
                  <select
                    value={selectedPlanId}
                    disabled={isCustomPlan}
                    onChange={e => {
                      const pId = e.target.value;
                      setSelectedPlanId(pId);
                      const plan = activeProject.planesSuscripcion?.find(p => p.id === pId);
                      if (plan) {
                        setSubMonto(String(plan.monto));
                        setSubFrecuencia(plan.frecuencia);
                        setSubMoneda(plan.moneda);
                        setSubFechaVence(computeDueDate(subFechaInicio, plan.frecuencia));
                      }
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs bg-slate-900 font-bold text-white"
                  >
                    {activeProject.planesSuscripcion.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.nombre} — ${p.monto} / {p.frecuencia} ({p.moneda})
                      </option>
                    ))}
                  </select>

                  <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCustomPlan}
                      onChange={e => setIsCustomPlan(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-[11px] text-slate-300 font-semibold">
                      Personalizar datos de pago para este cliente
                    </span>
                  </label>
                </div>
              )}

              {/* CAMPOS PERSONALIZADOS DE MONTO/FRECUENCIA SI ACTIVA EL CHECKBOX O NO HAY PLANES */}
              {(isCustomPlan || !activeProject?.planesSuscripcion || activeProject.planesSuscripcion.length === 0) && (
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Monto Cuota ($) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      value={subMonto}
                      onChange={e => setSubMonto(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-xs font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Moneda
                    </label>
                    <select
                      value={subMoneda}
                      onChange={e => setSubMoneda(e.target.value as Currency)}
                      className="w-full px-2 py-2.5 rounded-xl glass-input text-xs bg-slate-900"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="VES">VES (Bs.)</option>
                      <option value="COP">COP ($)</option>
                      <option value="EUR">EUR (€)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Frecuencia
                    </label>
                    <select
                      value={subFrecuencia}
                      onChange={e => {
                        const newFreq = e.target.value as Frequency;
                        setSubFrecuencia(newFreq);
                        setSubFechaVence(computeDueDate(subFechaInicio, newFreq));
                      }}
                      className="w-full px-2 py-2.5 rounded-xl glass-input text-xs bg-slate-900"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                </div>
              )}

              {/* FECHA INICIO & FECHA VENCIMIENTO CALCULADA AUTOMÁTICAMENTE */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Fecha Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={subFechaInicio}
                    onChange={e => {
                      const newStart = e.target.value;
                      setSubFechaInicio(newStart);
                      setSubFechaVence(computeDueDate(newStart, subFrecuencia));
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Fecha Vencimiento (Calculada)
                  </label>
                  <input
                    type="date"
                    value={subFechaVence || computeDueDate(subFechaInicio, subFrecuencia)}
                    onChange={e => setSubFechaVence(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-indigo-300"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3. FORMULARIO ESPECÍFICO DE PRÉSTAMOS & CRÉDITOS */}
          {currentModel === 'credito' && (
            <div className="space-y-3.5 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
                  <CreditCard className="w-4 h-4" />
                  <span>Producto & Financiamiento a Crédito</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowProductModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center space-x-1"
                >
                  <Package className="w-3 h-3" />
                  <span>Gestionar Catálogo</span>
                </button>
              </div>

              {/* SELECTOR DE PRODUCTO A CRÉDITO */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Producto del Catálogo
                  </label>
                  {selectedProductId && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProductId('');
                      }}
                      className="text-[10px] text-rose-400 hover:underline font-bold"
                    >
                      Deseleccionar
                    </button>
                  )}
                </div>

                {activeProject?.productosCredito && activeProject.productosCredito.length > 0 ? (
                  <div className="space-y-2">
                    <select
                      value={selectedProductId}
                      onChange={e => {
                        const val = e.target.value;
                        setSelectedProductId(val);
                        const prod = activeProject.productosCredito?.find(p => p.id === val);
                        if (prod) {
                          setCredPrecioBase(String(prod.precio));
                        }
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs bg-slate-900 font-bold text-white border border-slate-700"
                    >
                      <option value="">-- Seleccionar Producto del Catálogo --</option>
                      {activeProject.productosCredito.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} {p.modelo ? `(${p.modelo})` : ''} — ${p.precio} {p.serial ? `[Serial: ${p.serial}]` : ''}
                        </option>
                      ))}
                    </select>

                    {selectedProductId && (() => {
                      const selectedProd = activeProject.productosCredito?.find(p => p.id === selectedProductId);
                      if (!selectedProd) return null;
                      return (
                        <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="font-extrabold text-emerald-300 flex items-center space-x-1.5">
                              <Package className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{selectedProd.nombre} {selectedProd.modelo ? `(${selectedProd.modelo})` : ''}</span>
                            </span>
                            {selectedProd.serial && (
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Serial / Código: {selectedProd.serial}
                              </span>
                            )}
                          </div>
                          <span className="text-sm font-black text-emerald-400">
                            ${selectedProd.precio}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-300 block">Catálogo vacío</span>
                      <span className="text-[10px] text-slate-400">Registra tus artículos para seleccionarlos con 1 toque.</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-extrabold text-[11px] hover:bg-emerald-500/30 active:scale-95 transition-all flex items-center space-x-1 flex-shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Crear Producto</span>
                    </button>
                  </div>
                )}
              </div>

              {/* FINANCIAMIENTO: MONTO BASE & PLAZO */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Precio Base / Deuda ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={credPrecioBase}
                    onChange={e => setCredPrecioBase(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Plazo Financiamiento
                  </label>
                  <select
                    value={credPlazoMeses}
                    onChange={e => {
                      setCredPlazoMeses(e.target.value);
                      if (e.target.value === '3') setCredPorcentaje('10');
                      else if (e.target.value === '6') setCredPorcentaje('20');
                      else if (e.target.value === '12') setCredPorcentaje('35');
                    }}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs bg-slate-900"
                  >
                    <option value="3">3 Meses (+10% Interés)</option>
                    <option value="6">6 Meses (+20% Interés)</option>
                    <option value="12">12 Meses (+35% Interés)</option>
                    <option value="1">1 Mes (Sin Recargo)</option>
                  </select>
                </div>
              </div>

              {/* PAGO INICIAL & INICIAL PAGADA */}
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Monto Cuota Inicial ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={credMontoInicial}
                      onChange={e => setCredMontoInicial(e.target.value)}
                      className="w-full px-3.5 py-2 rounded-xl glass-input text-xs font-bold text-emerald-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                      Frecuencia Cuotas
                    </label>
                    <select
                      value={credFrecuencia}
                      onChange={e => setCredFrecuencia(e.target.value as Frequency)}
                      className="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={credInicialPagada}
                    onChange={e => setCredInicialPagada(e.target.checked)}
                    className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500"
                  />
                  <span className="text-[11px] text-emerald-300 font-bold">
                    ✓ La Inicial ya fue abonada/pagada hoy por el cliente
                  </span>
                </label>
              </div>

              {/* RESUMEN DE AMORTIZACIÓN */}
              {credPrecioBase && (
                <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Total con Interés (+{credPorcentaje}%):</span>
                    <span className="font-bold text-white">${credCalc.totalFinanciado.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Saldo Restante en Cuotas:</span>
                    <span className="font-black text-emerald-400">${credCalc.saldoPendiente.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-emerald-500/20 text-[11px]">
                    <span className="text-slate-300">{credCalc.totalCuotas} Cuota(s) {credFrecuencia}(es):</span>
                    <span className="font-extrabold text-emerald-300">${credCalc.montoCuota.toFixed(2)} c/u</span>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 flex items-center space-x-1">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Documento Legal / Contrato Firmado (Archivo)</span>
                </label>

                <input
                  ref={docInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleLegalDocFileChange}
                  className="hidden"
                />

                {docFileName || documentoLegalURL ? (
                  <div className="p-3 rounded-2xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-bold text-white block truncate">
                          {docFileName || 'Documento / Contrato'}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium flex items-center space-x-1">
                          <span>✓ Listo para Google Drive</span>
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setDocFileName('');
                        setDocumentoLegalURL('');
                        if (docInputRef.current) docInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all flex-shrink-0"
                      title="Quitar archivo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => docInputRef.current?.click()}
                    disabled={isUploadingDoc}
                    className="w-full py-3 px-3.5 rounded-2xl bg-slate-900 border border-dashed border-slate-700 hover:border-indigo-500/60 text-slate-300 hover:text-white font-bold text-xs flex items-center justify-center space-x-2 active:scale-98 transition-all"
                  >
                    {isUploadingDoc ? (
                      <>
                        <RefreshCw className="w-4 h-4 text-indigo-400 animate-spin" />
                        <span className="text-indigo-300">Subiendo a Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-indigo-400" />
                        <span>Subir Contrato / Documento (PDF, Imagen)</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. FORMULARIO ESPECÍFICO DE PAGO ÚNICO / FIADO */}
          {currentModel === 'unico' && (
            <div className="space-y-3 pt-2 border-t border-slate-800">
              <h4 className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center space-x-1.5">
                <ShoppingBag className="w-4 h-4" />
                <span>Registro de Deuda Fiada / Venta Única</span>
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Monto de la Deuda ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={fiadoMonto}
                    onChange={e => setFiadoMonto(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Moneda
                  </label>
                  <select
                    value={fiadoMoneda}
                    onChange={e => setFiadoMoneda(e.target.value as Currency)}
                    className="w-full px-3 py-2.5 rounded-xl glass-input text-xs bg-slate-900"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="VES">VES (Bs.)</option>
                    <option value="COP">COP ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Producto Dejado Fiado (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 2 Sacos de Alimento / Ropa"
                    value={fiadoProducto}
                    onChange={e => setFiadoProducto(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    value={fiadoCantidad}
                    onChange={e => setFiadoCantidad(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Documento Legal / Factura (Archivo Opcional)
                </label>
                {docFileName || documentoLegalURL ? (
                    <div className="p-2 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-center justify-between">
                      <span className="text-xs text-white truncate max-w-[120px]">
                        {docFileName || 'Documento'}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setDocFileName('');
                          setDocumentoLegalURL('');
                          if (docInputRef.current) docInputRef.current.value = '';
                        }}
                        className="text-rose-400 hover:text-rose-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => docInputRef.current?.click()}
                      disabled={isUploadingDoc}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 border border-dashed border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center space-x-1.5 active:scale-98"
                    >
                      {isUploadingDoc ? (
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-400 animate-spin" />
                      ) : (
                        <Upload className="w-3.5 h-3.5 text-indigo-400" />
                      )}
                      <span>Subir Factura</span>
                    </button>
                  )}
                </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Notas Adicionales (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Notas del cliente, dirección o recordatorios..."
              value={notas}
              onChange={e => setNotas(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isSavingClient || isUploadingFoto || isUploadingDoc}
            className={`w-full py-4 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 shadow-xl transition-all ${
              saveSuccess
                ? 'bg-emerald-400 text-slate-950 shadow-emerald-500/30 scale-[1.01]'
                : isSavingClient
                ? 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 cursor-wait'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 shadow-emerald-500/20 active:scale-98'
            }`}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-slate-950 animate-bounce" />
                <span className="text-sm font-black">¡Cliente Guardado en Google Drive!</span>
              </>
            ) : isSavingClient ? (
              <>
                <RefreshCw className="w-4.5 h-4.5 text-emerald-400 animate-spin" />
                <span className="text-xs font-bold tracking-wide">Guardando en Google Drive...</span>
              </>
            ) : (
              <>
                <HardDrive className="w-4.5 h-4.5" />
                <span>Guardar Registro de Cliente en Google Drive</span>
              </>
            )}
          </button>
        </form>
      </BottomSheet>

      <CreditProductManagerModal
        isOpen={showProductModal}
        onClose={() => setShowProductModal(false)}
      />
    </div>
  );
}

export function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProjectsProvider>
      <MandatoryAuthGuard>
        <AuthenticatedApp>{children}</AuthenticatedApp>
      </MandatoryAuthGuard>
    </ProjectsProvider>
  );
}
