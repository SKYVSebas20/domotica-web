//Seleccionamos los elementos
const checkbox = document.getElementById('checkbox');
const estadoTexto = document.getElementById('status-texto');

//Función para actualizar el estado en la UI
function setEstadoUI(estado, mensajeCustom = null) {
  estadoTexto.classList.remove("ok", "error", "loading");

  switch (estado) {
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
      estadoTexto.textContent = mensajeCustom || "Error de red";
      estadoTexto.classList.add("error");
      checkbox.disabled = false;
      break;

    default:
      console.warn("Estado UI desconocido:", estado);
  }
}

// Función helper para fetch con timeout
async function fetchConTimeout(url, options, timeoutMs = 5000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// Evento: Al mover el interruptor
checkbox.addEventListener("change", async () => {
  const nuevoValor = checkbox.checked ? "on" : "off";
  const estadoAnterior = !checkbox.checked;

  setEstadoUI("loading");

  try {
    const resp = await fetchConTimeout("http://localhost:3001/api/eventos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId: "luz",
        tipo: "power",
        valor: nuevoValor,
        fuente: "web"
      })
    });

    if (!resp.ok) {
      const errorData = await resp.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${resp.status}`);
    }

    // 👇 IMPORTANTE: Ver qué responde el backend
    const respuesta = await resp.json();
    console.log("Respuesta del backend:", respuesta);

    // Actualizar UI con el valor que ENVIAMOS (no dependemos de la respuesta)
    setEstadoUI(nuevoValor);

  } catch (e) {
    console.error("Fallo en POST /api/eventos:", e);
    
    checkbox.checked = estadoAnterior;
    
    const msg = e.name === 'AbortError' ? 'Timeout: sin respuesta' : 
                (e.message || 'Error desconocido');
    setEstadoUI("error", msg);
  }
});

// Obtener estado inicial al cargar
async function cargarEstadoInicial() {
  setEstadoUI("loading");
  
  try {
    const resp = await fetchConTimeout("http://localhost:3001/api/eventos/luz/ultimo");
    
    if (resp.ok) {
      const data = await resp.json();
      console.log("Estado inicial del backend:", data);
      setEstadoUI(data.valor);
    } else {
      console.warn("Backend no devolvió estado inicial, usando OFF por defecto");
      setEstadoUI("off");
    }
  } catch (e) {
    console.warn("No se pudo cargar estado inicial:", e);
    setEstadoUI("off");
  }
}

// Ejecutar SOLO al cargar la página
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarEstadoInicial);
} else {
  cargarEstadoInicial();
}