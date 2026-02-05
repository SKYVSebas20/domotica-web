//Seleccionamos los elementos
const checkbox = document.getElementById('checkbox');
const estadoTexto = document.getElementById('status-texto');

//Función para actualizar el estado en la UI
function setEstadoUI(estado) {
    //Reset común: quitamos clases anteriores para no amontonarlas
  estadoTexto.classList.remove("ok", "error", "loading");

  //Switch por estado
  switch (estado) {
    case "OFF":
      estadoTexto.textContent = "APAGADO";
      checkbox.disabled = false; // Permitimos usarlo
      break;

    case "ON":
      estadoTexto.textContent = "ENCENDIDO";
      estadoTexto.classList.add("ok");
      checkbox.disabled = false;
      break;

    case "loading":
      estadoTexto.textContent = "Comunicando...";
      estadoTexto.classList.add("loading");
      checkbox.disabled = true; // Bloqueamos para evitar doble click
      break;

    case "error":
      estadoTexto.textContent = "Error de red";
      estadoTexto.classList.add("error");
      checkbox.disabled = false;
      break;

    default:
      console.warn("Estado UI desconocido:", estado);
  }
}

// Evento: Al mover el interruptor
checkbox.onchange = () => {
    if (checkbox.checked) {
        setEstadoUI("ON");
    } else {
        setEstadoUI("OFF");
    }
};



