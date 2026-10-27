const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const pino = require('pino');
const { default: makeWASocket, useMultiFileAuthState, delay, Browsers, makeCacheableSignalKeyStore, DisconnectReason } = require('@whiskeysockets/baileys');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 3000;
const SESSION_BASE = path.join(__dirname, 'session');
if (!fs.existsSync(SESSION_BASE)) fs.mkdirSync(SESSION_BASE, { recursive: true });

// Store active bots
const bots = new Map();

async function startBot(number) {
    const cleanNumber = number.replace(/[^0-9]/g, '');
    const sessionPath = path.join(SESSION_BASE, cleanNumber);
    if (!fs.existsSync(sessionPath)) fs.mkdirSync(sessionPath, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' }))
        },
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        browser: Browsers.macOS("Chrome"),
        markOnlineOnConnect: true
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'open') {
            console.log(`✅ FREEZER-MD CONNECTED: ${cleanNumber}`);
            bots.set(cleanNumber, sock);
        }
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log(`❌ Disconnected ${cleanNumber}, reconnect: ${shouldReconnect}`);
            
            if (shouldReconnect) {
                setTimeout(() => startBot(cleanNumber), 3000);
            } else {
                // Logged out - delete session
                bots.delete(cleanNumber);
                if (fs.existsSync(sessionPath)) {
                    fs.rmSync(sessionPath, { recursive: true, force: true });
                }
            }
        }
    });

    // ===== YOUR BOT COMMANDS HERE =====
    sock.ev.on('messages.upsert', async ({ messages }) => {
        const m = messages[0];
        if (!m.message || m.key.fromMe) return;
        const from = m.key.remoteJid;
        const body = m.message.conversation || m.message.extendedTextMessage?.text || "";

        // Example commands
        if (body === '.ping') {
            await sock.sendMessage(from, { text: '🥶 FREEZER-MD is frozen online!\nPong! ❄️' });
        }
        if (body === '.menu') {
            await sock.sendMessage(from, { text: 
`🥶 *FREEZER-MD MENU* 🥶

⚙️ .ping - Check bot
⚙️ .autofollow on/off
⚙️ .autostatusview on/off
⚙️ .autostatusreact on/off
⚙️ .autobio on/off
⚙️ .autotyping on/off
⚙️ .nonprefix on/off

FREEZER-MD • 4 BOTS ONLINE` });
        }
    });

    return sock;
}

// ===== API: GET PAIRING CODE =====
app.get('/code', async (req, res) => {
    let number = req.query.number;
    if (!number) return res.status(400).json({ error: 'Number required' });
    
    number = number.replace(/[^0-9]/g, '');
    if (number.length < 10) return res.status(400).json({ error: 'Invalid number' });

    try {
        // If bot already exists and connected
        if (bots.has(number)) {
            return res.json({ error: 'Already connected' });
        }

        const sock = await startBot(number);
        
        // Wait for socket to be ready
        await delay(3000);
        
        if (!sock.authState.creds.registered) {
            const code = await sock.requestPairingCode(number);
            console.log(`🔑 Pairing code for ${number}: ${code}`);
            // Format XXXX-XXXX
            const formatted = code.match(/.{1,4}/g)?.join('-') || code;
            return res.json({ code: formatted });
        } else {
            return res.json({ error: 'Already paired, no code needed' });
        }

    } catch (e) {
        console.error('Pair error:', e);
        return res.status(500).json({ error: e.message || 'Failed to get code' });
    }
});

// Serve frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/status', (req, res) => {
    res.json({ 
        status: 'online',
        bots: bots.size,
        bots_list: Array.from(bots.keys()),
        server: 'FREEZER-MD'
    });
});

// Load existing sessions on startup
async function loadSessions() {
    if (!fs.existsSync(SESSION_BASE)) return;
    const folders = fs.readdirSync(SESSION_BASE);
    for (const folder of folders) {
        if (/^\d+$/.test(folder)) {
            console.log(`🧊 Loading session: ${folder}`);
            await startBot(folder);
            await delay(1000);
        }
    }
}

app.listen(PORT, async () => {
    console.log(`🥶 FREEZER-MD running on port ${PORT}`);
    await loadSessions();
});
