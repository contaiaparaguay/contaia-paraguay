import JSZip from "jszip";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { facturas, ruc, periodo, secuencia = "V0001" } = req.body;
  const n = (v) => Math.round(parseFloat(v) || 0);

  // Formato nombre archivo según DNIT: RUC_REG_MMAAAA_XXXXX
  const [mes, anio] = periodo.split("/");
  const nombreArchivo = `${ruc}_REG_${mes}${anio}_${secuencia}`;

  // Generar líneas CSV
  const lineas = [];

  facturas.forEach(f => {
    const tipo = f.tipo === "VENTA" ? "1" : "2";
    const timbrado = f.timbrado || "0";
    const numero = f.numero || "";
    const fecha = f.fecha || "";
    const tipoComp = f.tipoComprobante || "109";
    const condicion = f.condicion || "1";

    // Montos IVA INCLUIDO para Marangatu
    const grav10 = n(f.gravado10) + n(f.iva10); // precio con IVA incluido al 10%
    const grav5  = n(f.gravado5)  + n(f.iva5);  // precio con IVA incluido al 5%
    const exento = n(f.exento);
    const total  = grav10 + grav5 + exento;

    const imputaIVA = f.imputaIVA || "S";
    const imputaIRE = f.imputaIRE || "N";
    const imputaIRP = f.imputaIRP || "N";

    // RUC contraparte sin dígito verificador
    const rucContra = (f.rucContraparte || "").replace(/[-.].*/, "").replace(/\D/g, "");
    const tipoId = rucContra ? "11" : "15";
    const nombreContra = tipoId === "11" ? "" : (f.nombreContraparte || "SIN NOMBRE");

    if (f.tipo === "VENTA") {
      // 19 campos ventas
      lineas.push([
        tipo, tipoId, rucContra, nombreContra, tipoComp,
        fecha, timbrado, numero,
        grav10, grav5, exento, total,
        condicion, "N",
        imputaIVA, imputaIRE, imputaIRP,
        "", ""
      ].join(";"));
    } else {
      // 20 campos compras
      lineas.push([
        tipo, tipoId, rucContra, nombreContra, tipoComp,
        fecha, timbrado, numero,
        grav10, grav5, exento, total,
        condicion, "N",
        imputaIVA, imputaIRE, imputaIRP,
        "N", "", ""
      ].join(";"));
    }
  });

  const csvContent = lineas.join("\n");

  // Crear ZIP
  const zip = new JSZip();
  zip.file(`${nombreArchivo}.csv`, "\uFEFF" + csvContent, { binary: false });
  const zipBuffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });

  res.setHeader("Content-Type", "application/zip");
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}.zip"`);
  res.send(zipBuffer);
}
