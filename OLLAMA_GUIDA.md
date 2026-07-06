# NovAI — Guida rapida (leggere prima di tutto)

Questa è l'unica guida da seguire per avviare il progetto.

## Cosa serve prima di iniziare (una tantum, solo la prima volta)

1. **Node.js** (versione LTS) — https://nodejs.org
2. **Ollama** (il motore di IA locale) — https://ollama.com
   - Scaricalo, installalo, avvialo. Su Windows e macOS parte già in background da solo dopo l'installazione.
3. Aprire un terminale (o Prompt dei comandi) e digitare:
   ```
   ollama pull llama3.2
   ```
   Questo scarica il modello AI usato dal progetto (~2 GB, richiede qualche minuto). **Importante:** deve essere esattamente `llama3.2`, perché è il modello impostato di default dentro `backend/server.js`. Se un domani si vuole cambiare modello, va cambiato in entrambi i posti (qui e nel codice).

## Come avviare il progetto (ogni volta)

1. Assicurarsi che Ollama sia in esecuzione (icona nella barra di sistema, oppure lanciare `ollama serve` da terminale).
2. Aprire un terminale dentro la cartella `backend`.
3. (Solo se manca la cartella `node_modules`/da errori, di norma è già inclusa nello zip) eseguire:
   ```
   npm install
   ```
4. Avviare il server:
   ```
   npm start
   ```
5. Aprire il browser su:
   ```
   http://localhost:8080
   ```

ATTENZIONE: **Non aprire mai `frontend/index.html` con doppio click, e non usare `python -m http.server`.** Il login, la registrazione e la chat funzionano solo passando dal server Node su `http://localhost:8080`: sono l'unico punto d'accesso che gestisce le relative funzionalità.

## Come si chiude tutto

1. Nella finestra dove gira `npm start`, premere `CTRL + C`.
2. Se avviato, chiudere anche la finestra/terminale di `ollama serve`.

## Risoluzione problemi

| Problema | Causa probabile | Soluzione |
|---|---|---|
| "Ollama non è in esecuzione" nella chat | Ollama non è stato avviato | Avviare Ollama (o lo script automatico lo fa da solo) |
| "Modello non trovato" | `llama3.2` non è stato scaricato | `ollama pull llama3.2` |
| Login/registrazione non rispondono | È stato aperto `index.html` col doppio click, o si è usato un server diverso da quello Node | Avviare sempre tramite `npm start` e usare `http://localhost:8080` |
| "La porta 8080 è già in uso" | Un'altra istanza del server è già attiva | Chiudere l'altra finestra/processo, oppure riavviare il PC |
| `npm start` dà errori su moduli mancanti | `node_modules` danneggiata o incompleta | Eseguire `npm install` dentro `backend` |

---
Buona chat con NovAI! 🦙