//Dependencias necesarias para el servidor
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

//Crear la aplicación Express
const app = express();
app.use(express.json());

//Puerto y ruta del archivo de logs
const PORT = 3001;
const LOG_PATH = path.join(__dirname, "logs", "eventos.json");

app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/eventos", async (req, res) => {
  const raw = await fs.readFile(LOG_PATH, "utf8");
  const cleaned = raw.replace(/^\uFEFF/, "").trim(); // quita BOM y espacios/saltos
  const eventos = JSON.parse(cleaned);
  res.json(eventos);
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
