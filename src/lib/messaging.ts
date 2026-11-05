// ============================================================
// Cobranza GD — WhatsApp Message Generator
// ============================================================

import type { EnrichedClient } from '../types';

export function buildWhatsAppLink(client: EnrichedClient): string {
  if (!client.telefono) return '#';
  if (client.telefono.startsWith('#') || client.telefono.toLowerCase() === 'error') return '#';

  const cleanPhone = client.telefono.replace(/[^\d+]/g, '');
  const phone = cleanPhone.startsWith('+') ? cleanPhone.slice(1) : cleanPhone;
  if (!phone || phone.length < 7) return '#';

  let message = '';

  if (client.estadoCalc === 'mora' || client.estadoCalc === 's_vencido') {
    message = `Hola ${client.nombre}, 👋 Te saludamos de *Cobranza GD*. Te recordamos que tienes una cuota/pago pendiente por un monto de *${client.montoFormateado}* (Venció el ${client.fechaVence}). Agradecemos tu apoyo realizando la transferencia a la brevedad. ¡Muchas gracias! 🙏`;
  } else if (client.estadoCalc === 'hoy') {
    message = `Hola ${client.nombre}, 👋 Te recordamos que hoy *${client.fechaVence}* vence tu pago de *${client.montoFormateado}*. Por favor confírmanos al realizar tu pago. ¡Feliz día!`;
  } else {
    message = `Hola ${client.nombre}, 👋 Te escribimos desde *Cobranza GD* para hacerle seguimiento a tu cuenta. Saldo pendiente: *${client.deudaRestanteFormateada || client.montoFormateado}*. Próximo vencimiento: *${client.fechaVence}*.`;
  }

  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
