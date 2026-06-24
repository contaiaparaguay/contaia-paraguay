export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { ruc } = req.query;
  if (!ruc) return res.status(400).json({ error: "RUC requerido" });

  const rucLimpio = ruc.replace(/\D/g, "").trim();

  // Intentar múltiples fuentes
  const fuentes = [
    // TuRuc — búsqueda por número exacto
    `https://turuc.com.py/api/contribuyente/${rucLimpio}`,
    // TuRuc — búsqueda general (fallback)
    `https://turuc.com.py/api/contribuyente/search?q=${rucLimpio}`,
    // Siscotic — alternativa
    `https://ruc.siscotic.com.py/api/contribuyente/${rucLimpio}`,
  ];

  for (const url of fuentes) {
    try {
      const resp = await fetch(url, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "ContaIA-Paraguay/2.0",
          "Origin": "https://ubiquitous-horse-15d3a9.netlify.app",
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) continue;

      const data = await resp.json();

      // Puede ser objeto directo o array (search endpoint devuelve array)
      const item = Array.isArray(data) ? data[0] : data;
      if (!item) continue;

      // Intentar distintos campos de nombre según la fuente
      const nombre = item.razonSocial || item.nombreFantasia || item.nombre ||
                     item.razon_social || item.name || item.denominacion || "";

      if (!nombre) continue;

      return res.status(200).json({
        ruc: item.ruc || rucLimpio,
        nombre: nombre.toUpperCase().trim(),
        estado: item.estado || item.status || "ACTIVO",
        fuente: url.includes("siscotic") ? "siscotic" : "turuc",
      });

    } catch (e) {
      // Seguir con la siguiente fuente
      continue;
    }
  }

  // Si ninguna fuente respondió
  return res.status(404).json({
    error: "No se encontró el contribuyente. Ingresá el nombre manualmente.",
    ruc: rucLimpio,
  });
}
