# 🤖 ContaIA Paraguay

Tu contabilidad inteligente, automatizada con IA.

---

## 🚀 CÓMO SUBIR A VERCEL (paso a paso)

### PASO 1 — Obtener API Key de Anthropic
1. Entrá a https://console.anthropic.com
2. Creá una cuenta gratuita
3. Ir a **API Keys** → **Create Key**
4. Copiá la clave (empieza con `sk-ant-...`)
5. Guardala en un lugar seguro

### PASO 2 — Subir a GitHub
1. Entrá a https://github.com y creá una cuenta
2. Clic en **New Repository**
3. Nombre: `contaia-paraguay`
4. Clic en **Create Repository**
5. Subí todos los archivos de esta carpeta

### PASO 3 — Desplegar en Vercel
1. Entrá a https://vercel.com
2. Clic en **Add New Project**
3. Conectá tu cuenta de GitHub
4. Seleccioná el repositorio `contaia-paraguay`
5. En **Environment Variables** agregá:
   - Nombre: `ANTHROPIC_API_KEY`
   - Valor: `sk-ant-tu-clave-aqui`
6. Clic en **Deploy**

¡En 2 minutos tu app está en línea! 🎉

---

## 📱 URL de tu app
Después del deploy vas a tener una URL como:
```
https://contaia-paraguay.vercel.app
```

---

## 💰 COSTOS
- Vercel: **GRATIS** (plan hobby)
- Anthropic API: aprox **U$D 0.01 por factura**
- Con 100 facturas/mes: **U$D 1 aproximadamente**

---

## 🛠️ PARA DESARROLLO LOCAL
```bash
npm install
npm run dev
```
Abrí http://localhost:3000

---

## 📞 SOPORTE
WhatsApp: +595 973 177809
Facebook: Contaia Paraguay
