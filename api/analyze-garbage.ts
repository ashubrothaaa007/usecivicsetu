// Vercel Serverless Function: /api/analyze-garbage
// Analyzes captured garbage photograph using Google Gemini Vision API

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export interface GarbageAnalysisResult {
  garbageDetected: 'Yes' | 'No' | 'Uncertain';
  wasteCategory: string;
  mappedWasteType: 'Household Waste' | 'Construction Debris' | 'Mixed Waste' | 'E-Waste' | 'Biomedical';
  estimatedSeverity: 'Minor' | 'Moderate' | 'Severe' | 'Critical';
  quantity: 'Low' | 'Medium' | 'High';
  condition: 'Scattered' | 'Accumulated';
  environmentalConcerns: string;
  isRelevant: boolean;
  observation: string;
  confidence: number;
}

const SYSTEM_PROMPT = `You are an expert municipal garbage detection and verification AI for CivicSetu in Chennai, India.
Analyze the provided photograph captured by a citizen filing a civic garbage complaint.

Evaluate strictly and objectively:
1. Is municipal waste, garbage, discarded refuse, construction debris, overflowing bins, or litter actually visible in this image?
   - "Yes": Clear municipal waste/garbage/litter is visibly present.
   - "No": No garbage is present (e.g. clean street, indoor scene, selfie, vehicle, clear park, animals without waste, scenery, walls, etc.).
   - "Uncertain": The photo is too blurry, too dark, obstructed, completely out of focus, or inconclusive.

2. If "Yes":
   - wasteCategory: Specific descriptive category, e.g. "Plastic waste", "Paper waste", "Food waste", "Construction waste", "Mixed waste", or "Other visible waste".
   - mappedWasteType: One of "Household Waste", "Construction Debris", "Mixed Waste", "E-Waste", "Biomedical".
   - estimatedSeverity:
       * "Minor": Small litter, scattered wrappers/cups.
       * "Moderate": Auto-rickshaw size pile, medium garbage heap.
       * "Severe": Road or drain blocked, large accumulation.
       * "Critical": Massive illegal dumping, overflowing dump yard, hazardous spill.
   - quantity: "Low" | "Medium" | "High".
   - condition: "Scattered" | "Accumulated".
   - environmentalConcerns: Brief 1-sentence note on sanitary/environmental risks (e.g. "Risk of drain blockage and vector-borne diseases.").
   - isRelevant: true.
   - observation: 1-2 concise sentences describing the visible waste at the reported location (e.g. "Visible plastic waste and scattered garbage identified along the roadside curb.").
   - confidence: A number between 0.0 and 1.0 indicating AI confidence.

3. If "No":
   - wasteCategory: "None".
   - mappedWasteType: "Mixed Waste".
   - estimatedSeverity: "Minor".
   - quantity: "Low".
   - condition: "Scattered".
   - environmentalConcerns: "No municipal garbage detected.".
   - isRelevant: false.
   - observation: 1-2 sentences stating what is visible instead of waste (e.g. "Clear paved street with no visible waste or litter.").
   - confidence: A number between 0.0 and 1.0.

4. If "Uncertain":
   - wasteCategory: "Uncertain".
   - mappedWasteType: "Mixed Waste".
   - estimatedSeverity: "Minor".
   - quantity: "Low".
   - condition: "Scattered".
   - environmentalConcerns: "Visibility is insufficient for accurate civic analysis.".
   - isRelevant: false.
   - observation: 1-2 sentences explaining why analysis is uncertain (e.g. "The photograph is too blurry or insufficiently lit to verify municipal waste.").
   - confidence: A number below 0.5.

Return ONLY a valid JSON object matching this schema without any markdown wrapping:
{
  "garbageDetected": "Yes" | "No" | "Uncertain",
  "wasteCategory": string,
  "mappedWasteType": "Household Waste" | "Construction Debris" | "Mixed Waste" | "E-Waste" | "Biomedical",
  "estimatedSeverity": "Minor" | "Moderate" | "Severe" | "Critical",
  "quantity": "Low" | "Medium" | "High",
  "condition": "Scattered" | "Accumulated",
  "environmentalConcerns": string,
  "isRelevant": boolean,
  "observation": string,
  "confidence": number
}`;

export async function runGeminiAnalysis(
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<GarbageAnalysisResult> {
  const apiKey = (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    ''
  ).trim();

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured on the backend.');
  }

  // Security: Guard against excessively large payloads (> 10MB base64) to prevent memory exhaustion
  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length > 10000000) {
    throw new Error('Invalid image payload or file size exceeds maximum 10MB limit.');
  }

  // Validate allowed MIME types
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
  const sanitizedMime = allowedMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

  // Robustly extract base64 data regardless of data URL prefix
  const cleanBase64 = imageBase64.includes(',')
    ? imageBase64.split(',')[1]
    : imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  if (!cleanBase64 || cleanBase64.length < 50) {
    throw new Error('Invalid or empty image payload.');
  }

  // Active models supported by Gemini v1beta Generative Language API
  const models = [
    'gemini-3.5-flash-lite',
    'gemini-3.1-flash-lite',
    'gemini-3.8-flash',
    'gemini-3.5-flash',
    'gemini-flash-latest',
  ];

  let lastError: Error | null = null;

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

      const requestBody = {
        contents: [
          {
            parts: [
              { text: SYSTEM_PROMPT },
              {
                inline_data: {
                  mime_type: sanitizedMime,
                  data: cleanBase64,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.warn(`Gemini model ${model} status ${response.status}:`, errorText.slice(0, 200));
        lastError = new Error(`Gemini API error (${response.status}): ${errorText.slice(0, 200)}`);
        continue;
      }

      const json = await response.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };
      const parts = json.candidates?.[0]?.content?.parts || [];

      // Find the JSON part
      let rawText = '';
      for (const part of parts) {
        if (part.text && part.text.trim()) {
          rawText = part.text;
          if (part.text.includes('{')) break;
        }
      }

      if (!rawText) {
        throw new Error('No analysis text received from Gemini API.');
      }

      // Extract JSON object safely
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      const cleaned = jsonMatch ? jsonMatch[0] : rawText.trim();
      const parsed: GarbageAnalysisResult = JSON.parse(cleaned);

      // Validate required fields
      if (!parsed.garbageDetected || !['Yes', 'No', 'Uncertain'].includes(parsed.garbageDetected)) {
        parsed.garbageDetected = 'Uncertain';
      }
      if (!parsed.wasteCategory) parsed.wasteCategory = parsed.garbageDetected === 'Yes' ? 'Mixed Waste' : 'None';
      if (!parsed.estimatedSeverity) parsed.estimatedSeverity = 'Minor';
      if (!parsed.mappedWasteType) parsed.mappedWasteType = 'Mixed Waste';
      if (!parsed.observation) parsed.observation = parsed.garbageDetected === 'Yes' ? 'Garbage detected in the image.' : 'No garbage detected.';
      if (typeof parsed.confidence !== 'number') parsed.confidence = 0.9;

      return parsed;
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn(`Model ${model} attempt failed:`, errorMsg);
      lastError = err instanceof Error ? err : new Error(errorMsg);
    }
  }

  throw lastError || new Error('Failed to analyze photograph with Gemini.');
}

interface ApiRequest {
  method?: string;
  body?: {
    image?: string;
    mimeType?: string;
  };
}

interface ApiResponse {
  setHeader: (key: string, value: string) => void;
  status: (code: number) => {
    json: (body: unknown) => void;
    end: () => void;
  };
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const { image, mimeType } = req.body || {};
    if (!image) {
      return res.status(400).json({ error: 'Missing "image" in request body.' });
    }

    const result = await runGeminiAnalysis(image, mimeType || 'image/jpeg');
    return res.status(200).json({ ok: true, data: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error during image analysis.';
    console.error('Garbage analysis backend error:', message);
    return res.status(500).json({ error: message });
  }
}
