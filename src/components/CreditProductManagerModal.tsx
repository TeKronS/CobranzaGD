'use client';

import React, { useState } from 'react';
import { BottomSheet } from './BottomSheet';
import { useProjects } from '../context/ProjectsContext';
import type { CreditProduct, Currency } from '../types';
import { Package, Plus, Trash2, Tag, ShieldCheck, DollarSign } from 'lucide-react';
import { formatCurrency } from '../lib/clients';

interface CreditProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditProductManagerModal({ isOpen, onClose }: CreditProductManagerModalProps) {
  const { activeProject, addCreditProduct, deleteCreditProduct } = useProjects();
  const [nombre, setNombre] = useState('');
  const [modelo, setModelo] = useState('');
  const [precio, setPrecio] = useState('');
  const [serial, setSerial] = useState('');

  const products = activeProject?.productosCredito || [];

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !precio || !activeProject) return;

    await addCreditProduct(activeProject.id, {
      nombre: nombre.trim(),
      modelo: modelo.trim() || undefined,
      precio: parseFloat(precio) || 0,
      serial: serial.trim() || undefined,
    });

    setNombre('');
    setModelo('');
    setPrecio('');
    setSerial('');
  };

  const handleDelete = async (prodId: string) => {
    if (confirm('¿Eliminar este producto del catálogo a crédito?')) {
      if (activeProject) {
        await deleteCreditProduct(activeProject.id, prodId);
      }
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Catálogo de Productos a Crédito 📦">
      <div className="space-y-4 pt-1 text-slate-200">
        <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-slate-800 space-y-1">
          <div className="flex items-center space-x-2 text-xs font-extrabold text-white">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Productos para {activeProject?.nombre || 'este negocio'}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Registra los productos y artículos de tu catálogo para venderlos a crédito fácilmente.
          </p>
        </div>

        {/* LIST OF REGISTERED PRODUCTS */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {products.length === 0 ? (
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-center space-y-1">
              <Package className="w-6 h-6 text-slate-600 mx-auto" />
              <p className="text-xs text-slate-400">No hay productos registrados en este catálogo.</p>
            </div>
          ) : (
            products.map(prod => (
              <div
                key={prod.id}
                className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <div className="font-extrabold text-xs text-white flex items-center space-x-2">
                    <span>{prod.nombre}</span>
                    {prod.modelo && (
                      <span className="px-2 py-0.2 rounded-md bg-slate-800 text-[10px] text-slate-300 font-mono">
                        {prod.modelo}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-3 text-[11px]">
                    <span className="font-bold text-emerald-400">{formatCurrency(prod.precio)}</span>
                    {prod.serial && (
                      <span className="text-slate-400 font-mono text-[10px]">
                        Serial/ID: {prod.serial}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(prod.id)}
                  className="p-2 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 active:scale-95 transition-all"
                  title="Eliminar producto"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* FORM TO ADD NEW PRODUCT */}
        <form onSubmit={handleCreateProduct} className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center space-x-1.5">
            <Plus className="w-4 h-4 text-emerald-400" />
            <span>Agregar Producto al Catálogo</span>
          </h4>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Nombre del Producto / Artículo *
            </label>
            <input
              type="text"
              required
              placeholder="Ej: Nevera, Celular, Calzado, Mercancía..."
              value={nombre}
              onChange={e => setNombre(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Modelo / Talla / Versión (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: 128GB, Talla 42, Estándar"
                value={modelo}
                onChange={e => setModelo(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Precio Base ($) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={precio}
                onChange={e => setPrecio(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-bold text-emerald-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Serial / IMEI / Código / REF (Opcional)
            </label>
            <input
              type="text"
              placeholder="Ej: SN-94812, IMEI, REF-01"
              value={serial}
              onChange={e => setSerial(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-xs font-mono"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-extrabold text-xs shadow-lg shadow-emerald-500/20 active:scale-98 transition-all"
          >
            Guardar Producto en Catálogo
          </button>
        </form>
      </div>
    </BottomSheet>
  );
}
