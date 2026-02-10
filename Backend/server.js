// Dependencias necesarias para el servidor
const express = require("express");
const fs = require("fs/promises");
const path = require("path");

// Crear la aplicación Express
const app = express();
app.use(express.json());

// CORS para Live Server
const ALLOWED_ORIGINS = new Set([
  "http://127.0.0.1:5500",
  "http://localhost:5500",
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

// Puerto y ruta del archivo de logs
const PORT = 3000;
const LOG_PATH = path.join(__dirname, "logs", "eventos.json");

// ---------- helpers ----------
async function ensureLogFile() {
  const dir = path.dirname(LOG_PATH);
  await fs.mkdir(dir, { recursive: true });
  try {
    await fs.access(LOG_PATH);
  } catch {
    await fs.writeFile(LOG_PATH, "[]", "utf8");
  }
}

async function leerEventos() {
  await ensureLogFile();
  const raw = await fs.readFile(LOG_PATH, "utf8");
  const cleaned = raw.replace(/^\uFEFF/, "").trim();
  if (!cleaned) return [];
  return JSON.parse(cleaned);
}

async function guardarEventos(eventos) {
  await ensureLogFile();
  await fs.writeFile(LOG_PATH, JSON.stringify(eventos, null, 2), "utf8");
}

async function appendPowerEvent(valor) {
  const eventos = await leerEventos();

  const evento = {
    id: Math.random().toString(16).slice(2) + Date.now().toString(16),
    ts: new Date().toISOString(),
    deviceId: "luz",
    tipo: "power",
    valor, // "on" | "off"
    fuente: "web",
  };

  eventos.push(evento);
  await guardarEventos(eventos);
  return evento;
}

// ---------- Día 4 endpoints ----------
app.post("/on", async (req, res) => {
  try {
    const evento = await appendPowerEvent("on");
    res.json({ ok: true, estado: "on", evento });
  } catch (e) {
    console.error("Error en /on:", e);
    res.status(500).json({ ok: false, error: "No se pudo encender" });
  }
});

app.post("/off", async (req, res) => {
  try {
    const evento = await appendPowerEvent("off");
    res.json({ ok: true, estado: "off", evento });
  } catch (e) {
    console.error("Error en /off:", e);
    res.status(500).json({ ok: false, error: "No se pudo apagar" });
  }
});

app.get("/status", async (req, res) => {
  try {
    const eventos = await leerEventos();
    const ult = [...eventos]
      .reverse()
      .find((e) => e.deviceId === "luz" && e.tipo === "power");
    const estado = ult?.valor ?? "off";
    res.json({ ok: true, estado });
  } catch (e) {
    console.error("Error en /status:", e);
    res.status(500).json({ ok: false, estado: "off" });
  }
});

// ---------- tus endpoints API (los dejo, por si los sigues usando) ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.get("/api/eventos", async (req, res) => {
  const eventos = await leerEventos();
  res.json(eventos);
});

app.get("/api/eventos/:deviceId/ultimo", async (req, res) => {
  try {
    const { deviceId } = req.params;
    const eventos = await leerEventos();

    const eventosFiltrados = eventos.filter(
      (e) => e.deviceId === deviceId && e.tipo === "power"
    );

    if (eventosFiltrados.length === 0) {
      return res.json({ valor: "off", encontrado: false });
    }

    const ultimoEvento = eventosFiltrados[eventosFiltrados.length - 1];
    res.json({
      valor: ultimoEvento.valor,
      ts: ultimoEvento.ts,
      encontrado: true,
    });
  } catch (error) {
    console.error("Error al obtener último evento:", error);
    res.status(500).json({ error: "Error al leer eventos" });
  }
});

app.post("/api/eventos", async (req, res) => {
  try {
    const { deviceId, tipo, valor, fuente } = req.body ?? {};

    if (!tipo || typeof tipo !== "string") {
      return res
        .status(400)
        .json({ ok: false, error: "Campo 'tipo' requerido (string)." });
    }
    if (valor === undefined) {
      return res.status(400).json({ ok: false, error: "Campo 'valor' requerido." });
    }

    const eventos = await leerEventos();

    const evento = {
      id: Math.random().toString(16).slice(2) + Date.now().toString(16),
      ts: new Date().toISOString(),
      deviceId: deviceId ?? "unknown",
      tipo,
      valor,
      fuente: fuente ?? "api",
    };

    eventos.push(evento);
    await guardarEventos(eventos);

    res.status(201).json({ ok: true, evento });
  } catch (e) {
    console.error("Error en POST /api/eventos:", e);
    res.status(500).json({ ok: false, error: "Error escribiendo eventos" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend OK en http://localhost:${PORT}`);
});
