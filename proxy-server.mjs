import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const PORT = 3001;
const TARGET_HOST = 'web-api.tp.entsoe.eu';

const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    try { fs.appendFileSync('proxy_server.log', line); } catch (e) { }
};

// Initialize Gemini
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    log("⚠️ WARNING: GEMINI_API_KEY is not set in environment variables!");
} else {
    log(`✅ GEMINI_API_KEY found (starts with ${apiKey.substring(0, 4)}...)`);
}

const genAI = new GoogleGenerativeAI(apiKey || '');
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// --- Global Cache & Local Bot Logic ---
const responseCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

const funnyOffTopicReplies = [
    "Szzzt! Mitt huvud är fullt av högspänning just nu, jag kan tyvärr bara tänka på elpriser. Fråga om SE3 istället!",
    "Kortslutning! ⚡️ Den frågan drog för mycket ampere för min lilla hjärna. Håll dig till kilowattimmar eller nätområden så blir jag glad.",
    "Jag är en energi-bot, inte ett lexikon! Om det inte går att mäta i Volt, GW eller Euro per MWh så är jag helt nollställd.",
    "Hörde jag 'pannkaksrecept'? Tyvärr, jag drivs av vindkraft, inte socker. Fråga mig om vindkraftsproduktionen istället!",
    "Varning för överbelastning! 🚨 Jag kan bara svara på saker som rör elen i Europa eller hur kartan funkar. Allt annat ger mig bara brus på linjen."
];

function getLocalResponse(message, context) {
    const msg = message.toLowerCase();

    // 1. Check for off-topic (very simple heuristic)
    const energyKeywords = ['el', 'pris', 'mwh', 'watt', 'kvot', 'produktion', 'karta', 'zon', 'se1', 'se2', 'se3', 'se4', 'land', 'billigast', 'dyrast', 'vind', 'sol', 'kärnkraft', 'last', 'förbrukning', 'energi', 'kraft', 'europa', 'hjälp'];
    const isEnergyRelated = energyKeywords.some(k => msg.includes(k));

    // If it's a very short message or not energy related, give a funny reply
    if (!isEnergyRelated && msg.length > 3) {
        return funnyOffTopicReplies[Math.floor(Math.random() * funnyOffTopicReplies.length)];
    }

    // 2. Handle simple data questions locally (Save Quota!)
    if (context && Array.isArray(context) && context.length > 0) {
        if (msg.includes('billigast') || msg.includes('lägst pris')) {
            const cheapest = [...context].sort((a, b) => parseFloat(a.p) - parseFloat(b.p))[0];
            return `Jag ser i mina ledningar att **${cheapest.id}** leder ligan med lägst pris just nu: **${cheapest.p} €/MWh**. Ganska fyndigt! 📉`;
        }
        if (msg.includes('dyrast') || msg.includes('högst pris')) {
            const expensive = [...context].sort((a, b) => parseFloat(b.p) - parseFloat(a.p))[0];
            return `Ouch! **${expensive.id}** har rejält med spänning i priset just nu: **${expensive.p} €/MWh**. Plånboken gråter... 📈`;
        }
    }

    if (msg.includes('vem är du') || msg.includes('vacker')) {
        return "Jag är din personliga energi-assistent! Jag har frukost-energi nog att hålla koll på hela Europas elnät åt dig. Vad vill du veta om elen?";
    }

    return null; // Fallback to Gemini
}
// --------------------------------------

const server = http.createServer(async (req, res) => {
    log(`Request: ${req.method} ${req.url}`);

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // --- NEW: Chat Endpoint ---
    if (req.url === '/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', async () => {
            try {
                const { message, context } = JSON.parse(body);

                // A. Try Local Response (Free & Fast!)
                const localReply = getLocalResponse(message, context);
                if (localReply) {
                    log(`[Local] Answered: "${message}"`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: localReply }));
                    return;
                }

                // B. Try Cache (Save Quota)
                const cacheKey = `${message.trim().toLowerCase()}_${JSON.stringify(context || [])}`;
                const cached = responseCache.get(cacheKey);
                if (cached && (Date.now() - cached.time < CACHE_TTL)) {
                    log(`[Cache] Answered: "${message}"`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: cached.reply }));
                    return;
                }

                // C. Fallback to Gemini
                log(`[Gemini] Calling for: "${message}"`);
                const prompt = `
                Du är "Energi-Assistenten", skämtsam men expert. 
                Här är live-data: ${JSON.stringify(context)}
                Användaren frågar: "${message}"
                Svara kort och roligt på svenska. Använd fetstil för priser.
                `;

                const result = await model.generateContent(prompt);
                const reply = result.response.text();

                // Store in cache
                responseCache.set(cacheKey, { reply, time: Date.now() });

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ reply }));
            } catch (error) {
                log(`Chat Error: ${error.message}`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }
    // --------------------------

    // Default: Proxy to ENTSO-E
    res.setHeader('Content-Type', 'application/xml; charset=utf-8');

    let query = req.url.split('?')[1] || '';
    const targetUrl = `https://${TARGET_HOST}/api?${query}`;

    log(`Fetching via CURL: ${targetUrl}`);

    try {
        const curl = spawn('curl', ['-s', targetUrl]);

        curl.stdout.pipe(res);

        curl.stderr.on('data', (data) => {
            log(`Curl Error: ${data}`);
        });

        curl.on('close', (code) => {
            log(`Curl exited with code ${code}`);
            if (!res.writableEnded) res.end();
        });
    } catch (e) {
        log(`Spawn Error: ${e.message}`);
        res.writeHead(500);
        res.end(e.message);
    }
});

server.listen(PORT, '127.0.0.1', () => {
    log(`Proxy server listening on http://127.0.0.1:${PORT}`);
});
