// Server Express per gestione utenti con Ollama AI Locale
const path = require("path");

// Carica variabili d'ambiente da .env (dopo aver importato path)
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const fs = require("fs");

const bcrypt = require("bcrypt");
const session = require("express-session");
const { v4: uuidv4 } = require("uuid");
const axios = require("axios");

const app = express();
// Port configuration: use env variable, or default to 8080
const DEFAULT_PORT = 8080;
const PORT = process.env.PORT || DEFAULT_PORT;


const USERS_FILE = path.join(__dirname, "users.json");
const CHATS_FILE = path.join(__dirname, "chats.json");

// Configurazione Ollama AI Locale
// Imposta Ollama per ascoltare su tutte le interfacce [Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0", "User")
//Verifica che sia stato impostato [Environment]::GetEnvironmentVariable("OLLAMA_HOST", "User")
// Per accesso da rete/VPN, imposta OLLAMA_HOST=0.0.0.0 su Windows e usa l'IP del server qui
// Esempio: OLLAMA_URL=http://192.168.1.100:11434 (sostituisci con il tuo IP nella rete VPN)
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
//const OLLAMA_URL = process.env.OLLAMA_URL || "http://172.20.10.2:11434";

//const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "gemma:2b";
//const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "phi3:mini";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3.2";
// NOTA PER VPN: Se vuoi che colleghi da altri PC, modifica OLLAMA_URL con il tuo IP di rete
// Esempio: const OLLAMA_URL = "http://192.168.1.100:11434";




// Debug: verifica configurazione Ollama
console.log("🦙 Configurazione Ollama:");
console.log("   URL:", OLLAMA_URL);
console.log("   Modello:", OLLAMA_MODEL);

// Sessioni di conversazione in memoria (per contesto AI)
const conversations = {}; // { username: [ { role: "user"/"assistant", content: "..." }, ... ] }


// Configurazione sessione
app.use(session({
  secret: "novai_super_secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 1000 * 60 * 60 // 1 ora
  }
}));

// Sicurezza: crea users.json se non esiste
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, "[]");
}

// Crea chats.json se non esiste
if (!fs.existsSync(CHATS_FILE)) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify({}));
}

// Funzioni di utilità per le chat
function readChats() {
  return JSON.parse(fs.readFileSync(CHATS_FILE, "utf8"));
}

function saveChats(chats) {
  fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2));
}


// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "../frontend"), {
  index: "index.html",
  extensions: ["html"],
  redirect: false
}));

// PROTEZIONE CHAT
app.get("/chat.html", (req, res) => {
  if (!req.session.user) {
    return res.redirect("/index.html");
  }

  res.sendFile(path.join(__dirname, "../frontend/chat.html"));
});

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

// LOGIN
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

    // SALVA SESSIONE
    req.session.user = { username: user.username, nickname: user.nickname };

    // RITORNA username e nickname
    res.json({
      message: "Login OK",
      username: user.username,
      nickname: user.nickname
    });

  } catch (e) {
    console.error("Errore login:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// Funzione per verificare se Ollama è pronto
async function checkOllamaReady() {
  try {
    // Verifica prima se Ollama è in esecuzione
    const tagsResponse = await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 5000
    });
    
    const models = tagsResponse.data.models || [];
    const modelExists = models.some(m => m.name.includes(OLLAMA_MODEL));
    
    if (!modelExists) {
      throw new Error(`Modello ${OLLAMA_MODEL} non trovato. Esegui: ollama pull ${OLLAMA_MODEL}`);
    }
    
    return true;
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      throw new Error("Ollama non è in esecuzione. Assicurati di aver avviato Ollama.");
    }
    throw error;
  }
}

// Funzione per chiamare Ollama AI Locale
async function callOllamaAI(message, conversationHistory) {
  try {
    // Prima verifica che Ollama sia pronto
    await checkOllamaReady();

    // Costruisci il prompt con contesto conversazionale
    // Data e ora attuali per permettere all'AI di rispondere correttamente a domande temporali
    const now = new Date();
    const dateStr = now.toLocaleDateString("it-IT", { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString("it-IT");
    // Prompt di sistema per guidare il comportamento dell'AI
    let prompt = `Sei NovAI, un assistente virtuale amichevole e utile. Rispondi in italiano in modo naturale e conversazionale. Sii conciso ma completo nelle risposte.\n\nDATA E ORA ATTUALI: Oggi è ${dateStr}, ore ${timeStr}. Usa questa informazione quando ti viene chiesto che giorno è, che ore sono, o riferimenti temporali.\n\n`;

    // Aggiungi storico conversazione per contesto
    if (conversationHistory && conversationHistory.length > 0) {
      const recentMessages = conversationHistory.slice(-10);
      for (const msg of recentMessages) {
        const role = msg.role === "assistant" ? "Assistente" : "Utente";
        prompt += `${role}: ${msg.content}\n`;
      }
    }
    
    prompt += `Utente: ${message}\nAssistente:`;

    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 300 // Ultra ridotto per massima velocità
        }
      },
      {
        headers: {
          "Content-Type": "application/json"
        },
        timeout: 120000 // 2 minuti timeout per PC più lenti
      }

    );

    if (response.data && response.data.response) {
      return response.data.response.trim();
    } else {
      throw new Error("Risposta Ollama non valida");
    }
  } catch (error) {
    console.error("Errore Ollama:", error.message);
    if (error.code === 'ECONNREFUSED') {
      throw new Error("Ollama non è in esecuzione. Assicurati di aver avviato Ollama con: ollama run " + OLLAMA_MODEL);
    }
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error("Ollama sta impiegando troppo tempo. Il modello potrebbe essere troppo pesante o non caricato correttamente. Prova a riavviare Ollama.");
    }
    throw error;
  }
}

// Funzione principale per generare risposta AI (solo Ollama, nessun fallback)
async function generateAIResponse(message, username) {
  const conversationHistory = conversations[username] || [];
  const aiResponse = await callOllamaAI(message, conversationHistory);
  return aiResponse;
}

// Endpoint per verificare stato Ollama
app.get("/ai-status", async (req, res) => {
  try {
    // Verifica connessione a Ollama con timeout breve
    const response = await axios.get(`${OLLAMA_URL}/api/tags`, {
      timeout: 3000
    });
    
    const models = response.data.models || [];
    const modelAvailable = models.some(m => m.name.includes(OLLAMA_MODEL));
    
    res.json({
      status: "online",
      ollamaRunning: true,
      model: OLLAMA_MODEL,
      modelAvailable: modelAvailable,
      availableModels: models.map(m => m.name)
    });
  } catch (error) {
    // Log dettagliato dell'errore per debug
    console.log("Ollama status check failed:", error.message);
    console.log("   Error code:", error.code);
    
    let errorMessage = "Ollama non è in esecuzione";
    let statusCode = 503;
    
    // Gestione specifica dei diversi tipi di errore
    if (error.code === 'ECONNREFUSED') {
      errorMessage = "Ollama non è in esecuzione - Connessione rifiutata";
    } else if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      errorMessage = "Ollama non risponde - Timeout";
    } else if (error.code === 'ENOTFOUND' || error.code === 'EHOSTUNREACH') {
      errorMessage = "Ollama non trovato - Verifica l'URL configurato";
    } else if (error.response) {
      // Ollama ha risposto con un errore HTTP
      statusCode = error.response.status;
      errorMessage = `Ollama ha risposto con errore: ${error.response.status}`;
    }
    
    // Assicurati che la risposta venga sempre inviata
    res.status(statusCode).json({
      status: "offline",
      ollamaRunning: false,
      model: OLLAMA_MODEL,
      error: errorMessage,
      errorCode: error.code || 'UNKNOWN',
      installGuide: "1. Installa Ollama da https://ollama.com\n2. Esegui: ollama pull " + OLLAMA_MODEL + "\n3. Esegui: ollama run " + OLLAMA_MODEL
    });
  }
});


// CHAT con AI Ollama Locale
app.post("/chat", async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const { message } = req.body;
    const username = req.session.user.username;
    
    if (!message || !message.trim()) {
      return res.status(400).json({ message: "Messaggio vuoto" });
    }

    // Inizializza conversazione utente se non esiste
    if (!conversations[username]) {
      conversations[username] = [];
    }

    // Aggiungi messaggio utente alla conversazione
    conversations[username].push({ role: "user", content: message, timestamp: new Date().toISOString() });

    // Genera risposta AI (asincrona)
    const reply = await generateAIResponse(message, username);

    // Aggiungi risposta AI alla conversazione
    conversations[username].push({ role: "assistant", content: reply, timestamp: new Date().toISOString() });

    // Mantieni solo gli ultimi 20 messaggi per contesto
    if (conversations[username].length > 20) {
      conversations[username] = conversations[username].slice(-20);
    }

    res.json({ reply, timestamp: new Date().toISOString() });
  } catch (e) {
    console.error("Errore chat:", e);
    res.status(500).json({ 
      message: "Errore AI: " + (e.message || "Errore sconosciuto"),
      error: e.message
    });
  }
});

// GET CONVERSATION - recupera la conversazione attuale in memoria
app.get("/conversation", (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const username = req.session.user.username;
    const conversation = conversations[username] || [];
    
    res.json({ conversation });
  } catch (e) {
    console.error("Errore recupero conversazione:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// SALVA CHAT nel database
app.post("/save-chat", (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const { title, messages } = req.body;
    const username = req.session.user.username;

    if (!title || !messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Dati mancanti" });
    }

    const chats = readChats();
    
    if (!chats[username]) {
      chats[username] = [];
    }

    const newChat = {
      id: uuidv4(),
      title: title.slice(0, 100), // Limita lunghezza titolo
      messages: messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    chats[username].unshift(newChat); // Aggiungi in cima
    saveChats(chats);

    res.json({ message: "Chat salvata", chat: newChat });
  } catch (e) {
    console.error("Errore salvataggio chat:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// GET TUTTE LE CHAT di un utente
app.get("/chats", (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const username = req.session.user.username;
    const chats = readChats();
    const userChats = chats[username] || [];

    // Ritorna solo metadati, non i messaggi completi per performance
    const chatsList = userChats.map(chat => ({
      id: chat.id,
      title: chat.title,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length
    }));

    res.json({ chats: chatsList });
  } catch (e) {
    console.error("Errore recupero chat:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// GET CHAT SPECIFICA
app.get("/chat/:id", (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const username = req.session.user.username;
    const chatId = req.params.id;
    const chats = readChats();
    const userChats = chats[username] || [];

    const chat = userChats.find(c => c.id === chatId);
    
    if (!chat) {
      return res.status(404).json({ message: "Chat non trovata" });
    }

    res.json({ chat });
  } catch (e) {
    console.error("Errore recupero chat:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// DELETE CHAT
app.delete("/chat/:id", (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const username = req.session.user.username;
    const chatId = req.params.id;
    const chats = readChats();

    if (!chats[username]) {
      return res.status(404).json({ message: "Nessuna chat trovata" });
    }

    const initialLength = chats[username].length;
    chats[username] = chats[username].filter(c => c.id !== chatId);

    if (chats[username].length === initialLength) {
      return res.status(404).json({ message: "Chat non trovata" });
    }

    saveChats(chats);
    res.json({ message: "Chat eliminata" });
  } catch (e) {
    console.error("Errore eliminazione chat:", e);
    res.status(500).json({ message: "Errore server" });
  }
});

// RINOMINA CHAT
app.put("/chat/:id", (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ message: "Non autorizzato" });
    }

    const username = req.session.user.username;
    const chatId = req.params.id;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ message: "Titolo mancante" });
    }

    const chats = readChats();
    
    if (!chats[username]) {
      return res.status(404).json({ message: "Nessuna chat trovata" });
    }

    const chat = chats[username].find(c => c.id === chatId);
    
    if (!chat) {
      return res.status(404).json({ message: "Chat non trovata" });
    }

    chat.title = title.slice(0, 100);
    chat.updatedAt = new Date().toISOString();
    
    saveChats(chats);
    res.json({ message: "Chat rinominata", chat });
  } catch (e) {
    console.error("Errore rinomina chat:", e);
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
  const user = users.find(u => u.username === username && u.nickname === nickname);
  if (!user) return res.status(401).json({ message: "Utente non trovato" });

  const samePassword = await bcrypt.compare(newPassword, user.password);
  if (samePassword) return res.status(400).json({ message: "La nuova password non può essere uguale alla precedente" });

  user.password = await bcrypt.hash(newPassword, 10);
  saveUsers(users);

  res.json({ message: "Password aggiornata con successo" });
});

// CHECK AUTH
app.get("/check-auth", (req, res) => {
  if (req.session.user) {
    res.json({ logged: true });
  } else {
    res.status(401).json({ logged: false });
  }
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Errore logout:", err);
      return res.status(500).json({ message: "Errore logout" });
    }

    res.clearCookie("connect.sid");
    res.json({ message: "Logout effettuato" });
  });
});


// Gestione errori non catturati
process.on("uncaughtException", (err) => {
  console.error("Errore non catturato:", err);
  console.error(err.stack);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Promise rifiutata non gestita:", reason);
});

// Avvio server solo sulla porta 8080
function startServer(port) {
  console.log("Avvio server sulla porta:", port);

  const server = app.listen(port, () => {
    console.log(`Server attivo e in ascolto su http://0.0.0.0:${port}`);
    console.log("Ollama AI: Assicurati di aver avviato Ollama!");
    console.log("Premi CTRL+C per fermare il server");
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Errore: La porta ${port} è già in uso. Chiudi l'altra applicazione e riprova.`);
      process.exit(1);
    } else {
      console.error("Errore server:", err.message);
      process.exit(1);
    }
  });
}

// Forza l'uso della porta 8080
startServer(8080);


// Mantieni il processo attivo
process.stdin.resume();

//comenadi per avviare Ollama AI Locale (da terminale):
//1. Installa Ollama da https://ollama.com
//2. Esegui: ollama pull llama3.2 (o il modello che preferisci)
//3. Esegui: ollama run llama3.2 (o il modello che hai scelto)
//in caso processi occupano la porta 8080 -> taskkill /F /IM node.exe; node server.js
