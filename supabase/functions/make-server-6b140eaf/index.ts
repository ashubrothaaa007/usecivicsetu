import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";

const app = new Hono();

app.use('*', logger(console.log));

app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

const PREFIX = "civicsetu:complaint:";
const LEGACY_PREFIX = "nammaooru:complaint:";

// ——— Health ———
app.get("/make-server-6b140eaf/health", (c) => c.json({ status: "ok" }));

// ——— GET all complaints (image stripped for performance, hasImage flag added) ———
app.get("/make-server-6b140eaf/complaints", async (c) => {
  try {
    const [allCivic, allLegacy] = await Promise.all([
      kv.getByPrefix(PREFIX),
      kv.getByPrefix(LEGACY_PREFIX),
    ]);
    const merged = [...(allCivic as any[] || []), ...(allLegacy as any[] || [])];
    const seen = new Set();
    const unique = merged.filter((item: any) => {
      if (!item?.id || seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    const complaints = unique.map((item: any) => ({
      ...item,
      hasImage: !!item.image,
      image: "", // strip image for listing
    }));
    // Sort by submittedAt descending (newest first)
    complaints.sort((a: any, b: any) => (b.submittedAt || 0) - (a.submittedAt || 0));
    return c.json({ complaints });
  } catch (e) {
    console.log("Error fetching complaints:", e);
    return c.json({ error: `Failed to fetch complaints: ${e}` }, 500);
  }
});

// ——— GET single complaint (with full image) ———
app.get("/make-server-6b140eaf/complaints/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const complaint = (await kv.get(`${PREFIX}${id}`)) || (await kv.get(`${LEGACY_PREFIX}${id}`));
    if (!complaint) return c.json({ error: "Not found" }, 404);
    return c.json({ complaint });
  } catch (e) {
    console.log("Error fetching complaint:", e);
    return c.json({ error: `Failed to fetch complaint: ${e}` }, 500);
  }
});

// ——— POST create complaint ———
app.post("/make-server-6b140eaf/complaints", async (c) => {
  try {
    const body = await c.req.json();
    if (!body.id) return c.json({ error: "Missing complaint id" }, 400);
    await kv.set(`${PREFIX}${body.id}`, body);
    console.log(`Saved complaint ${body.id} for ward ${body.wardNo}`);
    return c.json({ ok: true, id: body.id });
  } catch (e) {
    console.log("Error saving complaint:", e);
    return c.json({ error: `Failed to save complaint: ${e}` }, 500);
  }
});

// ——— PATCH update status ———
app.patch("/make-server-6b140eaf/complaints/:id/status", async (c) => {
  try {
    const id = c.req.param("id");
    const { status } = await c.req.json();
    let existing = await kv.get(`${PREFIX}${id}`) as any;
    let targetKey = `${PREFIX}${id}`;
    if (!existing) {
      existing = await kv.get(`${LEGACY_PREFIX}${id}`) as any;
      if (existing) targetKey = `${LEGACY_PREFIX}${id}`;
    }
    if (!existing) return c.json({ error: "Not found" }, 404);
    const updated = { ...existing, status };
    await kv.set(targetKey, updated);
    console.log(`Updated complaint ${id} status to ${status}`);
    return c.json({ ok: true });
  } catch (e) {
    console.log("Error updating status:", e);
    return c.json({ error: `Failed to update status: ${e}` }, 500);
  }
});

// ——— POST analyze garbage photograph with Gemini AI ———
app.post("/make-server-6b140eaf/analyze-garbage", async (c) => {
  try {
    const apiKey = (Deno.env.get("GEMINI_API_KEY") || "").trim();
    if (!apiKey) {
      return c.json({ error: "GEMINI_API_KEY is not configured on the backend." }, 500);
    }

    const { image, mimeType = "image/jpeg" } = await c.req.json();
    if (!image) {
      return c.json({ error: "Missing image payload." }, 400);
    }

    const cleanBase64 = image.includes(",")
      ? image.split(",")[1]
      : image.replace(/^data:image\/[a-zA-Z+]+;base64,/, "");

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

    const models = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.8-flash", "gemini-3.5-flash"];
    let lastError = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: prompt },
                  { inline_data: { mime_type: mimeType, data: cleanBase64 } },
                ],
              },
            ],
            generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
          }),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.log(`Gemini model ${model} error:`, response.status, errText);
          lastError = new Error(`Gemini error ${response.status}: ${errText.slice(0, 150)}`);
          continue;
        }

        const json = await response.json();
        const parts = json.candidates?.[0]?.content?.parts || [];
        let rawText = "";
        for (const p of parts) {
          if (p.text && p.text.trim()) {
            rawText = p.text;
            if (p.text.includes("{")) break;
          }
        }

        if (!rawText) {
          continue;
        }

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        const cleaned = jsonMatch ? jsonMatch[0] : rawText.trim();
        const parsed = JSON.parse(cleaned);
        return c.json({ ok: true, data: parsed });
      } catch (err) {
        lastError = err;
      }
    }

    return c.json({ error: lastError?.message || "All Gemini models failed." }, 500);
  } catch (e: any) {
    console.log("Garbage analysis error:", e);
    return c.json({ error: `Analysis failed: ${e?.message || e}` }, 500);
  }
});

Deno.serve(app.fetch);
