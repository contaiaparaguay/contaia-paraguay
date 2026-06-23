import { useState, useRef } from "react";
import Head from "next/head";
import * as XLSX from "xlsx";

const C = {
  azul: "#1A5276", azul2: "#2E86C1", verde: "#00C6A0",
  verdeDark: "#1A8A5A", bg: "#0A1628", bgCard: "#0D2140",
  bgLight: "#112244", white: "#FFFFFF", gray: "#B0C8F0",
  grayLight: "#1E3A5F", red: "#E74C3C", yellow: "#F39C12",
};

const initF = {
  tipo:"COMPRA",fecha:"",timbrado:"",numero:"",ruc:"",
  razonSocial:"",descripcion:"",exento:"",gravado5:"",
  iva5:"",gravado10:"",iva10:"",total:"",
};

const n = (v) => parseFloat(v) || 0;
const fmt = (v) => "Gs. " + Math.round(v).toLocaleString("es-PY");

function totales(list, tipo) {
  return list.filter(f => f.tipo === tipo).reduce(
    (a, f) => ({
      exento: a.exento + n(f.exento), gravado5: a.gravado5 + n(f.gravado5),
      iva5: a.iva5 + n(f.iva5), gravado10: a.gravado10 + n(f.gravado10),
      iva10: a.iva10 + n(f.iva10), total: a.total + n(f.total),
    }),
    { exento:0,gravado5:0,iva5:0,gravado10:0,iva10:0,total:0 }
  );
}

// ══ ESTILO CELDA XLSX ══
function estilo(bg, color="000000", bold=false, align="center", border=true) {
  const b = { style:"thin", color:{rgb:"AAAAAA"} };
  return {
    fill: { fgColor: { rgb: bg } },
    font: { bold, color: { rgb: color }, name: "Arial", sz: 10 },
    alignment: { horizontal: align, vertical: "center", wrapText: true },
    border: border ? { top:b, bottom:b, left:b, right:b } : {},
  };
}

function exportarExcel(facturas, tipo, nombreArchivo) {
  const wb = XLSX.utils.book_new();

  // ── Hoja de facturas ──
  const headers = ["N°","FECHA","TIMBRADO","N° FACTURA","RUC","RAZÓN SOCIAL","DESCRIPCIÓN","EXENTO (Gs)","GRAVADO 5%","IVA 5%","GRAVADO 10%","IVA 10%","TOTAL (Gs)"];
  const lista = tipo === "TODOS" ? facturas : facturas.filter(f => f.tipo === tipo);
  const compras = facturas.filter(f => f.tipo === "COMPRA");
  const ventas  = facturas.filter(f => f.tipo === "VENTA");
  const totC = totales(facturas, "COMPRA");
  const totV = totales(facturas, "VENTA");

  function crearHojaFacturas(datos, titulo, bgHeader) {
    const wsData = [];

    // Título
    wsData.push([titulo + " — ContaIA Paraguay | Normativa DNIT 2026"]);
    wsData.push([]);

    // Headers
    wsData.push(headers);

    // Datos
    datos.forEach((f, i) => {
      wsData.push([
        i+1, f.fecha, f.timbrado, f.numero, f.ruc, f.razonSocial, f.descripcion,
        n(f.exento), n(f.gravado5), n(f.iva5), n(f.gravado10), n(f.iva10), n(f.total)
      ]);
    });

    // Total
    const tot = datos.reduce((a,f) => ({
      exento: a.exento+n(f.exento), gravado5: a.gravado5+n(f.gravado5),
      iva5: a.iva5+n(f.iva5), gravado10: a.gravado10+n(f.gravado10),
      iva10: a.iva10+n(f.iva10), total: a.total+n(f.total)
    }), {exento:0,gravado5:0,iva5:0,gravado10:0,iva10:0,total:0});

    wsData.push(["","","","","","","TOTAL DEL PERÍODO",
      Math.round(tot.exento), Math.round(tot.gravado5), Math.round(tot.iva5),
      Math.round(tot.gravado10), Math.round(tot.iva10), Math.round(tot.total)
    ]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Anchos de columna
    ws["!cols"] = [
      {wch:5},{wch:12},{wch:13},{wch:18},{wch:15},{wch:28},{wch:22},
      {wch:14},{wch:14},{wch:12},{wch:14},{wch:12},{wch:16}
    ];

    // Merge título
    ws["!merges"] = [{ s:{r:0,c:0}, e:{r:0,c:12} }];

    // Estilos fila título
    ws["A1"].s = estilo("1A5276","FFFFFF",true,"center",false);

    // Estilos headers (fila 3)
    headers.forEach((_, i) => {
      const cell = XLSX.utils.encode_cell({r:2, c:i});
      if (ws[cell]) ws[cell].s = estilo(bgHeader,"FFFFFF",true,"center");
    });

    // Estilos datos
    wsData.slice(3, wsData.length-1).forEach((row, ri) => {
      const bg = ri % 2 === 0 ? "EBF5FB" : "FFFFFF";
      row.forEach((_, ci) => {
        const cell = XLSX.utils.encode_cell({r:ri+3, c:ci});
        if (ws[cell]) {
          ws[cell].s = estilo(bg, "000000", false, ci >= 7 ? "right" : "left");
          if (ci >= 7) ws[cell].z = '#,##0';
        }
      });
    });

    // Estilo fila total
    const totRow = wsData.length - 1;
    headers.forEach((_, ci) => {
      const cell = XLSX.utils.encode_cell({r:totRow+2, c:ci});
      if (ws[cell]) {
        ws[cell].s = estilo("2E86C1","FFFFFF",true, ci >= 7 ? "right" : "center");
        if (ci >= 7) ws[cell].z = '#,##0';
      }
    });

    return ws;
  }

  // ── Libro C/V ──
  function crearLibroCVHoja() {
    const wsData = [
      ["📚 LIBRO COMPRA / VENTA — ContaIA Paraguay | Normativa DNIT 2026"],
      [],
      ["CONCEPTO","EXENTO (Gs)","GRAVADO 5%","IVA 5%","GRAVADO 10%","IVA 10%","TOTAL (Gs)"],
      ["TOTAL COMPRAS", Math.round(totC.exento), Math.round(totC.gravado5), Math.round(totC.iva5), Math.round(totC.gravado10), Math.round(totC.iva10), Math.round(totC.total)],
      ["TOTAL VENTAS",  Math.round(totV.exento), Math.round(totV.gravado5), Math.round(totV.iva5), Math.round(totV.gravado10), Math.round(totV.iva10), Math.round(totV.total)],
      [],
      ["IVA VENTAS (DÉBITO FISCAL)","","",Math.round(totV.iva5),"",Math.round(totV.iva10),Math.round(totV.iva5+totV.iva10)],
      ["IVA COMPRAS (CRÉDITO FISCAL)","","",Math.round(totC.iva5),"",Math.round(totC.iva10),Math.round(totC.iva5+totC.iva10)],
      ["✅ SALDO IVA (DÉBITO - CRÉDITO)","","",Math.round(totV.iva5-totC.iva5),"",Math.round(totV.iva10-totC.iva10),Math.round((totV.iva5+totV.iva10)-(totC.iva5+totC.iva10))],
      [],
      ["✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{wch:35},{wch:16},{wch:16},{wch:14},{wch:16},{wch:14},{wch:16}];
    ws["!merges"] = [
      { s:{r:0,c:0}, e:{r:0,c:6} },
      { s:{r:10,c:0}, e:{r:10,c:6} },
    ];
    if (ws["A1"]) ws["A1"].s = estilo("1A5276","FFFFFF",true,"center",false);
    ["A","B","C","D","E","F","G"].forEach((col,i) => {
      const cell = col+"3";
      if (ws[cell]) ws[cell].s = estilo("2E86C1","FFFFFF",true,"center");
    });
    if (ws["A4"]) ws["A4"].s = estilo("D6EAF8","000000",true,"left");
    if (ws["A5"]) ws["A5"].s = estilo("D5F5E7","000000",true,"left");
    if (ws["A9"]) ws["A9"].s = estilo("D5F5E7","000000",true,"left");
    return ws;
  }

  // ── Form 120 ──
  function crearForm120Hoja() {
    const sal5  = totV.iva5  - totC.iva5;
    const sal10 = totV.iva10 - totC.iva10;
    const salT  = sal5 + sal10;

    const wsData = [
      ["📋 FORMULARIO 120 — IVA | DNIT Paraguay | ContaIA Paraguay"],
      ["Normativa: RG N° 90/2021 | Formulario 120 V4"],
      [],
      ["COD","CONCEPTO","IVA 5% (Gs)","IVA 10% (Gs)","TOTAL IVA (Gs)"],
      ["","I. DÉBITO FISCAL (VENTAS)","","",""],
      ["101","IVA ventas tasa 5%", Math.round(totV.iva5), 0, Math.round(totV.iva5)],
      ["102","IVA ventas tasa 10%", 0, Math.round(totV.iva10), Math.round(totV.iva10)],
      ["","Subtotal Débito Fiscal", Math.round(totV.iva5), Math.round(totV.iva10), Math.round(totV.iva5+totV.iva10)],
      ["","II. CRÉDITO FISCAL (COMPRAS)","","",""],
      ["201","IVA compras tasa 5%", Math.round(totC.iva5), 0, Math.round(totC.iva5)],
      ["202","IVA compras tasa 10%", 0, Math.round(totC.iva10), Math.round(totC.iva10)],
      ["","Subtotal Crédito Fiscal", Math.round(totC.iva5), Math.round(totC.iva10), Math.round(totC.iva5+totC.iva10)],
      ["","III. SALDO DEL PERÍODO","","",""],
      ["301","Saldo IVA a pagar", Math.round(sal5>0?sal5:0), Math.round(sal10>0?sal10:0), Math.round(salT>0?salT:0)],
      ["302","Saldo a favor contribuyente", Math.round(sal5<0?Math.abs(sal5):0), Math.round(sal10<0?Math.abs(sal10):0), Math.round(salT<0?Math.abs(salT):0)],
      ["","✅ TOTAL IVA A PAGAR AL FISCO","","", Math.round(salT>0?salT:0)],
      [],
      ["","⚠️ Verificá los datos antes de imputar en el Marangatu","","",""],
      ["","✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py","","",""],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws["!cols"] = [{wch:8},{wch:38},{wch:16},{wch:16},{wch:16}];
    ws["!merges"] = [
      { s:{r:0,c:0}, e:{r:0,c:4} },
      { s:{r:1,c:0}, e:{r:1,c:4} },
    ];
    if (ws["A1"]) ws["A1"].s = estilo("1A5276","FFFFFF",true,"center",false);
    if (ws["A2"]) ws["A2"].s = estilo("2E86C1","FFFFFF",false,"center",false);
    ["A","B","C","D","E"].forEach(col => {
      if (ws[col+"4"]) ws[col+"4"].s = estilo("2E86C1","FFFFFF",true,"center");
    });
    // Secciones
    ["A5","B5","C5","D5","E5"].forEach(c => { if(ws[c]) ws[c].s = estilo("2E86C1","FFFFFF",true,"left"); });
    ["A9","B9","C9","D9","E9"].forEach(c => { if(ws[c]) ws[c].s = estilo("1A8A5A","FFFFFF",true,"left"); });
    ["A13","B13","C13","D13","E13"].forEach(c => { if(ws[c]) ws[c].s = estilo("F39C12","000000",true,"left"); });
    ["A8","B8","C8","D8","E8"].forEach(c => { if(ws[c]) ws[c].s = estilo("D6EAF8","000000",true,c==="A8"?"left":"right"); });
    ["A12","B12","C12","D12","E12"].forEach(c => { if(ws[c]) ws[c].s = estilo("D5F5E7","000000",true,c==="A12"?"left":"right"); });
    ["A16","B16","C16","D16","E16"].forEach(c => { if(ws[c]) ws[c].s = estilo("FEF9E7","000000",true,c==="A16"?"left":"right"); });
    return ws;
  }

  // Agregar hojas según tipo
  if (tipo === "COMPRA" || tipo === "TODOS") {
    const ws = crearHojaFacturas(compras, "📥 LIBRO DE COMPRAS", "1A5276");
    XLSX.utils.book_append_sheet(wb, ws, "COMPRAS");
  }
  if (tipo === "VENTA" || tipo === "TODOS") {
    const ws = crearHojaFacturas(ventas, "📤 LIBRO DE VENTAS", "1A8A5A");
    XLSX.utils.book_append_sheet(wb, ws, "VENTAS");
  }
  if (tipo === "TODOS") {
    XLSX.utils.book_append_sheet(wb, crearLibroCVHoja(), "LIBRO C-V");
    XLSX.utils.book_append_sheet(wb, crearForm120Hoja(), "FORMULARIO 120");
  }
  if (tipo === "FORM120") {
    XLSX.utils.book_append_sheet(wb, crearForm120Hoja(), "FORMULARIO 120");
  }

  XLSX.writeFile(wb, `${nombreArchivo}_ContaIA_Paraguay.xlsx`);
}

const card = (extra) => ({
  background: C.bgCard, borderRadius: 16,
  border: `1px solid ${C.grayLight}`, padding: 24, ...extra,
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

function BtnExport({ onClick, label, color }) {
  return (
    <button onClick={onClick} style={{
      background: color || C.verde, color: color === C.azul2 || color === C.verdeDark ? C.white : "#000",
      border: "none", borderRadius: 10, padding: "10px 18px",
      fontWeight: 700, fontSize: 13, cursor: "pointer",
      display: "flex", alignItems: "center", gap: 6,
    }}>
      📥 {label}
    </button>
  );
}

export default function App() {
  const [tab, setTab] = useState("scanner");
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [preview, setPreview] = useState(null);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(initF);
  const [tipoManual, setTipoManual] = useState("COMPRA");
  const fileRef = useRef();

  const compras = facturas.filter(f => f.tipo === "COMPRA");
  const ventas  = facturas.filter(f => f.tipo === "VENTA");
  const totC = totales(facturas, "COMPRA");
  const totV = totales(facturas, "VENTA");
  const sal5 = totV.iva5 - totC.iva5, sal10 = totV.iva10 - totC.iva10;
  const salT = sal5 + sal10;

  async function leerFactura(file) {
    setLoading(true); setError(""); setSuccess("");
    try {
      const base64 = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result.split(",")[1]);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        setError("Solo se aceptan imágenes JPG/PNG o PDF."); setLoading(false); return;
      }
      const prompt = `Sos un asistente especializado en facturas paraguayas DNIT/Marangatu.
Extraé los datos en JSON exacto sin texto ni backticks. Montos como números sin puntos.
tipo: "COMPRA" si recibimos del proveedor, "VENTA" si emitimos.
{"tipo":"COMPRA o VENTA","fecha":"DD/MM/YYYY","timbrado":"","numero":"001-001-0000001","ruc":"","razonSocial":"","descripcion":"","exento":0,"gravado5":0,"iva5":0,"gravado10":0,"iva10":0,"total":0}`;

      const res = await fetch("/api/leer-factura", {
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
      const data = await res.json();
      const texto = data.content?.find(b => b.type === "text")?.text || "";
      const parsed = JSON.parse(texto.replace(/```json|```/g, "").trim());
      if (parsed.gravado5 && !parsed.iva5) parsed.iva5 = Math.round(parsed.gravado5 / 21);
      if (parsed.gravado10 && !parsed.iva10) parsed.iva10 = Math.round(parsed.gravado10 / 11);
      if (!parsed.total) parsed.total = n(parsed.exento)+n(parsed.gravado5)+n(parsed.iva5)+n(parsed.gravado10)+n(parsed.iva10);
      setForm({ ...initF, ...parsed });
      setEditando("nuevo");
      setSuccess("✅ Factura leída. Revisá y confirmá.");
    } catch { setError("No se pudo leer la factura. Intentá con imagen más clara."); }
    setLoading(false);
  }

  function onFile(e) {
    const file = e.target.files[0]; if (!file) return;
    if (file.type.startsWith("image/")) setPreview(URL.createObjectURL(file)); else setPreview(null);
    leerFactura(file); e.target.value = "";
  }

  function guardar() {
    if (!form.fecha || !form.ruc || !form.razonSocial) { setError("Completá: Fecha, RUC y Razón Social."); return; }
    if (editando === "nuevo") setFacturas([...facturas, { ...form, id: Date.now() }]);
    else setFacturas(facturas.map(f => f.id === editando ? { ...form, id: editando } : f));
    setForm(initF); setEditando(null); setPreview(null);
    setSuccess("✅ Factura guardada."); setError(""); setTab("libro");
  }

  function editar(f) { setForm(f); setEditando(f.id); setTab("scanner"); }
  function eliminar(id) { setFacturas(facturas.filter(f => f.id !== id)); }
  function manual() { setForm({ ...initF, tipo: tipoManual }); setEditando("nuevo"); setError(""); setSuccess(""); setPreview(null); }

  function updForm(key, val) {
    let u = { ...form, [key]: val };
    if (key === "gravado5") u.iva5 = val ? Math.round(val/21) : "";
    if (key === "gravado10") u.iva10 = val ? Math.round(val/11) : "";
    if (key !== "total") u.total = n(u.exento)+n(u.gravado5)+n(u.iva5)+n(u.gravado10)+n(u.iva10) || "";
    setForm(u);
  }

  const TabBtn = ({ id, label }) => (
    <button onClick={() => setTab(id)} style={{
      padding:"10px 18px", borderRadius:10, border:"none", cursor:"pointer",
      fontWeight:700, fontSize:14,
      background: tab===id ? C.azul2 : C.grayLight,
      color: tab===id ? C.white : C.gray,
    }}>{label}</button>
  );

  return (
    <>
      <Head>
        <title>ContaIA Paraguay 🤖</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <div style={{ minHeight:"100vh", background:C.bg, color:C.white, fontFamily:"'Segoe UI',Arial,sans-serif" }}>

        <div style={{ background:`linear-gradient(135deg,${C.bg},${C.azul})`, borderBottom:`2px solid ${C.azul2}`, padding:"18px 24px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:48,height:48,background:C.azul2,borderRadius:14,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26 }}>🤖</div>
            <div>
              <div style={{ fontWeight:900,fontSize:22 }}>ContaIA <span style={{color:C.verde}}>Paraguay</span></div>
              <div style={{ color:C.gray,fontSize:12 }}>Tu contabilidad inteligente, automatizada con IA</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
            <span style={{ background:C.verdeDark,color:C.white,borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700 }}>{facturas.length} facturas</span>
            <span style={{ background:C.azul,color:C.white,borderRadius:20,padding:"3px 14px",fontSize:12,fontWeight:700 }}>DNIT 2026</span>
          </div>
        </div>

        <div style={{ display:"flex",gap:8,padding:"14px 24px",borderBottom:`1px solid ${C.grayLight}`,overflowX:"auto" }}>
          <TabBtn id="scanner" label="📸 Escanear Factura" />
          <TabBtn id="libro" label={`📚 Libro C/V (${facturas.length})`} />
          <TabBtn id="form120" label="📋 Formulario 120" />
        </div>

        <div style={{ padding:"20px 24px",maxWidth:960,margin:"0 auto" }}>

          {tab === "scanner" && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              {!editando && <>
                <div style={card()}>
                  <div onClick={() => fileRef.current.click()} style={{ border:`2px dashed ${C.azul2}`,borderRadius:14,padding:"44px 24px",textAlign:"center",cursor:"pointer" }}>
                    <div style={{ fontSize:52,marginBottom:12 }}>📸</div>
                    <div style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Subí tu factura aquí</div>
                    <div style={{ color:C.gray,fontSize:14,marginBottom:18 }}>Foto JPG/PNG o PDF — la IA extrae todos los datos automáticamente</div>
                    <button style={{ background:C.azul2,color:C.white,border:"none",borderRadius:10,padding:"12px 28px",fontWeight:700,fontSize:15,cursor:"pointer" }}>Seleccionar archivo</button>
                    <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:"none" }} onChange={onFile} />
                  </div>
                </div>
                <div style={{ ...card(),display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
                  <div>
                    <div style={{ fontWeight:700,marginBottom:4 }}>✏️ Carga manual</div>
                    <div style={{ color:C.gray,fontSize:13 }}>Sin imagen, ingresá los datos directamente</div>
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <select value={tipoManual} onChange={e=>setTipoManual(e.target.value)} style={{ ...inp,width:"auto" }}>
                      <option value="COMPRA">📥 Compra</option>
                      <option value="VENTA">📤 Venta</option>
                    </select>
                    <button onClick={manual} style={{ background:C.verde,color:"#000",border:"none",borderRadius:10,padding:"10px 20px",fontWeight:700,cursor:"pointer" }}>+ Agregar</button>
                  </div>
                </div>
              </>}

              {loading && (
                <div style={card()}>
                  <div style={{ display:"flex",alignItems:"center",gap:12,color:C.verde }}>
                    <div style={{ width:22,height:22,border:`3px solid ${C.grayLight}`,borderTop:`3px solid ${C.verde}`,borderRadius:"50%",animation:"spin 1s linear infinite" }} />
                    <span>Leyendo factura con IA de Claude...</span>
                    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
                  </div>
                </div>
              )}

              {error && <div style={{ background:"#2D0A0A",border:`1px solid ${C.red}`,borderRadius:10,padding:14,color:"#FF8A80",fontSize:14 }}>⚠️ {error}</div>}
              {success && !editando && <div style={{ background:"#0A2D1A",border:`1px solid ${C.verde}`,borderRadius:10,padding:14,color:C.verde,fontSize:14 }}>{success}</div>}

              {editando && (
                <div style={card()}>
                  <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20,flexWrap:"wrap",gap:10 }}>
                    <div style={{ fontWeight:800,fontSize:17 }}>{editando==="nuevo"?"📝 Nueva factura":"✏️ Editar factura"}</div>
                    <div style={{ display:"flex",gap:8 }}>
                      {["COMPRA","VENTA"].map(t => (
                        <button key={t} onClick={() => setForm({...form,tipo:t})} style={{ padding:"6px 16px",borderRadius:8,border:"none",cursor:"pointer", background:form.tipo===t?(t==="COMPRA"?C.azul2:C.verdeDark):C.grayLight, color:C.white,fontWeight:700,fontSize:13 }}>
                          {t==="COMPRA"?"📥 Compra":"📤 Venta"}
                        </button>
                      ))}
                    </div>
                  </div>
                  {preview && <img src={preview} alt="Factura" style={{ maxWidth:"100%",maxHeight:180,borderRadius:10,objectFit:"contain",marginBottom:14,border:`1px solid ${C.grayLight}` }} />}
                  {success && <div style={{ background:"#0A2D1A",border:`1px solid ${C.verde}`,borderRadius:8,padding:10,color:C.verde,fontSize:13,marginBottom:14 }}>{success}</div>}
                  {error && <div style={{ background:"#2D0A0A",border:`1px solid ${C.red}`,borderRadius:8,padding:10,color:"#FF8A80",fontSize:13,marginBottom:14 }}>⚠️ {error}</div>}
                  <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12 }}>
                    {[["fecha","Fecha","DD/MM/YYYY"],["timbrado","Timbrado","12345678"],["numero","N° Factura","001-001-0000001"],["ruc","RUC","80012345-1"],["razonSocial","Razón Social","Nombre empresa"],["descripcion","Descripción","Bien o servicio"]].map(([k,l,ph]) => (
                      <div key={k}>
                        <label style={lbl}>{l}</label>
                        <input placeholder={ph} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} style={inp} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:14,padding:14,background:C.bgLight,borderRadius:10 }}>
                    <div style={{ color:C.verde,fontWeight:700,fontSize:13,marginBottom:10 }}>💰 Montos en Guaraníes (sin puntos)</div>
                    <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10 }}>
                      {[["exento","Exento (Gs)"],["gravado5","Gravado 5%"],["iva5","IVA 5% (auto)"],["gravado10","Gravado 10%"],["iva10","IVA 10% (auto)"],["total","TOTAL (Gs)"]].map(([k,l]) => (
                        <div key={k}>
                          <label style={lbl}>{l}</label>
                          <input type="number" placeholder="0" value={form[k]} onChange={e=>updForm(k,e.target.value)} style={{ ...inp,color:k==="total"?C.verde:C.white,fontWeight:k==="total"?700:400 }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:10,marginTop:16,flexWrap:"wrap" }}>
                    <button onClick={guardar} style={{ flex:1,background:C.verde,color:"#000",border:"none",borderRadius:10,padding:"12px 24px",fontWeight:800,fontSize:15,cursor:"pointer",minWidth:140 }}>✅ Guardar factura</button>
                    <button onClick={()=>{setEditando(null);setForm(initF);setSuccess("");setError("");setPreview(null);}} style={{ background:C.grayLight,color:C.gray,border:"none",borderRadius:10,padding:"12px 20px",fontWeight:700,cursor:"pointer" }}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "libro" && (
            <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
              {facturas.length === 0 ? (
                <div style={{ ...card(),textAlign:"center",padding:48 }}>
                  <div style={{ fontSize:48,marginBottom:12 }}>📚</div>
                  <div style={{ fontWeight:700,fontSize:18,marginBottom:8 }}>Sin facturas aún</div>
                  <div style={{ color:C.gray,fontSize:14,marginBottom:20 }}>Escaneá tu primera factura para empezar</div>
                  <button onClick={()=>setTab("scanner")} style={{ background:C.azul2,color:C.white,border:"none",borderRadius:10,padding:"10px 24px",fontWeight:700,cursor:"pointer" }}>📸 Ir al escáner</button>
                </div>
              ) : <>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:12 }}>
                  {[[`📥 Compras (${compras.length})`,fmt(totC.total),C.azul2],[`📤 Ventas (${ventas.length})`,fmt(totV.total),C.verdeDark],["💰 IVA a Pagar",fmt(salT>0?salT:0),salT>0?C.yellow:C.verde],["💚 Saldo a Favor",fmt(salT<0?Math.abs(salT):0),C.verde]].map(([l,v,col]) => (
                    <div key={l} style={{ ...card(),borderLeft:`4px solid ${col}` }}>
                      <div style={{ color:C.gray,fontSize:12,marginBottom:4 }}>{l}</div>
                      <div style={{ fontWeight:800,fontSize:18,color:col }}>{v}</div>
                    </div>
                  ))}
                </div>

                {/* BOTONES EXPORTAR XLSX PROFESIONAL */}
                <div style={{ ...card(),display:"flex",gap:10,flexWrap:"wrap",alignItems:"center" }}>
                  <div style={{ fontWeight:700,fontSize:14,color:C.verde,marginRight:4 }}>📊 Exportar Excel profesional:</div>
                  <BtnExport onClick={()=>exportarExcel(facturas,"COMPRA","Libro_Compras")} label="Libro Compras" color={C.azul2} />
                  <BtnExport onClick={()=>exportarExcel(facturas,"VENTA","Libro_Ventas")} label="Libro Ventas" color={C.verdeDark} />
                  <BtnExport onClick={()=>exportarExcel(facturas,"TODOS","Libro_CV_Completo")} label="Libro C/V + Form.120" color={C.yellow} />
                </div>

                {compras.length > 0 && (
                  <div style={card()}>
                    <div style={{ fontWeight:800,fontSize:16,marginBottom:14,color:C.azul2 }}>📥 Libro de Compras</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                        <thead><tr style={{ background:C.azul2 }}>
                          {["Fecha","Timbrado","N° Factura","RUC","Razón Social","Exento","Grav.5%","IVA 5%","Grav.10%","IVA 10%","Total",""].map(h=>(
                            <th key={h} style={{ padding:"8px 10px",color:C.white,textAlign:"left",whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {compras.map((f,i) => (
                            <tr key={f.id} style={{ background:i%2===0?C.bgLight:C.bgCard }}>
                              {[f.fecha,f.timbrado,f.numero,f.ruc,f.razonSocial,fmt(n(f.exento)),fmt(n(f.gravado5)),fmt(n(f.iva5)),fmt(n(f.gravado10)),fmt(n(f.iva10)),fmt(n(f.total))].map((v,j)=>(
                                <td key={j} style={{ padding:"7px 10px",color:j>=5?C.verde:C.white,whiteSpace:"nowrap" }}>{v||"—"}</td>
                              ))}
                              <td style={{ padding:"4px 8px",whiteSpace:"nowrap" }}>
                                <button onClick={()=>editar(f)} style={{ background:C.azul2,border:"none",borderRadius:6,padding:"3px 8px",color:C.white,cursor:"pointer",marginRight:4 }}>✏️</button>
                                <button onClick={()=>eliminar(f.id)} style={{ background:C.red,border:"none",borderRadius:6,padding:"3px 8px",color:C.white,cursor:"pointer" }}>🗑️</button>
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background:C.azul,fontWeight:700 }}>
                            <td colSpan={5} style={{ padding:"8px 10px",color:C.white }}>TOTAL COMPRAS</td>
                            {[totC.exento,totC.gravado5,totC.iva5,totC.gravado10,totC.iva10,totC.total].map((v,i)=>(
                              <td key={i} style={{ padding:"8px 10px",color:C.white,whiteSpace:"nowrap" }}>{fmt(v)}</td>
                            ))}
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {ventas.length > 0 && (
                  <div style={card()}>
                    <div style={{ fontWeight:800,fontSize:16,marginBottom:14,color:C.verde }}>📤 Libro de Ventas</div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%",borderCollapse:"collapse",fontSize:12 }}>
                        <thead><tr style={{ background:C.verdeDark }}>
                          {["Fecha","Timbrado","N° Factura","RUC","Razón Social","Exento","Grav.5%","IVA 5%","Grav.10%","IVA 10%","Total",""].map(h=>(
                            <th key={h} style={{ padding:"8px 10px",color:C.white,textAlign:"left",whiteSpace:"nowrap" }}>{h}</th>
                          ))}
                        </tr></thead>
                        <tbody>
                          {ventas.map((f,i) => (
                            <tr key={f.id} style={{ background:i%2===0?C.bgLight:C.bgCard }}>
                              {[f.fecha,f.timbrado,f.numero,f.ruc,f.razonSocial,fmt(n(f.exento)),fmt(n(f.gravado5)),fmt(n(f.iva5)),fmt(n(f.gravado10)),fmt(n(f.iva10)),fmt(n(f.total))].map((v,j)=>(
                                <td key={j} style={{ padding:"7px 10px",color:j>=5?C.verde:C.white,whiteSpace:"nowrap" }}>{v||"—"}</td>
                              ))}
                              <td style={{ padding:"4px 8px",whiteSpace:"nowrap" }}>
                                <button onClick={()=>editar(f)} style={{ background:C.verdeDark,border:"none",borderRadius:6,padding:"3px 8px",color:C.white,cursor:"pointer",marginRight:4 }}>✏️</button>
                                <button onClick={()=>eliminar(f.id)} style={{ background:C.red,border:"none",borderRadius:6,padding:"3px 8px",color:C.white,cursor:"pointer" }}>🗑️</button>
                              </td>
                            </tr>
                          ))}
                          <tr style={{ background:C.verdeDark,fontWeight:700 }}>
                            <td colSpan={5} style={{ padding:"8px 10px",color:C.white }}>TOTAL VENTAS</td>
                            {[totV.exento,totV.gravado5,totV.iva5,totV.gravado10,totV.iva10,totV.total].map((v,i)=>(
                              <td key={i} style={{ padding:"8px 10px",color:C.white,whiteSpace:"nowrap" }}>{fmt(v)}</td>
                            ))}
                            <td />
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>}
            </div>
          )}

          {tab === "form120" && (
            <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
              <div style={card()}>
                <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:20 }}>
                  <div>
                    <div style={{ fontWeight:800,fontSize:18,marginBottom:4 }}>📋 Resumen Formulario 120 — DNIT Paraguay</div>
                    <div style={{ color:C.gray,fontSize:13 }}>Normativa: RG N° 90/2021 | Formulario 120 V4</div>
                  </div>
                  <BtnExport onClick={()=>exportarExcel(facturas,"FORM120","Formulario120")} label="Exportar Form. 120 Excel" color={C.azul2} />
                </div>

                <div style={{ display:"grid",gridTemplateColumns:"50px 1fr 160px 160px 160px",gap:8,padding:"6px 12px",marginBottom:4 }}>
                  {["","","IVA 5%","IVA 10%","TOTAL"].map((h,i)=>(
                    <div key={i} style={{ textAlign:i>1?"right":"left",color:C.gray,fontSize:11,fontWeight:700 }}>{h}</div>
                  ))}
                </div>

                {[
                  { header:true, label:"I. DÉBITO FISCAL (VENTAS)", color:C.azul2 },
                  { cod:"101", label:"IVA ventas tasa 5%", v5:totV.iva5, v10:0 },
                  { cod:"102", label:"IVA ventas tasa 10%", v5:0, v10:totV.iva10 },
                  { sub:true, label:"Subtotal Débito Fiscal", v5:totV.iva5, v10:totV.iva10 },
                  { header:true, label:"II. CRÉDITO FISCAL (COMPRAS)", color:C.verdeDark },
                  { cod:"201", label:"IVA compras tasa 5%", v5:totC.iva5, v10:0 },
                  { cod:"202", label:"IVA compras tasa 10%", v5:0, v10:totC.iva10 },
                  { sub:true, label:"Subtotal Crédito Fiscal", v5:totC.iva5, v10:totC.iva10 },
                  { header:true, label:"III. SALDO DEL PERÍODO", color:C.yellow },
                  { cod:"301", label:"Saldo IVA a pagar", v5:sal5>0?sal5:0, v10:sal10>0?sal10:0 },
                  { cod:"302", label:"Saldo a favor", v5:sal5<0?Math.abs(sal5):0, v10:sal10<0?Math.abs(sal10):0 },
                ].map((row,i) => {
                  if (row.header) return (
                    <div key={i} style={{ background:row.color,borderRadius:8,padding:"10px 14px",fontWeight:800,fontSize:13,color:C.white,marginBottom:4,marginTop:i>0?10:0 }}>{row.label}</div>
                  );
                  const tot = (row.v5||0)+(row.v10||0);
                  return (
                    <div key={i} style={{ display:"grid",gridTemplateColumns:"50px 1fr 160px 160px 160px",gap:8,alignItems:"center",padding:"8px 12px",background:row.sub?C.bgLight:"transparent",borderRadius:row.sub?8:0,marginBottom:4,borderBottom:`1px solid ${C.grayLight}` }}>
                      <span style={{ color:C.azul2,fontWeight:700,fontSize:12 }}>{row.cod||""}</span>
                      <span style={{ fontSize:13,fontWeight:row.sub?700:400 }}>{row.label}</span>
                      <span style={{ textAlign:"right",fontSize:13,color:C.verde }}>{fmt(row.v5||0)}</span>
                      <span style={{ textAlign:"right",fontSize:13,color:C.verde }}>{fmt(row.v10||0)}</span>
                      <span style={{ textAlign:"right",fontSize:13,fontWeight:700,color:row.sub?C.yellow:C.white }}>{fmt(tot)}</span>
                    </div>
                  );
                })}

                <div style={{ background:salT>0?"#2D1A00":"#0A2D1A",border:`2px solid ${salT>0?C.yellow:C.verde}`,borderRadius:12,padding:18,marginTop:16,display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:10 }}>
                  <div>
                    <div style={{ fontWeight:800,fontSize:16 }}>{salT>0?"⚠️ IVA A PAGAR AL FISCO":"✅ SALDO A FAVOR"}</div>
                    <div style={{ color:C.gray,fontSize:12 }}>Imputar en el Sistema Marangatu</div>
                  </div>
                  <div style={{ fontWeight:900,fontSize:26,color:salT>0?C.yellow:C.verde }}>{fmt(Math.abs(salT))}</div>
                </div>

                <div style={{ marginTop:14,padding:12,background:C.bgLight,borderRadius:8,color:C.gray,fontSize:11,lineHeight:1.8 }}>
                  ⚠️ Verificá siempre los datos antes de imputar en el Marangatu.<br/>
                  📌 Base imponible: precio con IVA / 1.05 (5%) o / 1.10 (10%)<br/>
                  ✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
