import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini API client to ensure clean start even without safe loadout of key secrets
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not defined.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. Arcade Hype Announcer live commentary endpoint
app.post('/api/commentary', async (req, res) => {
  try {
    const { p1Name, p1Weapon, p2Name, p2Weapon, eventType } = req.body;
    const client = getGeminiClient();

    const systemInstruction = 
      "You are an epic, hyper-energetic 90s arcade fighting game announcer (like in Street Fighter II, Mortal Kombat, or Killer Instinct). " +
      "Provide a single-sentence exclamation or hype commentary. Be loud, thrilling, and reference the fighters' weapons and titles. " +
      "Use capital letters or exclamation marks to add crunch and raw arcade vibe. " +
      "Example: 'ROUND 1! SOLAR KNIGHT SO SOLA SLASHES THE GALAXY WITH HER STELLAR SHIELD! CRITICAL BLOW!'";

    const prompt = `Develop a live announcer reaction. Player 1: ${p1Name} equipped with ${p1Weapon}. Player 2: ${p2Name} equipped with ${p2Weapon}. Core combat stage event triggered: ${eventType || 'Match started!'}. Provide only one short sentence of elite retro hype!`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 1.0,
      },
    });

    res.json({ text: response.text || "FIGHT!" });
  } catch (error: any) {
    console.error('Commentary Error:', error.message);
    res.json({ text: "FIGHT FOR GLORY! UNLEASH THE BEAST!" });
  }
});

// 2. Pro AI Dojo Coach Analysis endpoint
app.post('/api/coach', async (req, res) => {
  try {
    const { p1, p1Weapon, p2, p2Weapon } = req.body;
    const client = getGeminiClient();

    const prompt = 
      `Analyze this fighting game matchup and write tactical, pro-tier Dojo player advice in clean Markdown formatting.\n\n` +
      `Matchup:\n` +
      `- Player 1 (User): ${p1.name} (Title: ${p1.title}, Color: ${p1.color}) equipped with ${p1Weapon.name} (Type: ${p1Weapon.type}, Stats Mod: Power ${p1Weapon.bonusPower}, Speed ${p1Weapon.bonusSpeed}, Defense ${p1Weapon.bonusDefense}, Greater Reach ${p1Weapon.bonusRange}).\n` +
      `- Player 2 (Enemy): ${p2.name} (Title: ${p2.title}) equipped with ${p2Weapon.name} (Type: ${p2Weapon.type}).\n\n` +
      `Formulate a short Strategy Briefing (2 paragraphs max) detailing:\n` +
      `1. **Matchup Analysis**: How P1's attributes + weapon synergize or counter P2's setup.\n` +
      `2. **Dojo Secret Tip**: A concrete tactic (spacing, punch/kick/special trigger times, or blocking recommendation) to secure victory.`;

    const response = await client.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    res.json({ markdown: response.text || "Stay light on your feet and watch for the opponent's counter swings!" });
  } catch (error: any) {
    console.error('Coach Error:', error.message);
    res.json({ 
      markdown: "### Dojos Trainer Offline\nSelect your distance wisely. Watch your opponent's frame triggers and block heavy slashing attack swings to launch immediate counter-offensive rushes." 
    });
  }
});

// Serve Frontend using Vite Dev Server in Dev, or Express Static in Production
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server launched successfully on http://0.0.0.0:${PORT}`);
  });
}

start();
