// Server Express per gestione utenti con file JSON
const express = require("express");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();
const PORT = 8080;

const USERS_FILE = path.join(__dirname, "users.json");
const session = require("express-session");

app.use(session({
  secret: "novai_super_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true, // più sicuro
    maxAge: 1000 * 60 * 60 // 1 ora
  }
}));

// Sicurezza: crea users.json se non esiste
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
    const { nickname, username, password } = req.body;
    if (!nickname || !username || !password)
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });

    const users = readUsers();
    const exists = users.find(u => u.username === username);
    if (exists) return res.status(401).json({ message: "Username già esistente" });

    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ nickname, username, password: hashedPassword });
    saveUsers(users);

    res.json({ message: "Registrazione completata" });
  } catch (e) {
    console.error("Errore signup:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

  

//LOGIN
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password)
      return res.status(400).json({ message: "Tutti i campi sono obbligatori" });

    const users = readUsers();
    const user = users.find(u => u.username === username);

    if (!user)
      return res.status(401).json({ message: "Credenziali errate" });

    const match = await bcrypt.compare(password, user.password);

    if (!match)
      return res.status(401).json({ message: "Credenziali errate" });

    // SALVA SESSIONE
    req.session.user = { username: user.username, nickname: user.nickname };

    // RITORNA username e nickname
    res.json({
      message: "Login OK",
      username: user.username,
      nickname: user.nickname  // <-- importante
    });

  } catch (e) {
    console.error("Errore login:", e);
    res.status(500).json({ message: "Errore server" });
  }
});


//CHAT
app.post("/chat", (req, res) => {
  try {
    const msg = req.body.message.toLowerCase();
    let reply = "Non ho capito";

    if (msg.includes("ciao") || msg.includes("salve"))
      reply = "Ciao! 😊";
    
    else if (msg.includes("come stai"))
      reply = "Sto benissimo! E tu?";
    
    else if (msg.includes("nome"))
      reply = "Mi chiamo NovAI.";
    
    else if (msg.includes("aiuto"))
      reply = "Posso aiutarti con informazioni, domande o curiosità!";
    
    else if (msg.includes("grazie"))
      reply = "Di nulla! 😊";
    

    res.json({ reply });
  } catch (e) {
    console.error("Errore chat:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// ===== CHANGE PASSWORD =====
app.post("/change-password", async (req, res) => {
  const { username, nickname, newPassword } = req.body;

  if (!username || !nickname || !newPassword) {
    return res.status(400).json({ message: "Tutti i campi sono obbligatori" });
  }

  const users = readUsers();
  const user = users.find(
    u => u.username === username && u.nickname === nickname
  );

  if (!user) {
    return res.status(401).json({ message: "Utente non trovato" });
  }

  // controlla se la nuova password è uguale alla vecchia
  const samePassword = await bcrypt.compare(newPassword, user.password);
  if (samePassword) {
    return res.status(400).json({ message: "La nuova password non può essere uguale alla precedente" });
  }

  // aggiorna la password
  user.password = await bcrypt.hash(newPassword, 10);
  saveUsers(users);

  res.json({ message: "Password aggiornata con successo" });
});


app.get("/chat.html", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/"); // rimanda al login
  }
  res.sendFile(path.join(__dirname, "../frontend/chat.html"));
});

app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    res.json({ logged: true });
  } else {
    res.status(401).json({ logged: false });
  }
});

/*
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ message: "Errore logout" });
    res.clearCookie("connect.sid"); // pulisce il cookie
    res.json({ message: "Logout effettuato" });
  });
});

*/
// Avvio server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server attivo su http://0.0.0.0:${PORT}`);
});

