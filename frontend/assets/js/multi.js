document.getElementById("createBtn").addEventListener("click", () => {
    // on demande le pseudo puis on va à la création
    const name = prompt("Entrez votre pseudo (temporaire) :");
    if (!name) return alert("Pseudo requis");
    sessionStorage.setItem("multi_name", name);
    // on note que c'est le créateur
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
