# 📊 Cobranza GD

**Cobranza GD** es una plataforma web progresiva y moderna diseñada para el control, administración y seguimiento integral de cobranzas, créditos, ventas únicas (fiado) y modelos por suscripción recurrente. Todos los datos y respaldos se sincronizan automáticamente con **Google Drive** y **Google Sheets** como base de datos en tiempo real.

---

## 🚀 Características Principales

- **Multi-modelo de negocio:**
  - 💳 **Crédito / Cuotas:** Cronogramas de amortización, cálculo automático de intereses, seguimiento de cuotas pagadas/pendientes y abonos libres en cascada.
  - 🔄 **Suscripciones Recurrentes:** Control de renovaciones (semanales, quincenales, mensuales, anuales), métricas MRR y alertas de vencimiento.
  - 🛍️ **Pago Único / Fiado:** Gestión directa de saldo sin fechas forzadas, registro de abonos parciales y liquidación completa de deuda en un clic.
- **Sincronización en la Nube con Google:**
  - Integración nativa con **Google Drive API** y **Google Sheets API**.
  - Respaldo de comprobantes, fotos y contratos legales en carpetas dedicadas de Drive.
  - Exportación y lectura directa desde hojas de cálculo de Google.
- **Comunicación Rápida:** Generación automática de recordatorios de cobro y enlaces directos a **WhatsApp**.
- **Dashboard & Reportes:** Métricas KPI en tiempo real (mora, capital recuperado, proyección mensual, ingresos netos).
- **Diseño Mobile-First:** Interfaz interactiva, moderna y optimizada para uso en dispositivos móviles y de escritorio.

---

## 🛠️ Tecnologías Utilizadas

- **Framework:** [Next.js](https://nextjs.org/) (App Router & Turbopack)
- **Lenguaje:** [TypeScript](https://www.typescriptlang.org/)
- **Estilos:** [Tailwind CSS](https://tailwindcss.com/)
- **Iconografía:** [Lucide React](https://lucide.dev/)
- **Integraciones:** Google Drive API & Google Sheets API v4

---

## ⚙️ Instalación y Despliegue Local

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/TeKronS/CobranzaGD.git
   cd CobranzaGD
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

4. Abrir en el navegador: [http://localhost:3000](http://localhost:3000)
