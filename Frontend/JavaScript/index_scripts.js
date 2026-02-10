const API = "http://localhost:3000";

// Seleccionamos elementos
const checkbox = document.getElementById("checkbox");
const estadoTexto = document.getElementById("status-texto");

if (!checkbox || !estadoTexto) {
  console.error("UI incompleta: falta #checkbox o #status-texto");
}

// UI state
function setEstadoUI(estado, mensajeCustom = null) {
  if (!checkbox || !estadoTexto) return;

  const estadoValido = String(estado).toLowerCase();
  estadoTexto.classList.remove("ok", "error", "loading");

  switch (estadoValido) {
    case "off":
      estadoTexto.textContent = "APAGADO";
      checkbox.checked = false;
      checkbox.disabled = false;
      break;

    case "on":
      estadoTexto.textContent = "ENCENDIDO";
      estadoTexto.classList.add("ok");
      checkbox.checked = true;
      checkbox.disabled = false;
      break;

    case "loading":
      estadoTexto.textContent = "Comunicando...";
      estadoTexto.classList.add("loading");
      checkbox.disabled = true;
      break;

    case "error":
      estadoTexto.textContent = mensajeCustom || "Backend desconectado";
      estadoTexto.classList.add("error");
      checkbox.disabled = false;
      break;

    default:
      console.warn("Estado UI desconocido:", estado);
  }
}

// fetch con timeout (opcional pero útil)
async function fetchConTimeout(url, options = {}, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return resp;
  } catch (e) {
    clearTimeout(timeout);
    throw e;
  }
}

// Día 4: encender / apagar con try/catch
async function encender() {
  try {
    const resp = await fetchConTimeout(`${API}/on`, { method: "POST" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    setEstadoUI("on");
  } catch (e) {
    console.error("encender() falló:", e);
    setEstadoUI("ERROR", "Backend desconectado");
    throw e;
  }
}

async function apagar() {
  try {
    const resp = await fetchConTimeout(`${API}/off`, { method: "POST" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    setEstadoUI("off");
  } catch (e) {
    console.error("apagar() falló:", e);
    setEstadoUI("ERROR", "Backend desconectado");
    throw e;
  }
}

// Switch → llama encender/apagar
if (checkbox) {
  checkbox.addEventListener("change", async () => {
    const estadoAnterior = !checkbox.checked;

    setEstadoUI("loading");

    try {
      if (checkbox.checked) {
        await encender();
      } else {
        await apagar();
      }
    } catch (e) {
      // revertir switch si falló
      checkbox.checked = estadoAnterior;
    }
  });
}

// Estado inicial desde backend
async function cargarEstadoInicial() {
  setEstadoUI("loading");

  try {
    const resp = await fetchConTimeout(`${API}/status`, { method: "GET" });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

    const data = await resp.json();
    // data.estado debe ser "on" o "off"
    setEstadoUI(data.estado ?? "off");
  } catch (e) {
    console.warn("No se pudo cargar estado inicial:", e);
    // deja el switch en OFF y muestra el error (sin romper la UI)
    if (checkbox) checkbox.checked = false;
    setEstadoUI("ERROR", "Backend desconectado");
  }
}

// Ejecutar al cargar
cargarEstadoInicial();
