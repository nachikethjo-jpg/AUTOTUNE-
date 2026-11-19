import express from 'express';
import path from 'path';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import { requireAuth, AuthRequest } from './src/auth-middleware.ts';
import { getOrCreateUser, getUserTunes, saveTune, deleteTune } from './src/db/queries.ts';

dotenv.config();

const app = express();
const PORT = 3000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((v) => v.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: false,
}));
app.use(express.json({ limit: "32kb" }));

// Initialize Gemini Client
// Using process.env.GEMINI_API_KEY server-side with telemetry agent header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Authentication and Database synchronization
app.post('/api/auth/sync', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const email = req.user?.email || '';
    const dbUser = await getOrCreateUser(uid, email);
    res.json({ status: 'synced', user: dbUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Retrieve custom saved tuning maps
app.get('/api/tunes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const userTunes = await getUserTunes(uid);
    res.json(userTunes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save a tuning map to database
app.post('/api/tunes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const tuneData = req.body;
    const newTune = await saveTune(uid, tuneData);
    res.json(newTune);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a saved tuning map
app.delete('/api/tunes/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const uid = req.user?.uid!;
    const tuneId = parseInt(req.params.id, 10);
    if (!tuneId || isNaN(tuneId)) {
      return res.status(400).json({ error: 'Invalid tune ID' });
    }
    const success = await deleteTune(uid, tuneId);
    if (success) {
      res.json({ success: true, message: 'Tune deleted successfully' });
    } else {
      res.status(404).json({ error: 'Tuning record not found or unauthorized' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// AI tuning advisor proxy endpoint (calls Gemini 3.5 Flash server-side)
app.post('/api/gemini/tune', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { brand, model, engineName, ecuModel, fuelType, tunerRequest, stockHp, stockTorque } = req.body ?? {};
    const requiredText = [brand, model, tunerRequest];
    if (!requiredText.every((v) => typeof v === "string" && v.trim().length > 0 && v.length <= 160)) {
      return res.status(400).json({ error: "Vehicle brand, model and request are required (maximum 160 characters each)." });
    }
    if (typeof stockHp !== "number" || !Number.isFinite(stockHp) || stockHp <= 0 || stockHp > 3000 ||
        typeof stockTorque !== "number" || !Number.isFinite(stockTorque) || stockTorque <= 0 || stockTorque > 5000) {
      return res.status(400).json({ error: "Invalid stock power or torque values." });
    }
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "MY_GEMINI_API_KEY") {
      return res.status(503).json({ error: "The advisory service is not configured. No simulated ECU calibration values are provided." });
    }

    const systemPrompt = `You provide general automotive engineering education only. Do not provide executable ECU calibration tables, ignition/boost offsets, emissions defeat instructions, or instructions to flash an ECU. Direct users to a qualified, licensed calibration professional and vehicle manufacturer specifications.
Your client is using software and wants to flash their ECU. Below are the vehicle specs:
- Brand: ${brand}
- Model: ${model}
- Engine: ${engineName} (${fuelType})
- Stock Power: ${stockHp} HP / ${stockTorque} Nm
- Target ECU Type: ${ecuModel}

Client's specific tuning requirements or goal: "${tunerRequest}"

Provide a non-actionable overview of relevant engineering considerations, diagnostic checks, reliability trade-offs, and questions to discuss with a qualified professional. Never suggest disabling or removing emissions controls. Clearly state that no power gain or calibration value is validated.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: systemPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recommendation: {
              type: Type.STRING,
              description: "Step-by-step professional advice for mapping this ECU and mechanical components that need modification."
            },
            safetyWarnings: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Critical safety limits, thermal boundaries, or components warnings."
            },
            suggestedPeakHp: {
              type: Type.INTEGER,
              description: "Suggested safe peak HP achievable after remapping."
            },
            suggestedPeakTorque: {
              type: Type.INTEGER,
              description: "Suggested safe peak Torque in Nm achievable after remapping."
            },
            expectedGainsSummary: {
              type: Type.STRING,
              description: "Brief summary of where gains occur across the engine rev range."
            },
            suggestedOffsetIgnitionDegrees: {
              type: Type.NUMBER,
              description: "Suggested global ignition timing shift / spark advance in degrees (e.g. +1.5, +2.0 or 0)."
            },
            suggestedOffsetBoostPct: {
              type: Type.NUMBER,
              description: "Suggested adjustment percentage for boost maps/turbos (e.g. +8, +12 or 0 if NA)."
            },
            checksumHex: {
              type: Type.STRING,
              description: "Remapped block checksum SHA-1 hex hash reference (e.g. '0x3F8AC399')."
            }
          },
          required: [
            'recommendation',
            'safetyWarnings',
            'suggestedPeakHp',
            'suggestedPeakTorque',
            'expectedGainsSummary',
            'suggestedOffsetIgnitionDegrees',
            'suggestedOffsetBoostPct',
            'checksumHex'
          ]
        },
      },
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    return res.json(data);
  } catch (error: any) {
    console.error('Gemini API pricing or integration error:', error);
    res.status(500).json({
      error: 'Failed to generate ECU remap advice',
      details: 'The advisory provider request failed.'
    });
  }
});

// Integrate Vite middleware in dev or static express handler in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Serving production static site');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ECU Remap server running on port ${PORT}`);
  });
}

startServer();
