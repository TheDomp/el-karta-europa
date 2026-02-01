import http from 'http';
import fs from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// --- Zero-Dependency Configuration ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Manual .env parser
function loadEnv() {
    try {
        const envPath = path.resolve(__dirname, '.env');
        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8');
            content.split('\n').forEach(line => {
                const [key, ...values] = line.split('=');
                if (key && values.length > 0) {
                    const val = values.join('=').trim().replace(/^["']|["']$/g, '');
                    process.env[key.trim()] = val;
                }
            });
            console.log("✅ Loaded .env file");
        }
    } catch (e) {
        console.error("⚠️ Failed to load .env:", e);
    }
}
loadEnv();

const PORT = 3001;
const TARGET_HOST = 'web-api.tp.entsoe.eu';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const log = (msg) => {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    console.log(msg);
    try { fs.appendFileSync('proxy_server.log', line); } catch (e) { }
};

if (!GEMINI_API_KEY) {
    log("⚠️ WARNING: GEMINI_API_KEY is not set!");
} else {
    log(`✅ GEMINI_API_KEY found (starts with ${GEMINI_API_KEY.substring(0, 4)}...)`);
}

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

    // 1. ZON-SPECIFIKA FRÅGOR (Regex Matchning)
    // Matchar specifika nordiska zoner (t.ex. SE3, DK1) eller landskoder.
    // VIKTIGT: Vi listar exakta landskoder för att inte matcha ord som "el", "nu", "vi" av misstag.
    const zoneRegex = /\b(SE\d|DK\d|NO\d|FI|IT-[A-Z]+|(SE|DK|NO|FI|DE|NL|BE|AT|PL|CH|CZ|SK|HU|FR|ES|PT|GB|IE|EE|LV|LT|IT|GR|RO|BG|HR|RS|BA|SI|ME|MK|AL))\b/i;
    const match = msg.match(zoneRegex);

    // Om vi hittar en match, men användaren kanske frågade om "billigast" samtidigt, låt den logiken ha företräde
    // om vi inte hittar zonen i datan.
    if (match && context && Array.isArray(context)) {
        const zoneId = match[1].toUpperCase();
        const zoneData = context.find(z => z.id === zoneId);

        if (zoneData) {
            // Prisfrågor
            if (msg.includes('pris') || msg.includes('kosta') || msg.includes('dyrt') || msg.includes('billigt')) {
                return `Elpriset i **${zoneId}** ligger på **${zoneData.p} EUR/MWh** just nu.`;
            }

            // Förbrukning / Last
            if (msg.includes('förbrukning') || msg.includes('last') || msg.includes('konsum') || msg.includes('använd')) {
                return `Just nu förbrukas det **${zoneData.l}** i **${zoneId}**.`;
            }

            // Vindkraft
            if (msg.includes('vind') || msg.includes('blåser')) {
                return zoneData.w
                    ? `Det blåser på bra! Vindkraften genererar **${zoneData.w}** i **${zoneId}** just nu.`
                    : `Jag ser ingen vindkrafts-data för **${zoneId}** precis nu, men det kanske blåser ändå! 🌬️`;
            }

            // Generell status
            let reply = `Läget i **${zoneId}** just nu:\n💰 Pris: **${zoneData.p} EUR/MWh**\n📉 Last: **${zoneData.l}**`;
            if (zoneData.w) reply += `\n💨 Vind: **${zoneData.w}**`;
            return reply;
        }

        // Om zonen inte hittades i datan, fortsätt till nästa steg (Generella frågor) istället för att returnera fel direkt.
        // Detta fixar buggen där "EL" tolkades som zon och blockerade "billigast el".
    }

    // 2. GENERELA SÖKORD (Befintlig logik + lite mer)
    const energyKeywords = ['el', 'pris', 'mwh', 'watt', 'kvot', 'produktion', 'karta', 'zon', 'se1', 'se2', 'se3', 'se4', 'land', 'billigast', 'dyrast', 'vind', 'sol', 'kärnkraft', 'last', 'förbrukning', 'energi', 'kraft', 'europa', 'hjälp'];
    const isEnergyRelated = energyKeywords.some(k => msg.includes(k));

    if (!isEnergyRelated && msg.length > 3) {
        return funnyOffTopicReplies[Math.floor(Math.random() * funnyOffTopicReplies.length)];
    }

    if (context && Array.isArray(context) && context.length > 0) {
        if (msg.includes('billigast') || msg.includes('lägst pris')) {
            const cheapest = [...context].sort((a, b) => parseFloat(a.p) - parseFloat(b.p))[0];
            return `Jag ser i mina ledningar att **${cheapest.id}** leder ligan med lägst pris just nu: **${cheapest.p} EUR/MWh**. Ganska fyndigt! 📉`;
        }
        if (msg.includes('dyrast') || msg.includes('högst pris')) {
            const expensive = [...context].sort((a, b) => parseFloat(b.p) - parseFloat(a.p))[0];
            return `Ouch! **${expensive.id}** har rejält med spänning i priset just nu: **${expensive.p} EUR/MWh**. Plånboken gråter... 📈`;
        }
        if (msg.includes('topplista') || msg.includes('lista')) {
            const sorted = [...context].sort((a, b) => parseFloat(b.p) - parseFloat(a.p));
            // Top 3 Dyrast (Sist i sorterade listan om vi sorterar billigast först, eller tvärtom)
            // Låt oss sortera Dyrast -> Billigast för tydlighet
            const desc = [...context].sort((a, b) => parseFloat(b.p) - parseFloat(a.p));
            const top3 = desc.slice(0, 3).map(z => `${z.id} (${z.p})`).join(', ');
            const bot3 = desc.slice(-3).map(z => `${z.id} (${z.p})`).join(', ');
            return `📊 **Topplista Priser**\n🔴 Dyrast: ${top3}\n🟢 Billigast: ${bot3}`;
        }
    }

    if (msg.includes('vem är du') || msg.includes('vacker') || msg.includes('hjälp')) {
        return "Jag är din personliga energi-assistent! 🤖\nJag kan svara på frågor som:\n- \"Vad är priset i SE3?\"\n- \"Hur mycket blåser det i DK1?\"\n- \"Vilken zon är billigast?\"\n- \"Topplista priser\"\n\nTesta mig!";
    }

    return null;
}

// --- Native Gemini Call ---
async function callGemini(message, context) {
    if (!GEMINI_API_KEY) throw new Error("API Key Missing");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const prompt = `
    Du är "Energi-Assistenten", skämtsam men expert. 
    Här är live-data: ${JSON.stringify(context)}
    Användaren frågar: "${message}"
    Svara kort och roligt på svenska. Använd fetstil för priser.
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Ingen respons från AI.";
}

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

    // --- Chat Endpoint ---
    if (req.url === '/chat' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const { message, context } = JSON.parse(body);

                // A. Local
                const localReply = getLocalResponse(message, context);
                if (localReply) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: localReply }));
                    return;
                }

                // B. Cache
                const cacheKey = `${message.trim().toLowerCase()}_${JSON.stringify(context || [])}`;
                const cached = responseCache.get(cacheKey);
                if (cached && (Date.now() - cached.time < CACHE_TTL)) {
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ reply: cached.reply }));
                    return;
                }

                // C. Gemini (Native Fetch)
                const reply = await callGemini(message, context);
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

    // --- Proxy to ENTSO-E ---
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
