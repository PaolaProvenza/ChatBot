// Server Express per gestione utenti con file JSON
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
const PORT = 3000;

const USERS_FILE = path.join(__dirname, "users.json");

// Sicurezza: crea users.json se non esiste
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// Funzioni di utilità
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// ROUTE: SIGNUP
app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });

    const users = readUsers();
    const exists = users.find(u => u.username === username || u.email === email);
    if (exists) return res.status(401).json({ message: "Utente già esistente" });

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hashedPassword });
    saveUsers(users);

    res.json({ message: "Registrazione completata" });
  } catch (e) {
    console.error("Errore signup:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// ROUTE: LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });

    const users = readUsers();
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ message: "Credenziali errate" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Credenziali errate" });

    res.json({ 
        message: "Login OK",
        username: user.username
    });
  } catch (e) {
    console.error("Errore login:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// ROUTE: CHAT
app.post("/chat", (req, res) => {
  try {
    const msg = req.body.message.toLowerCase();
    let reply = "Non ho capito";

    if (msg.includes("ciao")) reply = "Ciao! Come posso aiutarti oggi?";
    else if (msg.includes("come stai")) reply = "Sto benissimo!";
    else if (msg.includes("chi sei")) reply = "Sono NovAI, il tuo assistente virtuale!";

    res.json({ reply });
  } catch (e) {
    console.error("Errore chat:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// ===== CHANGE PASSWORD =====
app.post("/change-password", async (req, res) => {
    const { username, email, newPassword } = req.body;
  
    if (!username || !email || !newPassword) {
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
    }
  
    const users = readUsers();
    const user = users.find(
      u => u.username === username && u.email === email
    );
  
    if (!user) {
      return res.status(401).json({ message: "Utente non trovato" });
    }
    
    // controlla se la nuova password è uguale alla vecchia
    const samePassword = await bcrypt.compare(newPassword, user.password);

    if (samePassword) {
    return res
        .status(400)
        .json({ message: "La nuova password non può essere uguale alla precedente" });
    }

    // se è diversa, aggiorna
    user.password = await bcrypt.hash(newPassword, 10);
    saveUsers(users);

    res.json({ message: "Password aggiornata con successo" });
  });
  
// Avvio server
app.listen(PORT, () => {
  console.log(`Server attivo su http://localhost:${PORT}`);
});
