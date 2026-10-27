const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Your existing Baileys logic goes here
// Keep your current /code route - just replace response
app.get('/code', async (req, res) => {
    const number = req.query.number;
    if (!number) return res.json({ error: "Number required" });
    
    try {
        // TODO: PASTE YOUR BAILEYS PAIR CODE LOGIC HERE
        // Example:
        // const code = await yourBotFunction(number);
        // return res.json({ code });
        
        // For now demo code:
        const demoCode = Math.floor(10000000 + Math.random() * 90000000).toString().slice(0,8);
        const formatted = `${demoCode.slice(0,4)}-${demoCode.slice(4)}`;
        return res.json({ code: formatted });
        
    } catch (e) {
        console.log(e);
        return res.json({ error: "Failed to get code" });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🥶 FREEZER-MD running on ${PORT}`));
