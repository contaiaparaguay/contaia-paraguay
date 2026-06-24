import { useState, useRef } from "react";
import Head from "next/head";

// ══════════════════════════════════════════
// COLORES Y ESTILOS
// ══════════════════════════════════════════
const C = {
  bg: "#0A1628", bgCard: "#0D2140", bgLight: "#112244",
  azul: "#1A5276", azul2: "#2E86C1", verde: "#00C6A0",
  verdeDark: "#1A8A5A", white: "#FFFFFF", gray: "#B0C8F0",
  grayLight: "#1E3A5F", red: "#E74C3C", yellow: "#F39C12",
};

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => "Gs. " + Math.round(n(v)).toLocaleString("es-PY");

const card = (extra) => ({
  background: C.bgCard, borderRadius: 16,
  border: `1px solid ${C.grayLight}`, padding: 20, ...extra,
});

const inp = {
  background: C.bgLight, border: `1px solid ${C.grayLight}`,
  borderRadius: 8, color: C.white, padding: "8px 12px",
  fontSize: 13, width: "100%", boxSizing: "border-box",
};

const lbl = {
  color: C.gray, fontSize: 11, fontWeight: 700,
  textTransform: "uppercase", letterSpacing: 1,
  marginBottom: 4, display: "block",
};

const btn = (bg, color="#000", extra={}) => ({
  background: bg, color, border: "none", borderRadius: 10,
  padding: "10px 20px", fontWeight: 700, fontSize: 13,
  cursor: "pointer", ...extra,
});

// ══════════════════════════════════════════
// DATOS INICIALES
// ══════════════════════════════════════════
const initFactura = {
  tipo: "COMPRA", fecha: "", timbrado: "", numero: "",
  rucContraparte: "", nombreContraparte: "", descripcion: "",
  tipoComprobante: "109", condicion: "1",
  exento: "", gravado5: "", iva5: "", gravado10: "", iva10: "", total: "",
  imputaIVA: "S", imputaIRE: "N", imputaIRP: "N",
};

const TIPOS_COMP = [
  ["109","FACTURA"], ["103","BOLETA DE VENTA"], ["110","NOTA DE CRÉDITO"],
  ["111","NOTA DE DÉBITO"], ["101","AUTOFACTURA"], ["107","DESPACHO IMPORTACIÓN"],
  ["112","TICKET MÁQUINA"], ["102","BOLETA TRANSPORTE"], ["108","ENTRADA ESPECTÁCULO"],
];

export default function App() {
  const [pantalla, setPantalla] = useState("clientes");
  const [clientes, setClientes] = useState([]);
  const [clienteActivo, setClienteActivo] = useState(null);
  const [periodoActivo, setPeriodoActivo] = useState(null);
  const [libroActivo, setLibroActivo] = useState("COMPRA");
  const [formCliente, setFormCliente] = useState({ ruc: "", nombre: "", rucSinDV: "" });
  const [formPeriodo, setFormPeriodo] = useState({ mes: new Date().getMonth() + 1 < 10 ? "0" + (new Date().getMonth() + 1) : "" + (new Date().getMonth() + 1), anio: "" + new Date().getFullYear() });
  const [formFactura, setFormFactura] = useState(initFactura);
  const [editandoFactura, setEditandoFactura] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const [exportando, setExportando] = useState(false);
  const [secuencia, setSecuencia] = useState("V0001");
  const fileRef = useRef();

  // ── Helpers ──
  const facturasPeriodo = periodoActivo?.facturas || [];
  const compras = facturasPeriodo.filter(f => f.tipo === "COMPRA");
  const ventas  = facturasPeriodo.filter(f => f.tipo === "VENTA");
  const libroFacturas = libroActivo === "COMPRA" ? compras : ventas;

  const totPor = (lista) => lista.reduce((a, f) => ({
    exento: a.exento + n(f.exento), gravado5: a.gravado5 + n(f.gravado5),
    iva5: a.iva5 + n(f.iva5), gravado10: a.gravado10 + n(f.gravado10),
    iva10: a.iva10 + n(f.iva10), total: a.total + n(f.total),
  }), { exento: 0, gravado5: 0, iva5: 0, gravado10: 0, iva10: 0, total: 0 });

  const totC = totPor(compras);
  const totV = totPor(ventas);
  const sal5  = totV.iva5  - totC.iva5;
  const sal10 = totV.iva10 - totC.iva10;
  const salT  = sal5 + sal10;

  // ── Actualizar cliente en lista ──
  function actualizarCliente(clienteUpd) {
    setClientes(prev => prev.map(c => c.id === clienteUpd.id ? clienteUpd : c));
    setClienteActivo(clienteUpd);
  }

  function actualizarPeriodo(periodoUpd) {
    const clienteUpd = {
      ...clienteActivo,
      periodos: clienteActivo.periodos.map(p => p.id === periodoUpd.id ? periodoUpd : p),
    };
    actualizarCliente(clienteUpd);
    setPeriodoActivo(periodoUpd);
  }

  // ── Agregar cliente ──
  function agregarCliente() {
    if (!formCliente.ruc || !formCliente.nombre) { setError("Ingresá RUC y nombre."); return; }
    const rucSinDV = formCliente.ruc.split("-")[0].replace(/\D/g, "");
    const nuevo = { id: Date.now(), ruc: formCliente.ruc, nombre: formCliente.nombre, rucSinDV, periodos: [] };
    setClientes(prev => [...prev, nuevo]);
    setFormCliente({ ruc: "", nombre: "", rucSinDV: "" });
    setError(""); setSuccess("✅ Cliente agregado.");
  }

  function seleccionarCliente(c) {
    setClienteActivo(c); setPantalla("periodos"); setError(""); setSuccess("");
  }

  // ── Agregar período ──
  function agregarPeriodo() {
    if (!formPeriodo.mes || !formPeriodo.anio) { setError("Seleccioná mes y año."); return; }
    const periodo = `${formPeriodo.mes}/${formPeriodo.anio}`;
    const existe = clienteActivo.periodos.find(p => p.periodo === periodo);
    if (existe) { setPeriodoActivo(existe); setPantalla("libro"); return; }
    const nuevo = { id: Date.now(), periodo, mes: formPeriodo.mes, anio: formPeriodo.anio, facturas: [] };
    const clienteUpd = { ...clienteActivo, periodos: [...clienteActivo.periodos, nuevo] };
    actualizarCliente(clienteUpd);
    setPeriodoActivo(nuevo); setPantalla("libro"); setError("");
  }

  function seleccionarPeriodo(p) {
    setPeriodoActivo(p); setPantalla("libro"); setError(""); setSuccess("");
  }

  // ── Actualizar factura form ──
  function updFactura(key, val) {
    let u = { ...formFactura, [key]: val };
    if (key === "gravado5")  u.iva5  = val ? Math.round(n(val) / 21) : "";
    if (key === "gravado10") u.iva10 = val ? Math.round(n(val) / 11) : "";
    if (key !== "total") {
      const t = n(u.exento) + n(u.gravado5) + n(u.iva5) + n(u.gravado10) + n(u.iva10);
      u.total = t || "";
    }
    setFormFactura(u);
  }

  // ── Guardar factura ──
  function guardarFactura() {
    if (!formFactura.fecha || !formFactura.timbrado || !formFactura.numero) {
      setError("Completá: Fecha, Timbrado y N° Factura."); return;
    }
    const f = { ...formFactura, id: editandoFactura || Date.now() };
    let nuevas;
    if (editandoFactura) {
      nuevas = periodoActivo.facturas.map(x => x.id === editandoFactura ? f : x);
    } else {
      nuevas = [...periodoActivo.facturas, f];
    }
    const periodoUpd = { ...periodoActivo, facturas: nuevas };
    actualizarPeriodo(periodoUpd);
    setFormFactura({ ...initFactura, tipo: libroActivo });
    setEditandoFactura(null); setPreview(null);
    setError(""); setSuccess("✅ Factura guardada.");
  }

  function editarFactura(f) {
    setFormFactura(f); setEditandoFactura(f.id); setError(""); setSuccess("");
  }

  function eliminarFactura(id) {
    const nuevas = periodoActivo.facturas.filter(f => f.id !== id);
    actualizarPeriodo({ ...periodoActivo, facturas: nuevas });
  }

  // ── Leer factura con IA ──
  async function leerFactura(file) {
    setLoading(true); setError(""); setSuccess("");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });

      const prompt = `Sos un asistente especializado en facturas paraguayas del sistema DNIT/Marangatu.
Extraé los datos en JSON exacto sin texto adicional ni backticks.
Montos sin puntos (150000 no 150.000). Si no existe el campo usá cadena vacía o 0.
tipo: "${libroActivo}" (ya está definido).
IMPORTANTE: Los montos gravado5 y gravado10 son SIN IVA (base imponible).
{
  "fecha": "DD/MM/YYYY",
  "timbrado": "número 8 dígitos",
  "numero": "001-001-0000001",
  "rucContraparte": "RUC sin dígito verificador",
  "nombreContraparte": "nombre o razón social",
  "descripcion": "descripción bien o servicio",
  "tipoComprobante": "109",
  "condicion": "1",
  "exento": 0,
  "gravado5": 0,
  "iva5": 0,
  "gravado10": 0,
  "iva10": 0,
  "total": 0
}`;

      const resp = await fetch("/api/leer-factura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6", max_tokens: 1000,
          messages: [{ role: "user", content: [
            { type: file.type.startsWith("image/") ? "image" : "document",
              source: { type: "base64", media_type: file.type, data: base64 } },
            { type: "text", text: prompt },
          ]}],
        }),
      });

      const data = await resp.json();
      const texto = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(texto.replace(/```json|```/g, "").trim());

      if (parsed.gravado5 && !parsed.iva5) parsed.iva5 = Math.round(n(parsed.gravado5) / 21);
      if (parsed.gravado10 && !parsed.iva10) parsed.iva10 = Math.round(n(parsed.gravado10) / 11);
      if (!parsed.total) parsed.total = n(parsed.exento) + n(parsed.gravado5) + n(parsed.iva5) + n(parsed.gravado10) + n(parsed.iva10);

      setFormFactura(prev => ({ ...prev, ...parsed, tipo: libroActivo, imputaIVA: prev.imputaIVA, imputaIRE: prev.imputaIRE, imputaIRP: prev.imputaIRP }));
      setSuccess("✅ Factura leída. Revisá y guardá.");
      setEditandoFactura("nuevo-scan");
    } catch { setError("No se pudo leer la factura. Intentá con imagen más clara."); }
    setLoading(false);
  }

  function onFile(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file)); else setPreview(null);
    leerFactura(file); e.target.value = "";
  }

  // ── Exportar Excel ──
  async function exportarExcel(tipo) {
    setExportando(true);
    try {
      const resp = await fetch("/api/exportar-excel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ facturas: facturasPeriodo, tipo, cliente: clienteActivo, periodo: periodoActivo }),
      });
      if (!resp.ok) throw new Error("Error servidor");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const periodo = periodoActivo.periodo.replace("/","_");
      a.href = url; a.download = `ContaIA_${tipo}_${clienteActivo.rucSinDV}_${periodo}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert("Error al generar Excel. Intentá de nuevo."); }
    setExportando(false);
  }

  // ── Exportar ZIP Marangatu ──
  async function exportarMarangatu() {
    if (facturasPeriodo.length === 0) { alert("No hay facturas cargadas."); return; }
    setExportando(true);
    try {
      const resp = await fetch("/api/generar-marangatu", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facturas: facturasPeriodo,
          ruc: clienteActivo.rucSinDV,
          periodo: periodoActivo.periodo,
          secuencia,
        }),
      });
      if (!resp.ok) throw new Error("Error servidor");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const mes = periodoActivo.mes;
      const anio = periodoActivo.anio;
      a.href = url; a.download = `${clienteActivo.rucSinDV}_REG_${mes}${anio}_${secuencia}.zip`;
      a.click(); URL.revokeObjectURL(url);
      setSuccess("✅ Archivo ZIP generado listo para importar al Marangatu.");
    } catch { alert("Error al generar ZIP. Intentá de nuevo."); }
    setExportando(false);
  }

  // ══════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════
  return (
    <>
      <Head>
        <title>ContaIA Paraguay 🤖</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; background: ${C.bg}; color: ${C.white}; font-family: 'Segoe UI', Arial, sans-serif; }
        input, select { outline: none; }
        input::placeholder { color: #4A6080; }
        @keyframes spin { to { transform: rotate(360deg); } }
        table { border-collapse: collapse; width: 100%; }
        th, td { padding: 7px 10px; border-bottom: 1px solid ${C.grayLight}; font-size: 12px; }
        th { background: ${C.azul2}; color: white; font-weight: 700; text-align: left; }
        tr:nth-child(even) { background: ${C.bgLight}; }
        tr:hover { background: #1A3055; }
      `}</style>

      <div style={{ minHeight: "100vh" }}>

        {/* ── HEADER ── */}
        <div style={{ background: `linear-gradient(135deg,${C.bg},${C.azul})`, borderBottom: `2px solid ${C.azul2}`, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 44, height: 44, background: C.azul2, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🤖</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>ContaIA <span style={{ color: C.verde }}>Paraguay</span></div>
              <div style={{ color: C.gray, fontSize: 11 }}>Sistema contable inteligente con IA | DNIT 2026</div>
            </div>
          </div>

          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, flexWrap: "wrap" }}>
            <span onClick={() => setPantalla("clientes")} style={{ color: C.azul2, cursor: "pointer", fontWeight: 700 }}>🏠 Clientes</span>
            {clienteActivo && <>
              <span style={{ color: C.gray }}>/</span>
              <span onClick={() => setPantalla("periodos")} style={{ color: pantalla === "periodos" ? C.white : C.azul2, cursor: "pointer", fontWeight: 700 }}>{clienteActivo.nombre}</span>
            </>}
            {periodoActivo && <>
              <span style={{ color: C.gray }}>/</span>
              <span style={{ color: C.verde, fontWeight: 700 }}>{periodoActivo.periodo}</span>
            </>}
          </div>
        </div>

        <div style={{ padding: "20px", maxWidth: 960, margin: "0 auto" }}>

          {/* ══ PANTALLA CLIENTES ══ */}
          {pantalla === "clientes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={card()}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: C.azul2 }}>➕ Agregar nuevo cliente</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                  <div>
                    <label style={lbl}>RUC (con DV)</label>
                    <input placeholder="80012345-1" value={formCliente.ruc} onChange={e => setFormCliente(p => ({ ...p, ruc: e.target.value }))} style={inp} />
                  </div>
                  <div>
                    <label style={lbl}>Nombre / Razón Social</label>
                    <input placeholder="EMPRESA SA" value={formCliente.nombre} onChange={e => setFormCliente(p => ({ ...p, nombre: e.target.value.toUpperCase() }))} style={inp} />
                  </div>
                </div>
                {error && <div style={{ color: "#FF8A80", fontSize: 13, marginTop: 10 }}>⚠️ {error}</div>}
                {success && <div style={{ color: C.verde, fontSize: 13, marginTop: 10 }}>{success}</div>}
                <button onClick={agregarCliente} style={{ ...btn(C.verde, "#000"), marginTop: 14 }}>✅ Agregar cliente</button>
              </div>

              {clientes.length === 0 ? (
                <div style={{ ...card(), textAlign: "center", padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>👤</div>
                  <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Sin clientes aún</div>
                  <div style={{ color: C.gray }}>Agregá tu primer cliente para comenzar</div>
                </div>
              ) : (
                <div style={card()}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, color: C.azul2 }}>👥 Mis clientes ({clientes.length})</div>
                  {clientes.map(c => (
                    <div key={c.id} onClick={() => seleccionarCliente(c)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: C.bgLight, borderRadius: 10, marginBottom: 8, cursor: "pointer", border: `1px solid ${C.grayLight}`, transition: "border-color 0.2s" }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15 }}>{c.nombre}</div>
                        <div style={{ color: C.gray, fontSize: 12 }}>RUC: {c.ruc} | {c.periodos.length} período(s)</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ background: C.azul, color: C.white, borderRadius: 20, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>{c.periodos.length} períodos</span>
                        <span style={{ color: C.gray, fontSize: 18 }}>›</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ══ PANTALLA PERÍODOS ══ */}
          {pantalla === "periodos" && clienteActivo && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={card()}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 4, color: C.azul2 }}>📅 Seleccionar período</div>
                <div style={{ color: C.gray, fontSize: 12, marginBottom: 14 }}>Cliente: {clienteActivo.nombre} | RUC: {clienteActivo.ruc}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={lbl}>Mes</label>
                    <select value={formPeriodo.mes} onChange={e => setFormPeriodo(p => ({ ...p, mes: e.target.value }))} style={{ ...inp }}>
                      {["01","02","03","04","05","06","07","08","09","10","11","12"].map((m,i) => (
                        <option key={m} value={m}>{m} - {["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][i]}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={lbl}>Año</label>
                    <select value={formPeriodo.anio} onChange={e => setFormPeriodo(p => ({ ...p, anio: e.target.value }))} style={{ ...inp }}>
                      {["2025","2026","2027"].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                {error && <div style={{ color: "#FF8A80", fontSize: 13, marginTop: 10 }}>⚠️ {error}</div>}
                <button onClick={agregarPeriodo} style={{ ...btn(C.azul2, C.white), marginTop: 14 }}>📂 Abrir período {formPeriodo.mes}/{formPeriodo.anio}</button>
              </div>

              {clienteActivo.periodos.length > 0 && (
                <div style={card()}>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, color: C.verde }}>📋 Períodos registrados</div>
                  {clienteActivo.periodos.map(p => {
                    const nComp = p.facturas.filter(f => f.tipo === "COMPRA").length;
                    const nVent = p.facturas.filter(f => f.tipo === "VENTA").length;
                    return (
                      <div key={p.id} onClick={() => seleccionarPeriodo(p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: C.bgLight, borderRadius: 10, marginBottom: 8, cursor: "pointer", border: `1px solid ${C.grayLight}` }}>
                        <div style={{ fontWeight: 700 }}>📅 {p.periodo}</div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <span style={{ background: C.azul, color: C.white, borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>📥 {nComp}</span>
                          <span style={{ background: C.verdeDark, color: C.white, borderRadius: 20, padding: "2px 10px", fontSize: 11 }}>📤 {nVent}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══ PANTALLA LIBRO ══ */}
          {pantalla === "libro" && periodoActivo && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Info cliente + período */}
              <div style={{ ...card(), display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{clienteActivo.nombre}</div>
                  <div style={{ color: C.gray, fontSize: 12 }}>RUC: {clienteActivo.ruc} | Período: {periodoActivo.periodo}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ background: C.azul, color: C.white, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>📥 {compras.length} compras</span>
                  <span style={{ background: C.verdeDark, color: C.white, borderRadius: 20, padding: "4px 14px", fontSize: 12, fontWeight: 700 }}>📤 {ventas.length} ventas</span>
                </div>
              </div>

              {/* Tabs libro */}
              <div style={{ display: "flex", gap: 8 }}>
                {["COMPRA", "VENTA"].map(t => (
                  <button key={t} onClick={() => { setLibroActivo(t); setFormFactura({ ...initFactura, tipo: t }); setEditandoFactura(null); }} style={{ ...btn(libroActivo === t ? (t === "COMPRA" ? C.azul2 : C.verdeDark) : C.grayLight, C.white), flex: 1 }}>
                    {t === "COMPRA" ? "📥 LIBRO COMPRAS" : "📤 LIBRO VENTAS"}
                  </button>
                ))}
                <button onClick={() => setPantalla("resumen")} style={{ ...btn(C.yellow, "#000") }}>📊 Resumen</button>
              </div>

              {/* Escanear / Manual */}
              <div style={card()}>
                <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: libroActivo === "COMPRA" ? C.azul2 : C.verde }}>
                  {libroActivo === "COMPRA" ? "📥 Cargar factura de COMPRA" : "📤 Cargar factura de VENTA"}
                </div>

                {!editandoFactura && (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                    <div onClick={() => fileRef.current.click()} style={{ flex: 1, minWidth: 200, border: `2px dashed ${C.azul2}`, borderRadius: 12, padding: "20px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>📸</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Escanear con IA</div>
                      <div style={{ color: C.gray, fontSize: 12 }}>Foto JPG/PNG o PDF</div>
                      <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={onFile} />
                    </div>
                    <div onClick={() => { setFormFactura({ ...initFactura, tipo: libroActivo }); setEditandoFactura("nuevo-manual"); }} style={{ flex: 1, minWidth: 200, border: `2px dashed ${C.verde}`, borderRadius: 12, padding: "20px", textAlign: "center", cursor: "pointer" }}>
                      <div style={{ fontSize: 32, marginBottom: 6 }}>✏️</div>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>Carga manual</div>
                      <div style={{ color: C.gray, fontSize: 12 }}>Ingresá los datos</div>
                    </div>
                  </div>
                )}

                {loading && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 14, background: C.bgLight, borderRadius: 10, marginBottom: 14 }}>
                    <div style={{ width: 20, height: 20, border: `3px solid ${C.grayLight}`, borderTop: `3px solid ${C.verde}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <span style={{ color: C.verde, fontSize: 13 }}>Leyendo factura con IA de Claude...</span>
                  </div>
                )}

                {error && <div style={{ color: "#FF8A80", background: "#2D0A0A", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}>⚠️ {error}</div>}
                {success && !editandoFactura && <div style={{ color: C.verde, background: "#0A2D1A", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 10 }}>{success}</div>}

                {/* Formulario factura */}
                {editandoFactura && (
                  <div>
                    {success && <div style={{ color: C.verde, background: "#0A2D1A", borderRadius: 8, padding: 10, fontSize: 13, marginBottom: 12 }}>{success}</div>}
                    {preview && <img src={preview} alt="Factura" style={{ maxWidth: "100%", maxHeight: 160, borderRadius: 8, objectFit: "contain", marginBottom: 12, border: `1px solid ${C.grayLight}` }} />}

                    {/* Imputación */}
                    <div style={{ background: C.bgLight, borderRadius: 10, padding: 12, marginBottom: 14 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: C.gray, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Imputación de impuestos</div>
                      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                        {[["imputaIVA","IVA"],["imputaIRE","IRE"],["imputaIRP","IRP-RSP"]].map(([k,l]) => (
                          <label key={k} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                            <input type="checkbox" checked={formFactura[k] === "S"} onChange={e => setFormFactura(p => ({ ...p, [k]: e.target.checked ? "S" : "N" }))} style={{ width: 16, height: 16, accentColor: C.verde }} />
                            <span style={{ color: formFactura[k] === "S" ? C.verde : C.gray, fontWeight: 700 }}>{l}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 10, marginBottom: 14 }}>
                      {[
                        ["fecha","Fecha","DD/MM/YYYY"],
                        ["timbrado","Timbrado","12345678"],
                        ["numero","N° Factura","001-001-0000001"],
                        ["rucContraparte","RUC " + (libroActivo==="COMPRA"?"Proveedor":"Cliente"),"80012345"],
                        ["nombreContraparte","Nombre/Razón Social","EMPRESA SA"],
                        ["descripcion","Descripción","Bien o servicio"],
                      ].map(([k,l,ph]) => (
                        <div key={k}>
                          <label style={lbl}>{l}</label>
                          <input placeholder={ph} value={formFactura[k]} onChange={e => setFormFactura(p => ({ ...p, [k]: e.target.value }))} style={inp} />
                        </div>
                      ))}
                      <div>
                        <label style={lbl}>Tipo Comprobante</label>
                        <select value={formFactura.tipoComprobante} onChange={e => setFormFactura(p => ({ ...p, tipoComprobante: e.target.value }))} style={inp}>
                          {TIPOS_COMP.map(([v,l]) => <option key={v} value={v}>{v} - {l}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={lbl}>Condición</label>
                        <select value={formFactura.condicion} onChange={e => setFormFactura(p => ({ ...p, condicion: e.target.value }))} style={inp}>
                          <option value="1">1 - CONTADO</option>
                          <option value="2">2 - CRÉDITO</option>
                        </select>
                      </div>
                    </div>

                    {/* Montos */}
                    <div style={{ background: C.bgLight, borderRadius: 10, padding: 14 }}>
                      <div style={{ color: C.verde, fontWeight: 700, fontSize: 12, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>💰 Montos en Guaraníes — Base imponible SIN IVA</div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                        {[["exento","Exento (Gs)"],["gravado5","Base Grav. 5%"],["iva5","IVA 5% (auto)"],["gravado10","Base Grav. 10%"],["iva10","IVA 10% (auto)"],["total","TOTAL (Gs)"]].map(([k,l]) => (
                          <div key={k}>
                            <label style={lbl}>{l}</label>
                            <input type="number" placeholder="0" value={formFactura[k]} onChange={e => updFactura(k, e.target.value)}
                              style={{ ...inp, color: k==="total" ? C.verde : C.white, fontWeight: k==="total" ? 700 : 400 }} />
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
                      <button onClick={guardarFactura} style={{ ...btn(C.verde, "#000"), flex: 1, minWidth: 120 }}>✅ Guardar factura</button>
                      <button onClick={() => { setEditandoFactura(null); setFormFactura({ ...initFactura, tipo: libroActivo }); setPreview(null); setError(""); setSuccess(""); }} style={btn(C.grayLight, C.gray)}>Cancelar</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lista de facturas */}
              {libroFacturas.length > 0 && (
                <div style={card()}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 14, color: libroActivo === "COMPRA" ? C.azul2 : C.verde }}>
                    {libroActivo === "COMPRA" ? `📥 Compras (${compras.length})` : `📤 Ventas (${ventas.length})`}
                  </div>
                  <div style={{ overflowX: "auto" }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Fecha</th><th>Timbrado</th><th>N° Factura</th><th>RUC</th><th>Razón Social</th>
                          <th>Base 5%</th><th>IVA 5%</th><th>Base 10%</th><th>IVA 10%</th><th>Exento</th><th>Total</th><th></th>
                        </tr>
                      </thead>
                      <tbody>
                        {libroFacturas.map(f => (
                          <tr key={f.id}>
                            <td>{f.fecha}</td><td>{f.timbrado}</td><td>{f.numero}</td>
                            <td>{f.rucContraparte}</td><td>{f.nombreContraparte}</td>
                            <td style={{ color: C.verde }}>{fmt(f.gravado5)}</td>
                            <td style={{ color: C.verde }}>{fmt(f.iva5)}</td>
                            <td style={{ color: C.verde }}>{fmt(f.gravado10)}</td>
                            <td style={{ color: C.verde }}>{fmt(f.iva10)}</td>
                            <td>{fmt(f.exento)}</td>
                            <td style={{ fontWeight: 700 }}>{fmt(f.total)}</td>
                            <td style={{ whiteSpace: "nowrap" }}>
                              <button onClick={() => { editarFactura(f); setEditandoFactura(f.id); }} style={{ ...btn(C.azul2, C.white, { padding: "3px 8px", fontSize: 11, marginRight: 4 }) }}>✏️</button>
                              <button onClick={() => eliminarFactura(f.id)} style={{ ...btn(C.red, C.white, { padding: "3px 8px", fontSize: 11 }) }}>🗑️</button>
                            </td>
                          </tr>
                        ))}
                        <tr style={{ background: libroActivo==="COMPRA"?C.azul:C.verdeDark, fontWeight: 700 }}>
                          <td colSpan={5} style={{ color: C.white }}>TOTAL</td>
                          {(() => { const t = totPor(libroFacturas); return [t.gravado5,t.iva5,t.gravado10,t.iva10,t.exento,t.total].map((v,i) => <td key={i} style={{ color: C.white }}>{fmt(v)}</td>); })()}
                          <td />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══ PANTALLA RESUMEN ══ */}
          {pantalla === "resumen" && periodoActivo && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Volver */}
              <button onClick={() => setPantalla("libro")} style={{ ...btn(C.grayLight, C.gray), alignSelf: "flex-start" }}>← Volver al libro</button>

              {/* Resumen totales */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {[
                  [`📥 Compras (${compras.length})`, fmt(totC.total), C.azul2],
                  [`📤 Ventas (${ventas.length})`, fmt(totV.total), C.verdeDark],
                  ["💰 IVA a Pagar", fmt(salT > 0 ? salT : 0), salT > 0 ? C.yellow : C.verde],
                  ["💚 Saldo a Favor", fmt(salT < 0 ? Math.abs(salT) : 0), C.verde],
                ].map(([l, v, col]) => (
                  <div key={l} style={{ ...card(), borderLeft: `4px solid ${col}` }}>
                    <div style={{ color: C.gray, fontSize: 12, marginBottom: 4 }}>{l}</div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: col }}>{v}</div>
                  </div>
                ))}
              </div>

              {/* Formulario 120 */}
              <div style={card()}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: C.azul2 }}>📋 Resumen Formulario 120 — IVA</div>
                <div style={{ display: "grid", gridTemplateColumns: "50px 1fr 160px 160px 160px", gap: 6, fontSize: 12, marginBottom: 6 }}>
                  {["","","IVA 5%","IVA 10%","TOTAL"].map((h,i) => <div key={i} style={{ color: C.gray, fontWeight: 700, textAlign: i > 1 ? "right" : "left" }}>{h}</div>)}
                </div>

                {[
                  { header: true, label: "I. DÉBITO FISCAL (VENTAS)", color: C.azul2 },
                  { cod: "101", label: "IVA ventas tasa 5%", v5: totV.iva5, v10: 0 },
                  { cod: "102", label: "IVA ventas tasa 10%", v5: 0, v10: totV.iva10 },
                  { sub: true, label: "Subtotal Débito", v5: totV.iva5, v10: totV.iva10 },
                  { header: true, label: "II. CRÉDITO FISCAL (COMPRAS)", color: C.verdeDark },
                  { cod: "201", label: "IVA compras tasa 5%", v5: totC.iva5, v10: 0 },
                  { cod: "202", label: "IVA compras tasa 10%", v5: 0, v10: totC.iva10 },
                  { sub: true, label: "Subtotal Crédito", v5: totC.iva5, v10: totC.iva10 },
                  { header: true, label: "III. SALDO DEL PERÍODO", color: C.yellow },
                  { cod: "301", label: "Saldo a pagar", v5: sal5 > 0 ? sal5 : 0, v10: sal10 > 0 ? sal10 : 0 },
                  { cod: "302", label: "Saldo a favor", v5: sal5 < 0 ? Math.abs(sal5) : 0, v10: sal10 < 0 ? Math.abs(sal10) : 0 },
                ].map((row, i) => {
                  if (row.header) return <div key={i} style={{ background: row.color, borderRadius: 8, padding: "8px 12px", fontWeight: 800, fontSize: 12, color: C.white, margin: "8px 0 4px" }}>{row.label}</div>;
                  const tot = (row.v5 || 0) + (row.v10 || 0);
                  return (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "50px 1fr 160px 160px 160px", gap: 6, padding: "7px 0", borderBottom: `1px solid ${C.grayLight}`, fontSize: 12, background: row.sub ? C.bgLight : "transparent", borderRadius: row.sub ? 6 : 0 }}>
                      <span style={{ color: C.azul2, fontWeight: 700 }}>{row.cod || ""}</span>
                      <span style={{ fontWeight: row.sub ? 700 : 400 }}>{row.label}</span>
                      <span style={{ textAlign: "right", color: C.verde }}>{fmt(row.v5 || 0)}</span>
                      <span style={{ textAlign: "right", color: C.verde }}>{fmt(row.v10 || 0)}</span>
                      <span style={{ textAlign: "right", fontWeight: 700, color: row.sub ? C.yellow : C.white }}>{fmt(tot)}</span>
                    </div>
                  );
                })}

                <div style={{ background: salT > 0 ? "#2D1A00" : "#0A2D1A", border: `2px solid ${salT > 0 ? C.yellow : C.verde}`, borderRadius: 10, padding: 14, marginTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{salT > 0 ? "⚠️ IVA A PAGAR AL FISCO" : "✅ SALDO A FAVOR"}</div>
                    <div style={{ color: C.gray, fontSize: 12 }}>Imputar en el Marangatu</div>
                  </div>
                  <div style={{ fontWeight: 900, fontSize: 24, color: salT > 0 ? C.yellow : C.verde }}>{fmt(Math.abs(salT))}</div>
                </div>
              </div>

              {/* Descargas */}
              <div style={card()}>
                <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color: C.verde }}>📥 Descargar archivos</div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
                  {/* Excel prolijo */}
                  <div style={{ background: C.bgLight, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📊 Planillas Excel profesionales</div>
                    <div style={{ color: C.gray, fontSize: 12, marginBottom: 12 }}>Con colores, totales y formato prolijo para el contador</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <button onClick={() => exportarExcel("COMPRA")} disabled={exportando || compras.length === 0} style={{ ...btn(C.azul2, C.white), opacity: compras.length === 0 ? 0.5 : 1 }}>📥 Libro Compras Excel</button>
                      <button onClick={() => exportarExcel("VENTA")} disabled={exportando || ventas.length === 0} style={{ ...btn(C.verdeDark, C.white), opacity: ventas.length === 0 ? 0.5 : 1 }}>📤 Libro Ventas Excel</button>
                      <button onClick={() => exportarExcel("TODOS")} disabled={exportando || facturasPeriodo.length === 0} style={{ ...btn(C.yellow, "#000"), opacity: facturasPeriodo.length === 0 ? 0.5 : 1 }}>📚 Libro C/V + Form. 120</button>
                    </div>
                  </div>

                  {/* ZIP Marangatu */}
                  <div style={{ background: C.bgLight, borderRadius: 12, padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>📦 Archivo ZIP para Marangatu</div>
                    <div style={{ color: C.gray, fontSize: 12, marginBottom: 12 }}>Listo para importar al sistema — Formato DNIT exacto (RG 90)</div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={lbl}>Secuencia del archivo</label>
                      <input value={secuencia} onChange={e => setSecuencia(e.target.value.toUpperCase())} placeholder="V0001" style={inp} maxLength={5} />
                      <div style={{ color: C.gray, fontSize: 11, marginTop: 4 }}>
                        Nombre: {clienteActivo.rucSinDV}_REG_{periodoActivo.mes}{periodoActivo.anio}_{secuencia}.zip
                      </div>
                    </div>
                    <button onClick={exportarMarangatu} disabled={exportando || facturasPeriodo.length === 0} style={{ ...btn("#9B59B6", C.white), width: "100%", opacity: facturasPeriodo.length === 0 ? 0.5 : 1 }}>
                      📦 Generar ZIP para Marangatu
                    </button>
                    <div style={{ color: C.gray, fontSize: 11, marginTop: 8, lineHeight: 1.6 }}>
                      ✅ CSV con formato DNIT oficial<br/>
                      ✅ Incluye compras y ventas<br/>
                      ✅ Montos con IVA incluido<br/>
                      ✅ Listo para importar directo
                    </div>
                  </div>
                </div>

                {success && <div style={{ color: C.verde, background: "#0A2D1A", borderRadius: 8, padding: 10, fontSize: 13, marginTop: 12 }}>{success}</div>}
                {exportando && (
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, color: C.verde, fontSize: 13 }}>
                    <div style={{ width: 18, height: 18, border: `3px solid ${C.grayLight}`, borderTop: `3px solid ${C.verde}`, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    Generando archivo...
                  </div>
                )}
              </div>

              <div style={{ color: C.gray, fontSize: 11, textAlign: "center", padding: 8 }}>
                ✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
