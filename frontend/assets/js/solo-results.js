document.addEventListener("DOMContentLoaded", () => {
  const score = localStorage.getItem("solo_finalScore") || 0;
  const total = localStorage.getItem("solo_totalRounds") || 0;

  document.getElementById("scoreValue").textContent = score;
  document.getElementById("totalValue").textContent = total;
});
