const ranking = JSON.parse(sessionStorage.getItem("multi_results") || "[]");
const ol = document.getElementById("rankingList");
ranking.forEach(row => {
  const li = document.createElement("li");
  li.textContent = `${row.name} — ${row.score} pts`;
  ol.appendChild(li);
});

document.getElementById("backLobby").addEventListener("click", () => {
  const code = sessionStorage.getItem("multi_lobbyCode");
  if (code) window.location.href = "multi-lobby.html";
});
document.getElementById("homeBtn").addEventListener("click", () => location.href = "home.html");
