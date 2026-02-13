
import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment variables
dotenv.config();

const API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;

if (!API_KEY) {
    console.error("❌ Error: GEMINI_API_KEY not found in environment variables.");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const OUTPUT_DIR = path.join(process.cwd(), "scenarios");
const OUTPUT_FILE = path.join(OUTPUT_DIR, "winter_2026.json");

// Define the schema for the prompt (simplified representation)
const schemaDescription = `
Array of objects, where each object represents a Bidding Zone (SE1, SE2, SE3, SE4, DK1, DK2, NO1, etc).
Structure:
{
  "zoneId": string, // e.g. "SE3"
  "zoneName": string, // e.g. "Stockholm"
  "spotPrice": number, // EUR/MWh
  "demand": number, // MW
  "productionMix": {
    "wind": number, // MW
    "nuclear": number, // MW
    "hydro": number, // MW
    "solar": number, // MW
    "gas": number, // MW
    "coal": number, // MW,
    "biomass": number, // MW
    "other": number // MW
  },
  "timestamp": string // ISO 8601 (2026-02-15T18:00:00Z)
}
`;

async function generateScenario() {
    const prompt = `
    You are a simulator for the European power grid. 
    Generate a JSON dataset representing a "Severe Winter 2026" scenario.
    
    Context:
    - Date: February 15, 2026, 18:00 (Peak Load).
    - Weather: Extreme cold wave across Scandinavia (-20C in Stockholm).
    - Events: 
      1. Major nuclear outage in SE3 (Forsmark 1 & 2 down).
      2. Very low wind generation (<5% capacity factor) across SE3, SE4, and DK1/DK2.
      3. Import constraints from Germany.
    
    Resulting Market State:
    - SE3 and SE4 should have extreme prices (e.g., >300 EUR/MWh).
    - SE1 and SE2 might be lower due to hydro, but transmission constraints limit south-flow.
    - Fossil fuels (Gas/Coal) running at max in DK/DE to compensate.
    
    Output Requirements:
    - Return ONLY valid JSON.
    - No markdown formatting or code blocks.
    - Include zones: SE1, SE2, SE3, SE4, DK1, DK2, NO1, NO2, FI.
    - Ensure "timestamp" is "2026-02-15T18:00:00Z".
    
    Schema:
    ${schemaDescription}
  `;

    console.log("🤖 Asking Gemini to simulate 'Winter 2026'...");

    try {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        let text = response.text();

        // Clean up markdown code blocks if present
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        const data = JSON.parse(text);

        if (!fs.existsSync(OUTPUT_DIR)) {
            fs.mkdirSync(OUTPUT_DIR, { recursive: true });
        }

        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2));
        console.log(`✅ Scenario generated and saved to: ${OUTPUT_FILE}`);
        console.log("Preview SE3:", data.find((z: any) => z.zoneId === 'SE3'));

    } catch (error) {
        console.error("❌ Generation failed:", error);
    }
}

generateScenario();
