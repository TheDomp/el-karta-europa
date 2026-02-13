const { onRequest } = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const { defineSecret } = require('firebase-functions/params');

// Define the GEMINI_API_KEY secret
// Run: firebase functions:secrets:set GEMINI_API_KEY
const apiKey = defineSecret('GEMINI_API_KEY');

const funnyOffTopicReplies = [
    "Szzzt! Mitt huvud är fullt av högspänning just nu, jag kan tyvärr bara tänka på elpriser. Fråga om SE3 istället!",
    "Kortslutning! ⚡️ Den frågan drog för mycket ampere för min lilla hjärna. Håll dig till kilowattimmar eller nätområden så blir jag glad.",
    "Jag är en energi-bot, inte ett lexikon! Om det inte går att mäta i Volt, GW eller Euro per MWh så är jag helt nollställd.",
    "Hörde jag 'pannkaksrecept'? Tyvärr, jag drivs av vindkraft, inte socker. Fråga mig om vindkraftsproduktionen istället!",
    "Varning för överbelastning! 🚨 Jag kan bara svara på saker som rör elen i Europa eller hur kartan funkar. Allt annat ger mig bara brus på linjen."
];

function getLocalResponse(message, context) {
    const msg = message.toLowerCase();
    const zoneRegex = /\b(SE\d|DK\d|NO\d|FI|IT-[A-Z]+|(SE|DK|NO|FI|DE|NL|BE|AT|PL|CH|CZ|SK|HU|FR|ES|PT|GB|IE|EE|LV|LT|IT|GR|RO|BG|HR|RS|BA|SI|ME|MK|AL))\b/i;
    const match = msg.match(zoneRegex);

    if (match && context && Array.isArray(context)) {
        const zoneId = match[1].toUpperCase();
        const zoneData = context.find(z => z.id === zoneId);

        if (zoneData) {
            if (msg.includes('pris') || msg.includes('kosta') || msg.includes('dyrt') || msg.includes('billigt')) {
                return `Elpriset i **${zoneId}** ligger på **${zoneData.p} EUR/MWh** just nu.`;
            }
            if (msg.includes('förbrukning') || msg.includes('last') || msg.includes('konsum') || msg.includes('använd')) {
                return `Just nu förbrukas det **${zoneData.l}** i **${zoneId}**.`;
            }
            if (msg.includes('vind') || msg.includes('blåser')) {
                return zoneData.w
                    ? `Det blåser på bra! Vindkraften genererar **${zoneData.w}** i **${zoneId}** just nu.`
                    : `Jag ser ingen vindkrafts-data för **${zoneId}** precis nu, men det kanske blåser ändå! 🌬️`;
            }
            let reply = `Läget i **${zoneId}** just nu:\n💰 Pris: **${zoneData.p} EUR/MWh**\n📉 Last: **${zoneData.l}**`;
            if (zoneData.w) reply += `\n💨 Vind: **${zoneData.w}**`;
            return reply;
        }
    }

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

// Updated callGemini to accept the secret key value
async function callGemini(message, context, key) {
    if (!key) throw new Error("API Key Missing in Server Environment");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
    const prompt = `
    Du är "Energi-Assistenten", skämtsam men expert. 
    Här är live-data: ${JSON.stringify(context)}
    Användaren frågar: "${message}"
    Svara kort och roligt på svenska. Använd fetstil för priser.
    `;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Ingen respons från AI.";
}

// Main Proxy Function (ENTSO-E)
exports.entsoeProxy = onRequest({ cors: true }, async (request, response) => {
    const targetHost = "web-api.tp.entsoe.eu";

    const query = new URLSearchParams(request.query).toString();
    const targetUrl = `https://${targetHost}/api?${query}`;

    logger.info(`Proxying request to: ${targetUrl}`);

    try {
        const apiRes = await fetch(targetUrl, {
            method: "GET",
            headers: {
                "User-Agent": "El-Karta-Europa/1.0",
                "Content-Type": "application/xml"
            }
        });

        const text = await apiRes.text();

        response.status(apiRes.status);
        response.set("Content-Type", "application/xml");
        response.set("Access-Control-Allow-Origin", "*");

        response.send(text);

    } catch (error) {
        logger.error("Proxy Failed", error);
        response.status(500).send(`Proxy Error: ${error.message}`);
    }
});

// Chat Proxy Function (Gemini)
// Injects the secret 'GEMINI_API_KEY'
exports.chatProxy = onRequest({ cors: true, secrets: [apiKey] }, async (request, response) => {
    if (request.method !== 'POST') {
        response.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { message, context } = request.body;

        // A. Local logic
        const localReply = getLocalResponse(message, context);
        if (localReply) {
            response.json({ reply: localReply });
            return;
        }

        // B. Gemini (Pass the secret value)
        const reply = await callGemini(message, context, apiKey.value());
        response.json({ reply });

    } catch (error) {
        logger.error("Chat Error", error);
        response.status(500).json({ error: error.message });
    }
});
