# 🦙 Guida Installazione Ollama - NovAI

## Cos'è Ollama?
Ollama è un software che permette di eseguire modelli AI direttamente sul tuo computer, **gratuitamente** e **senza internet** dopo il download iniziale!

## Requisiti Minimi
- **Windows 10/11**, macOS, o Linux
- **8GB RAM** minimo (16GB consigliati)
- **Spazio disco**: ~1.3GB per il modello gemma:2b (ultra leggero)



---

## Installazione Passo Passo

### 1. Scarica Ollama
Vai su: **https://ollama.com** e clicca "Download"

### 2. Installa Ollama
- Esegui il file scaricato
- Segui la procedura di installazione
- Al termine, Ollama si avvierà automaticamente

### 3. Scarica il Modello AI
Apri il terminale (cmd su Windows) ed esegui:

```bash
ollama pull gemma:2b
```

Questo scarica il modello gemma:2b (~1.3GB). Attendi il completamento.



### 4. Avvia Ollama
Sempre nel terminale, esegui:

```bash
ollama run gemma:2b
```



Vedrai un prompt `>>>` - Ollama è pronto!

### 5. Avvia il Server NovAI
In un NUOVO terminale (lascia aperto quello di Ollama):

```bash
cd c:/Users/User/Desktop/ChatBot/backend
npm start
```

### 6. Apri l'App
Vai su: **http://localhost:8080**

---

## Verifica Funzionamento

Nella chat di NovAI dovresti vedere:
- 🟢 **"🦙 AI Locale Attiva"** - Tutto funziona!
- 🟠 **"🦙 Modello non trovato"** - Esegui `ollama pull gemma:2b`
- 🔴 **"🦙 Ollama Offline"** - Avvia Ollama con `ollama run gemma:2b`



---

## Comandi Utili Ollama

| Comando | Descrizione |
|---------|-------------|
| `ollama list` | Mostra modelli installati |
| `ollama pull gemma:2b` | Scarica modello |
| `ollama run gemma:2b` | Avvia modello |
| `ollama rm gemma:2b` | Rimuove modello |

| `ollama --version` | Versione Ollama |


---

## Modelli Alternativi (Opzionale)

Se gemma:2b è troppo pesante, prova modelli più leggeri:

```bash
# Phi-3 Mini (più leggero)
ollama pull phi3:mini

# Phi-3 (versione base)
ollama pull phi3
```

Poi modifica il file `backend/server.js`:
```javascript
const OLLAMA_MODEL = "phi3:mini"; // o "phi3"
```



---

## Risoluzione Problemi

### ❌ "Ollama non è connesso"
- Verifica che Ollama sia avviato: `ollama run gemma:2b`
- Controlla che la porta 11434 sia libera

### ❌ Errore "model not found"
- Scarica il modello: `ollama pull gemma:2b`



### ❌ Risposte lente
- Il primo avvio è più lento (caricamento in memoria)
- I modelli successivi saranno più veloci
- Considera un modello più leggero se necessario

---

## Vantaggi di Ollama

✅ **Gratuito** - Nessun costo, nessuna API key  
✅ **Privacy** - I dati restano sul tuo PC  
✅ **Offline** - Funziona senza internet  
✅ **Veloce** - Nessuna latenza di rete  
✅ **Personalizzabile** - Scegli il modello che preferisci  

---

## Hai Bisogno di Aiuto?

1. Controlla che Ollama sia in esecuzione: http://localhost:11434
2. Verifica i log del server: guarda il terminale dove hai avviato `npm start`
3. Riavvia entrambi: chiudi e riavvia Ollama, poi il server NovAI

**Buona chat con la tua AI locale! 🦙✨**
