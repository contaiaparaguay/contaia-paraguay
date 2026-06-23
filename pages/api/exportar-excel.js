import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { facturas, tipo } = req.body;
  const tmpDir = os.tmpdir();
  const outFile = path.join(tmpDir, `contaia_${Date.now()}.xlsx`);
  const dataFile = path.join(tmpDir, `data_${Date.now()}.json`);

  try {
    fs.writeFileSync(dataFile, JSON.stringify({ facturas, tipo }));

    const script = `
import json, sys, os
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

with open(r"${dataFile}") as f:
    data = json.load(f)

facturas = data["facturas"]
tipo = data["tipo"]

AZUL_OSC  = "1A5276"
AZUL      = "2E86C1"
VERDE_OSC = "1A8A5A"
VERDE_CL  = "D5F5E7"
AZUL_CL   = "D6EAF8"
BLANCO    = "FFFFFF"
AMARILLO  = "FFF9C4"
GRIS      = "F2F3F4"
ROJO_CL   = "FDEDEC"

def borde():
    s = Side(style="thin", color="AAAAAA")
    return Border(left=s, right=s, top=s, bottom=s)

def fill(c): return PatternFill("solid", fgColor=c)
def center(): return Alignment(horizontal="center", vertical="center", wrap_text=True)
def left(): return Alignment(horizontal="left", vertical="center", wrap_text=True)
def right(): return Alignment(horizontal="right", vertical="center")

def n(v):
    try: return float(v) or 0
    except: return 0

def fmt(v): return round(n(v))

def crear_hoja_facturas(wb, lista, titulo, sheet_name, color_header):
    ws = wb.create_sheet(sheet_name)
    ws.sheet_view.showGridLines = False

    cols = [
        ("A","N°",5),("B","FECHA",13),("C","TIMBRADO",13),("D","N° FACTURA",18),
        ("E","RUC",15),("F","RAZÓN SOCIAL",28),("G","DESCRIPCIÓN",22),
        ("H","EXENTO (Gs)",14),("I","GRAVADO 5%",14),("J","IVA 5%",12),
        ("K","GRAVADO 10%",14),("L","IVA 10%",12),("M","TOTAL (Gs)",16)
    ]
    for col, _, w in cols:
        ws.column_dimensions[col].width = w

    # Título
    ws.merge_cells("A1:M1")
    c = ws["A1"]
    c.value = titulo + " | ContaIA Paraguay | Normativa DNIT 2026"
    c.font = Font(name="Arial", size=13, bold=True, color=BLANCO)
    c.fill = fill(AZUL_OSC); c.alignment = center()
    ws.row_dimensions[1].height = 28

    # Headers
    for col, h, _ in cols:
        c = ws[f"{col}2"]
        c.value = h
        c.font = Font(name="Arial", size=9, bold=True, color=BLANCO)
        c.fill = fill(color_header)
        c.alignment = center(); c.border = borde()
    ws.row_dimensions[2].height = 30

    # Datos
    totales = {"exento":0,"gravado5":0,"iva5":0,"gravado10":0,"iva10":0,"total":0}
    for i, f in enumerate(lista):
        row = i + 3
        bg = AZUL_CL if color_header == AZUL else VERDE_CL if i%2==0 else BLANCO
        bg = AZUL_CL if i%2==0 and color_header==AZUL else (VERDE_CL if i%2==0 else BLANCO)

        ws[f"A{row}"].value = i+1
        ws[f"B{row}"].value = f.get("fecha","")
        ws[f"C{row}"].value = f.get("timbrado","")
        ws[f"D{row}"].value = f.get("numero","")
        ws[f"E{row}"].value = f.get("ruc","")
        ws[f"F{row}"].value = f.get("razonSocial","")
        ws[f"G{row}"].value = f.get("descripcion","")
        ws[f"H{row}"].value = fmt(f.get("exento",0))
        ws[f"I{row}"].value = fmt(f.get("gravado5",0))
        ws[f"J{row}"].value = fmt(f.get("iva5",0))
        ws[f"K{row}"].value = fmt(f.get("gravado10",0))
        ws[f"L{row}"].value = fmt(f.get("iva10",0))
        ws[f"M{row}"].value = fmt(f.get("total",0))

        for col in ["A","B","C","D","E","F","G"]:
            ws[f"{col}{row}"].fill = fill(bg)
            ws[f"{col}{row}"].font = Font(name="Arial", size=9)
            ws[f"{col}{row}"].alignment = left()
            ws[f"{col}{row}"].border = borde()

        for col in ["H","I","J","K","L","M"]:
            ws[f"{col}{row}"].fill = fill(bg)
            ws[f"{col}{row}"].font = Font(name="Arial", size=9)
            ws[f"{col}{row}"].alignment = right()
            ws[f"{col}{row}"].border = borde()
            ws[f"{col}{row}"].number_format = "#,##0"

        ws.row_dimensions[row].height = 18
        totales["exento"] += n(f.get("exento",0))
        totales["gravado5"] += n(f.get("gravado5",0))
        totales["iva5"] += n(f.get("iva5",0))
        totales["gravado10"] += n(f.get("gravado10",0))
        totales["iva10"] += n(f.get("iva10",0))
        totales["total"] += n(f.get("total",0))

    # Fila total
    tot_row = len(lista) + 3
    ws.merge_cells(f"A{tot_row}:G{tot_row}")
    ws[f"A{tot_row}"].value = "TOTAL DEL PERÍODO"
    ws[f"A{tot_row}"].font = Font(name="Arial", size=10, bold=True, color=BLANCO)
    ws[f"A{tot_row}"].fill = fill(color_header)
    ws[f"A{tot_row}"].alignment = center()

    for col, key in [("H","exento"),("I","gravado5"),("J","iva5"),("K","gravado10"),("L","iva10"),("M","total")]:
        c = ws[f"{col}{tot_row}"]
        c.value = round(totales[key])
        c.font = Font(name="Arial", size=10, bold=True, color=BLANCO)
        c.fill = fill(color_header)
        c.alignment = right()
        c.border = borde()
        c.number_format = "#,##0"
    ws.row_dimensions[tot_row].height = 22

    # Pie
    pie_row = tot_row + 2
    ws.merge_cells(f"A{pie_row}:M{pie_row}")
    c = ws[f"A{pie_row}"]
    c.value = "✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py"
    c.font = Font(name="Arial", size=9, bold=True, color=BLANCO)
    c.fill = fill(AZUL_OSC); c.alignment = center()

    ws.freeze_panes = "B3"
    return ws

def crear_libro_cv(wb, facturas):
    ws = wb.create_sheet("📚 LIBRO C-V")
    ws.sheet_view.showGridLines = False
    for col, w in [("A",35),("B",18),("C",18),("D",18),("E",18),("F",18),("G",18)]:
        ws.column_dimensions[col].width = w

    compras = [f for f in facturas if f.get("tipo") == "COMPRA"]
    ventas  = [f for f in facturas if f.get("tipo") == "VENTA"]

    def tot(lista):
        return {k: sum(n(f.get(k,0)) for f in lista)
                for k in ["exento","gravado5","iva5","gravado10","iva10","total"]}

    totC = tot(compras); totV = tot(ventas)

    ws.merge_cells("A1:G1")
    c = ws["A1"]
    c.value = "📚 LIBRO COMPRA / VENTA CONSOLIDADO — ContaIA Paraguay | Normativa DNIT 2026"
    c.font = Font(name="Arial", size=13, bold=True, color=BLANCO)
    c.fill = fill(AZUL_OSC); c.alignment = center()
    ws.row_dimensions[1].height = 28

    for col, h in [("A","CONCEPTO"),("B","EXENTO (Gs)"),("C","GRAVADO 5%"),("D","IVA 5%"),
                   ("E","GRAVADO 10%"),("F","IVA 10%"),("G","TOTAL (Gs)")]:
        c = ws[f"{col}2"]
        c.value = h; c.font = Font(name="Arial", size=10, bold=True, color=BLANCO)
        c.fill = fill(AZUL); c.alignment = center(); c.border = borde()
    ws.row_dimensions[2].height = 28

    rows = [
        (3,"TOTAL COMPRAS",totC["exento"],totC["gravado5"],totC["iva5"],totC["gravado10"],totC["iva10"],totC["total"],AZUL_CL,"000000"),
        (4,"TOTAL VENTAS",totV["exento"],totV["gravado5"],totV["iva5"],totV["gravado10"],totV["iva10"],totV["total"],VERDE_CL,"000000"),
        (5,"IVA VENTAS (DÉBITO FISCAL)","","",totV["iva5"],"",totV["iva10"],totV["iva5"]+totV["iva10"],AMARILLO,"000000"),
        (6,"IVA COMPRAS (CRÉDITO FISCAL)","","",totC["iva5"],"",totC["iva10"],totC["iva5"]+totC["iva10"],AMARILLO,"000000"),
        (7,"✅ SALDO IVA (DÉBITO - CRÉDITO)","","",totV["iva5"]-totC["iva5"],"",totV["iva10"]-totC["iva10"],(totV["iva5"]+totV["iva10"])-(totC["iva5"]+totC["iva10"]),VERDE_CL,"000000"),
    ]

    for row, concepto, ex, gr5, iv5, gr10, iv10, tot_v, bg, fg in rows:
        ws[f"A{row}"].value = concepto
        ws[f"A{row}"].font = Font(name="Arial", size=10, bold=True, color=fg)
        ws[f"A{row}"].fill = fill(bg); ws[f"A{row}"].alignment = left(); ws[f"A{row}"].border = borde()
        for col, v in [("B",ex),("C",gr5),("D",iv5),("E",gr10),("F",iv10),("G",tot_v)]:
            c = ws[f"{col}{row}"]
            c.value = round(v) if isinstance(v, float) else v
            c.font = Font(name="Arial", size=10, bold=True, color=fg)
            c.fill = fill(bg); c.alignment = right(); c.border = borde()
            c.number_format = "#,##0"
        ws.row_dimensions[row].height = 22

    ws.merge_cells("A9:G9")
    c = ws["A9"]
    c.value = "✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py"
    c.font = Font(name="Arial", size=9, bold=True, color=BLANCO)
    c.fill = fill(AZUL_OSC); c.alignment = center()
    return ws

def crear_form120(wb, facturas):
    ws = wb.create_sheet("📋 FORM. 120")
    ws.sheet_view.showGridLines = False
    for col, w in [("A",8),("B",40),("C",20),("D",20),("E",20)]:
        ws.column_dimensions[col].width = w

    compras = [f for f in facturas if f.get("tipo") == "COMPRA"]
    ventas  = [f for f in facturas if f.get("tipo") == "VENTA"]
    totC_iva5  = sum(n(f.get("iva5",0)) for f in compras)
    totC_iva10 = sum(n(f.get("iva10",0)) for f in compras)
    totV_iva5  = sum(n(f.get("iva5",0)) for f in ventas)
    totV_iva10 = sum(n(f.get("iva10",0)) for f in ventas)
    sal5  = totV_iva5  - totC_iva5
    sal10 = totV_iva10 - totC_iva10
    salT  = sal5 + sal10

    ws.merge_cells("A1:E1")
    c = ws["A1"]
    c.value = "📋 FORMULARIO 120 — IVA | DNIT Paraguay | ContaIA Paraguay"
    c.font = Font(name="Arial", size=13, bold=True, color=BLANCO)
    c.fill = fill(AZUL_OSC); c.alignment = center()
    ws.row_dimensions[1].height = 28

    ws.merge_cells("A2:E2")
    c = ws["A2"]
    c.value = "Normativa: RG N° 90/2021 | Formulario 120 V4 | IVA"
    c.font = Font(name="Arial", size=9, italic=True, color="555555")
    c.alignment = center()

    for col, h in [("A","COD."),("B","CONCEPTO"),("C","IVA 5% (Gs)"),("D","IVA 10% (Gs)"),("E","TOTAL IVA (Gs)")]:
        c = ws[f"{col}3"]
        c.value = h; c.font = Font(name="Arial", size=10, bold=True, color=BLANCO)
        c.fill = fill(AZUL); c.alignment = center(); c.border = borde()
    ws.row_dimensions[3].height = 28

    secciones = [
        (4,"","I. DÉBITO FISCAL (VENTAS)","","",AZUL,"FFFFFF",True),
        (5,"101","IVA ventas tasa 5%",round(totV_iva5),0,AZUL_CL,"000000",False),
        (6,"102","IVA ventas tasa 10%",0,round(totV_iva10),AZUL_CL,"000000",False),
        (7,"","Subtotal Débito Fiscal",round(totV_iva5),round(totV_iva10),GRIS,"000000",True),
        (8,"","II. CRÉDITO FISCAL (COMPRAS)","","",VERDE_OSC,"FFFFFF",True),
        (9,"201","IVA compras tasa 5%",round(totC_iva5),0,VERDE_CL,"000000",False),
        (10,"202","IVA compras tasa 10%",0,round(totC_iva10),VERDE_CL,"000000",False),
        (11,"","Subtotal Crédito Fiscal",round(totC_iva5),round(totC_iva10),GRIS,"000000",True),
        (12,"","III. SALDO DEL PERÍODO","","","F39C12","000000",True),
        (13,"301","Saldo IVA a pagar",round(sal5 if sal5>0 else 0),round(sal10 if sal10>0 else 0),AMARILLO,"000000",False),
        (14,"302","Saldo a favor contribuyente",round(abs(sal5) if sal5<0 else 0),round(abs(sal10) if sal10<0 else 0),VERDE_CL,"000000",False),
        (15,"","✅ TOTAL IVA A PAGAR AL FISCO","","",AZUL_OSC,"FFFFFF",True),
    ]

    for row, cod, concepto, v5, v10, bg, fg, bold in secciones:
        ws[f"A{row}"].value = cod
        ws[f"A{row}"].font = Font(name="Arial", size=9, bold=bold, color=fg)
        ws[f"A{row}"].fill = fill(bg); ws[f"A{row}"].alignment = center(); ws[f"A{row}"].border = borde()
        ws[f"B{row}"].value = concepto
        ws[f"B{row}"].font = Font(name="Arial", size=10, bold=bold, color=fg)
        ws[f"B{row}"].fill = fill(bg); ws[f"B{row}"].alignment = left(); ws[f"B{row}"].border = borde()
        for col, v in [("C",v5),("D",v10)]:
            c = ws[f"{col}{row}"]
            c.value = v if isinstance(v,(int,float)) else ""
            c.font = Font(name="Arial", size=10, bold=bold, color=fg)
            c.fill = fill(bg); c.alignment = right(); c.border = borde()
            if isinstance(v,(int,float)): c.number_format = "#,##0"
        tot = (v5 if isinstance(v5,(int,float)) else 0) + (v10 if isinstance(v10,(int,float)) else 0)
        if row == 15: tot = round(salT if salT > 0 else 0)
        c = ws[f"E{row}"]
        c.value = tot if isinstance(tot,(int,float)) else ""
        c.font = Font(name="Arial", size=10, bold=bold, color=fg)
        c.fill = fill(bg); c.alignment = right(); c.border = borde()
        if isinstance(tot,(int,float)): c.number_format = "#,##0"
        ws.row_dimensions[row].height = 22

    ws.merge_cells("A17:E17")
    c = ws["A17"]
    c.value = "✅ Normativa DNIT 2026 | RG N° 90/2021 | Formulario 120 V4 | www.dnit.gov.py"
    c.font = Font(name="Arial", size=9, bold=True, color=BLANCO)
    c.fill = fill(AZUL_OSC); c.alignment = center()

    ws.freeze_panes = "A4"
    return ws

# Crear workbook
wb = Workbook()
wb.remove(wb.active)

compras = [f for f in facturas if f.get("tipo") == "COMPRA"]
ventas  = [f for f in facturas if f.get("tipo") == "VENTA"]

if tipo in ["COMPRA","TODOS"] and compras:
    crear_hoja_facturas(wb, compras, "📥 LIBRO DE COMPRAS", "📥 COMPRAS", AZUL)
if tipo in ["VENTA","TODOS"] and ventas:
    crear_hoja_facturas(wb, ventas,  "📤 LIBRO DE VENTAS",  "📤 VENTAS", VERDE_OSC)
if tipo == "TODOS":
    crear_libro_cv(wb, facturas)
    crear_form120(wb, facturas)
if tipo == "FORM120":
    crear_form120(wb, facturas)

wb.save(r"${outFile}")
print("OK")
`;

    execSync(`python3 -c "${script.replace(/"/g, '\\"').replace(/\n/g, "\\n")}"`, { timeout: 30000 });

    const fileBuffer = fs.readFileSync(outFile);
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="ContaIA_Paraguay.xlsx"`);
    res.send(fileBuffer);

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generando el Excel: " + error.message });
  } finally {
    try { fs.unlinkSync(dataFile); } catch {}
    try { fs.unlinkSync(outFile); } catch {}
  }
}
