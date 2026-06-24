export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { ruc } = req.query;
  if (!ruc) return res.status(400).json({ error: "RUC requerido" });

  try {
    // Intentar con turuc.com.py
    const resp = await fetch(`https://turuc.com.py/api/contribuyente/${ruc}`, {
      headers: { "Accept": "application/json", "User-Agent": "ContaIA-Paraguay/2.0" },
      signal: AbortSignal.timeout(5000),
    });

    if (resp.ok) {
      const data = await resp.json();
      return res.status(200).json({
        ruc: data.ruc || ruc,
        nombre: data.razonSocial || data.nombreFantasia || data.nombre || "",
        estado: data.estado || "DESCONOCIDO",
        fuente: "turuc"
      });
    }

    // Intentar con ruc.siscotic.com.py como alternativa
    const resp2 = await fetch(`https://ruc.siscotic.com.py/api/contribuyente/${ruc}`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (resp2.ok) {
      const data2 = await resp2.json();
      return res.status(200).json({
        ruc: data2.ruc || ruc,
        nombre: data2.razonSocial || data2.nombre || "",
        estado: data2.estado || "DESCONOCIDO",
        fuente: "siscotic"
      });
    }

    return res.status(404).json({ error: "RUC no encontrado" });

  } catch (error) {
    return res.status(500).json({ error: "Error consultando RUC: " + error.message });
  }
}
