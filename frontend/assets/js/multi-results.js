const socket = io();

document.addEventListener("DOMContentLoaded", () => {
  const yearSpan = document.getElementById("year");
  if (yearSpan) yearSpan.textContent = new Date().getFullYear();

  const top3List = document.getElementById("top3List");
  const fullScoresList = document.getElementById("fullScoresList");
  const backBtn = document.getElementById("backBtn");

  const lobbyCode = localStorage.getItem("multi_lobbyCode") || "XXXXXX";

  // Recevoir le classement final depuis le serveur
  socket.emit("getFinalScores", { code: lobbyCode });

  socket.on("finalScores", (players) => {
    // Tri décroissant par score
    players.sort((a, b) => b.score - a.score);

    // Top 3
    top3List.innerHTML = "";
    players.slice(0, 3).forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.username} : ${p.score}`;
      top3List.appendChild(li);
    });

    // Classement complet
    fullScoresList.innerHTML = "";
    players.forEach(p => {
      const li = document.createElement("li");
      li.textContent = `${p.username} : ${p.score}`;
      fullScoresList.appendChild(li);
    });
  });

  backBtn.addEventListener("click", () => {
    window.location.href = "multi.html";
  });
});
