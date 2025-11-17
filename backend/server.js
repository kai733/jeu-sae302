import express from "express";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Serve les fichiers frontend ===
app.use(express.static(path.join(__dirname, "..", "frontend")));

// === Serve les médias ===
app.use("/media", express.static(path.join(__dirname, "..", "media")));

app.use(express.json());

// === Ouvre la base SQLite ===
const db = await open({
  filename: path.join(__dirname, "db.sqlite"), // DB is in the backend folder
  driver: sqlite3.Database
});

// === API pour le jeu solo ===
app.get("/api/solo-media", async (req, res) => {
  const { type, limit } = req.query;

  if (!type) return res.status(400).json({ error: "Missing type" });

  try {
    const rows = await db.all(
      "SELECT * FROM media WHERE type = ? ORDER BY RANDOM() LIMIT ?",
      [type, limit || 10]
    );

    const result = rows.map(m => ({
      id: m.id,
      isAI: Boolean(m.isAI),
      src: "/" + m.path // ex: "/media/person1.jpg"
    }));

    res.json(result);
  } catch (err) {
    console.error("Erreur BDD:", err);
    res.status(500).json({ error: "Erreur serveur" });
  }
});

// === Redirection par défaut vers home.html ===
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "frontend", "home.html"));
});

// === Lancement du serveur ===
app.listen(PORT, () => {
  console.log(`Serveur lancé sur http://localhost:${PORT}`);
});
