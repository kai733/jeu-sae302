document.getElementById("createBtn").addEventListener("click", () => {
    // ask pseudo then go to lobby creation page
    const name = prompt("Entrez votre pseudo (temporaire) :");
    if (!name) return alert("Pseudo requis");
    sessionStorage.setItem("multi_name", name);
    // mark as creator
    sessionStorage.setItem("multi_isCreator", "1");
    window.location.href = "multi-lobby.html?action=create";
});

document.getElementById("joinBtn").addEventListener("click", () => {
    const name = prompt("Entrez votre pseudo (temporaire) :");
    if (!name) return alert("Pseudo requis");
    sessionStorage.setItem("multi_name", name);
    sessionStorage.setItem("multi_isCreator", "0");
    window.location.href = "multi-lobby.html?action=join";
});
