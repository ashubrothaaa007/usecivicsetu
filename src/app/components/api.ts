// ——— Civicsetu API client (Supabase backend) ———
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { Complaint, Status } from './data';

const BASE = `https://${projectId}.supabase.co/functions/v1/make-server-6b140eaf`;

const headers = () => ({
  'Authorization': `Bearer ${publicAnonKey}`,
  'Content-Type': 'application/json',
});

/** Fetch all complaints (image field is empty; use hasImage flag) */
export async function apiFetchComplaints(): Promise<Complaint[]> {
  const res = await fetch(`${BASE}/complaints`, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`apiFetchComplaints ${res.status}: ${text}`);
  }
  const data = await res.json();
  return (data.complaints || []) as Complaint[];
}

/** Fetch a single complaint with full image */
export async function apiFetchComplaint(id: string): Promise<Complaint | null> {
  const res = await fetch(`${BASE}/complaints/${id}`, { headers: headers() });
  if (res.status === 404) return null;
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`apiFetchComplaint ${res.status}: ${text}`);
  }
  const data = await res.json();
  return data.complaint as Complaint;
}

/** Save a new complaint */
export async function apiPostComplaint(complaint: Complaint): Promise<void> {
  const res = await fetch(`${BASE}/complaints`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(complaint),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`apiPostComplaint ${res.status}: ${text}`);
  }
}

/** Update complaint status */
export async function apiPatchStatus(id: string, status: Status): Promise<void> {
  const res = await fetch(`${BASE}/complaints/${id}/status`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`apiPatchStatus ${res.status}: ${text}`);
  }
}

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

async function directGeminiFallback(base64Image: string, mimeType = 'image/jpeg'): Promise<GarbageAnalysisResult> {
  const envKey = (import.meta as unknown as { env?: { VITE_GEMINI_API_KEY?: string } }).env?.VITE_GEMINI_API_KEY;
  const apiKey = (envKey || '').trim();
  if (!apiKey) {
    throw new Error('Gemini AI backend service is unreachable. Please verify server connectivity or configure GEMINI_API_KEY on the backend.');
  }
  const cleanBase64 = base64Image.includes(',')
    ? base64Image.split(',')[1]
    : base64Image.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

  const prompt = `You are an expert municipal garbage detection and verification AI for CivicSetu in Chennai, India.
Analyze the provided photograph captured by a citizen filing a civic garbage complaint.

Evaluate strictly and objectively:
1. Is municipal waste, garbage, discarded refuse, construction debris, overflowing bins, or litter actually visible in this image?
   - "Yes": Clear municipal waste/garbage/litter is visibly present.
   - "No": No garbage is present (clean street, indoor room, clear park, selfie, vehicle, etc.).
   - "Uncertain": The photo is too blurry, too dark, obstructed, or out of focus.

2. Return valid JSON matching this schema:
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

  const models = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];
  let lastErr: Error | null = null;

  for (const m of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mimeType, data: cleanBase64 } },
              ],
            },
          ],
          generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
        }),
      });

      if (!res.ok) {
        lastErr = new Error(`Gemini ${m} status ${res.status}`);
        continue;
      }

      const json = await res.json() as {
        candidates?: Array<{
          content?: {
            parts?: Array<{ text?: string }>;
          };
        }>;
      };
      const parts = json.candidates?.[0]?.content?.parts || [];
      let rawText = '';
      for (const p of parts) {
        if (p.text && p.text.trim()) {
          rawText = p.text;
          if (p.text.includes('{')) break;
        }
      }
      if (!rawText) continue;

      const match = rawText.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : rawText.trim());
      if (!parsed.garbageDetected || !['Yes', 'No', 'Uncertain'].includes(parsed.garbageDetected)) {
        parsed.garbageDetected = 'Uncertain';
      }
      if (!parsed.wasteCategory) parsed.wasteCategory = parsed.garbageDetected === 'Yes' ? 'Mixed Waste' : 'None';
      if (!parsed.estimatedSeverity) parsed.estimatedSeverity = 'Minor';
      if (!parsed.mappedWasteType) parsed.mappedWasteType = 'Mixed Waste';
      if (!parsed.observation) parsed.observation = parsed.garbageDetected === 'Yes' ? 'Garbage detected.' : 'No garbage detected.';
      if (typeof parsed.confidence !== 'number') parsed.confidence = 0.9;
      return parsed as GarbageAnalysisResult;
    } catch (e: unknown) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr || new Error('All Gemini analysis attempts failed.');
}

/** Analyze captured photograph with Gemini AI via backend with resilient fallbacks */
export async function apiAnalyzeGarbage(base64Image: string, mimeType = 'image/jpeg'): Promise<GarbageAnalysisResult> {
  // 1. First attempt local / Vercel API endpoint
  try {
    const res = await fetch('/api/analyze-garbage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64Image, mimeType }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.data) {
        return data.data as GarbageAnalysisResult;
      }
    }
  } catch (err) {
    console.warn('Local /api/analyze-garbage request failed, trying Supabase Edge function fallback:', err);
  }

  // 2. Fallback to Supabase edge function endpoint
  try {
    const res = await fetch(`${BASE}/analyze-garbage`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify({ image: base64Image, mimeType }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && data.data) {
        return data.data as GarbageAnalysisResult;
      }
    }
  } catch (err) {
    console.warn('Supabase edge function fallback failed, attempting direct Gemini API call:', err);
  }

  // 3. Resilient fallback directly to Google Gemini API
  return await directGeminiFallback(base64Image, mimeType);
}
