document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const lobbyCode = localStorage.getItem("multi_lobbyCode") || "XXXXXX";
  const username = localStorage.getItem("multi_username") || "Joueur";
  const isCreator = localStorage.getItem("multi_isCreator") === "true";

  document.getElementById("lobbyCode").textContent = lobbyCode;
  document.getElementById("usernameDisplay").textContent = username;

  const playersList = document.getElementById("playersList");

  // TEMPORAIRE : simulateur de joueurs dans le lobby
  const players = [username];
  updatePlayersList();

  function updatePlayersList() {
    playersList.innerHTML = "";
    players.forEach(player => {
      const li = document.createElement("li");
      li.textContent = player;
      playersList.appendChild(li);
    });
  }

  // Gestion des paramètres : seulement le créateur peut modifier
  const inputs = document.querySelectorAll(".settings-box input, .settings-box select");
  if (!isCreator) {
    inputs.forEach(input => input.disabled = true);
  }

  // Bouton commencer la partie
  document.getElementById("startGameBtn").addEventListener("click", () => {
    if (!isCreator) {
      alert("Seul le créateur peut lancer la partie !");
      return;
    }

    // Stocker les paramètres choisis
    localStorage.setItem("multi_roundCount", document.getElementById("roundCount").value);
    localStorage.setItem("multi_timePerRound", document.getElementById("timePerRound").value);
    localStorage.setItem("multi_mediaCategory", document.getElementById("mediaCategory").value);

    // Redirection vers la page du jeu multijoueur (à créer)
    window.location.href = "multi-game.html";
  });
});