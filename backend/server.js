// Server Express per gestione utenti con file JSON
const express = require("express");
// per leggere e scrivere file JSON
const fs = require("fs");
// per criptare password
const bcrypt = require("bcrypt");
// creazione di Express
const app = express();
//porta su cui girerà il server
const PORT = 3000;
//percorso del file che contiene gli utenti
const USERS_FILE = "./users.json";
const path = require("path");

// sicurezza -> creazione users.json se non esiste
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}
//
app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

// funzione per leggere utenti
function readUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
}

// funzione per salvare utenti
function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}
// SIGN UP
app.post("/signup", async (req, res) => {
    const { username, email, password } = req.body;
    if(!username || !email || !password) return res.status(401).json({ message: "Tutti i campi sono obbligatori" });
    const users = readUsers();
    // controllo se esiste già un utente con stesso username o email
    const exists = users.find(u => u.username === username || u.email === email);
    if (exists) return res.status(401).json({ message: "Utente già esistente" });
  
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({ username, email, password: hashedPassword });
    saveUsers(users);
  
    res.json({ message: "Registrazione completata" });
  });
  
  // LOGIN
  app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    if(!username || !password) return res.status(401).json({ message: "Tutti i campi sono obbligatori" });
    const users = readUsers();
    // cerco l'utente per username
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ message: "Credenziali errate" });
    // confronto password
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Credenziali errate" });
    
    
    res.json({ message: "Login OK" });
  });
  
  app.listen(PORT, () => {
    console.log(`Server attivo su http://localhost:${PORT}`);
  });