document.addEventListener("DOMContentLoaded", () => {
  const startBtn = document.getElementById("startBtn");
  const errorMsg = document.getElementById("errorMsg");

  startBtn.addEventListener("click", () => {
    const checkboxes = document.querySelectorAll("input[name='mediaType']:checked");
    const mediaTypes = Array.from(checkboxes).map(cb => cb.value);

    if (mediaTypes.length === 0) {
      errorMsg.textContent = "Veuillez sélectionner au moins une catégorie de médias.";
      return;
    }

    const roundCount = document.getElementById("roundCount").value;

    // on stocke tout ça
    localStorage.setItem("solo_mediaTypes", JSON.stringify(mediaTypes));
    localStorage.setItem("solo_roundCount", roundCount);

    // et c'est parti !
    window.location.href = "solo-game.html";
  });
});
