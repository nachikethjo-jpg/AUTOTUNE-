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

app.use(cors());
app.use(express.json());

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
app.post('/api/gemini/tune', async (req, res) => {
  try {
    const { brand, model, engineName, ecuModel, fuelType, tunerRequest, stockHp, stockTorque } = req.body;

    if (!brand || !model || !tunerRequest) {
      return res.status(400).json({ error: 'Missing required vehicle and request details' });
    }

    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'MY_GEMINI_API_KEY') {
      // Return a professional simulation response if API key is not configured yet
      console.warn("GEMINI_API_KEY is not defined or is placeholder. Generating fallbacks.");
      
      const multiplier = tunerRequest.toLowerCase().includes('stage 2') || tunerRequest.toLowerCase().includes('aggressive') ? 1.25 : 1.15;
      
      return res.json({
        recommendation: `[SIMULATION MODE] Here is the technical ECU remapping suggestion for your ${brand} ${model} with ${ecuModel} ECU:\n1. Advance ignition timing by +2.0 degrees on mid load ranges.\n2. Lean out cruise Lambda targets for fuel economy, enrich to 0.86 Lambda near wide-open-throttle.\n3. Keep exhaust temperatures below 820°C. Recommended upgrading to high-flow air filter.`,
        safetyWarnings: [
          `Do not exceed stock structural clutch limit (estimated at ${Math.round(stockTorque * 1.3)} Nm)`,
          "Ensure high premium 95 Octane fuel is filled if timing advance exceeds threshold",
          "Check fuel pump rail pressure limits"
        ],
        suggestedPeakHp: Math.round(stockHp * multiplier),
        suggestedPeakTorque: Math.round(stockTorque * multiplier),
        expectedGainsSummary: `Simulated offset gains: +${Math.round((multiplier - 1) * 100)}% power. Increased throttle response and advanced torque curve.`,
        suggestedOffsetIgnitionDegrees: 1.8,
        suggestedOffsetBoostPct: stockHp > 110 ? 12 : 0,
        checksumHex: '0xF38A88CF'
      });
    }

    const systemPrompt = `You are a professional automotive ECU calibration engineer and master engine remapper specializing in Indian market passenger cars (Maruti Suzuki, Tata, Mahindra, Hyundai, Honda).
Your client is using software and wants to flash their ECU. Below are the vehicle specs:
- Brand: ${brand}
- Model: ${model}
- Engine: ${engineName} (${fuelType})
- Stock Power: ${stockHp} HP / ${stockTorque} Nm
- Target ECU Type: ${ecuModel}

Client's specific tuning requirements or goal: "${tunerRequest}"

Provide a realistic, professional, expert ECU remapping consultation. Return the coordinates guidelines, mechanical preparation advice (like decat exhausts, intercooler size, spark index, EGR/DPF adjustments suitable for Indian driving environments), critical EGT ceilings, and parameter shift offsets.
Your advice must be highly technical, realistic, and formatted in clean JSON using the provided schema. Ensure you return integers/numbers for recommended offsets and peak figures. Return safe peak figures for the Indian context (ambient temperature up to 45°C).`;

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
      details: error.message
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
