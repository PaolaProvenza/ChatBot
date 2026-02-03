const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

app.post("/chat", (req, res) => {
    const msg = req.body.message.toLowerCase();
    let reply = "Non ho capito 😕";

    if (msg.includes("ciao")) reply = "Ciao! 😊";
    else if (msg.includes("come stai")) reply = "Sto benissimo!";
    else if (msg.includes("chi sei")) reply = "Sono SayHi 🤖";

    res.json({ reply });
});

app.listen(PORT, () => {
    console.log(`Server attivo su http://localhost:${PORT}`);
});
