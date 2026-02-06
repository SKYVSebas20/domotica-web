//Dependencias necesarias para el servidor
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

//Crear la aplicación Express
const app = express();
app.use(express.json());

//CORS para Live Server (127.0.0.1:5500)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:5500");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Preflight
  if (req.method === "OPTIONS") return res.sendStatus(204);

  next();
});

//Puerto y ruta del archivo de logs
const PORT = 3001;
const LOG_PATH = path.join(__dirname, "logs", "eventos.json");

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/eventos", async (req, res) => {
  const raw = await fs.readFile(LOG_PATH, "utf8");
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  const eventos = JSON.parse(cleaned);
  res.json(eventos);
});

// 👇 NUEVO: Endpoint para obtener el último estado de un dispositivo
app.get("/api/eventos/:deviceId/ultimo", async (req, res) => {
  try {
    const { deviceId } = req.params;
    
    const raw = await fs.readFile(LOG_PATH, "utf8");
    const cleaned = raw.replace(/^\uFEFF/, "").trim();
    const eventos = JSON.parse(cleaned);

    // Filtrar eventos del dispositivo y tipo "power"
    const eventosFiltrados = eventos.filter(
      e => e.deviceId === deviceId && e.tipo === "power"
    );

    if (eventosFiltrados.length === 0) {
      // Si no hay eventos previos, devolver "off" por defecto
      return res.json({ valor: "off", encontrado: false });
    }

    // Obtener el último evento (el más reciente)
    const ultimoEvento = eventosFiltrados[eventosFiltrados.length - 1];
    
    res.json({ 
      valor: ultimoEvento.valor,
      ts: ultimoEvento.ts,
      encontrado: true 
    });

  } catch (error) {
    console.error("Error al obtener último evento:", error);
    res.status(500).json({ error: "Error al leer eventos" });
  }
});

app.post("/api/eventos", async (req, res) => {
  const { deviceId, tipo, valor, fuente } = req.body ?? {};

  if (!tipo || typeof tipo !== "string") {
    return res.status(400).json({ ok: false, error: "Campo 'tipo' requerido (string)." });
  }
  if (valor === undefined) {
    return res.status(400).json({ ok: false, error: "Campo 'valor' requerido." });
  }

  const raw = await fs.readFile(LOG_PATH, "utf8");
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  const eventos = JSON.parse(cleaned);

  const evento = {
    id: Math.random().toString(16).slice(2) + Date.now().toString(16),
    ts: new Date().toISOString(),
    deviceId: deviceId ?? "unknown",
    tipo,
    valor,
    fuente: fuente ?? "api"
  };

  eventos.push(evento);
  await fs.writeFile(LOG_PATH, JSON.stringify(eventos, null, 2), "utf8");

  res.status(201).json({ ok: true, evento });
});

app.listen(PORT, () => {
  console.log(`Backend OK en http://localhost:${PORT}`);
});