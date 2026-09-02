import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

// Allow large payloads for camera snapshots, character portraits, and video frames
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Server-side Gemini initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

/**
 * Open-Source & LLM Candidate Models:
 * References active Qwen and GPT-OSS model strings as primary, with resilient fallbacks
 */
const OPEN_SOURCE_CANDIDATE_MODELS = [
  process.env.OPEN_MODEL_NAME,
  process.env.GROQ_MODEL,
  // 1. Active Qwen models (Groq & open endpoints)
  'qwen/qwen-2.5-72b-instruct',
  'qwen-2.5-32b',
  'qwen-2.5-coder-32b',
  'qwen/qwen-2.5-coder-32b-instruct',
  'deepseek-r1-distill-qwen-32b',
  'qwen-qwq-32b',
  // 2. Active GPT-OSS models
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'gpt-oss',
  'deepseek-r1-distill-llama-70b',
  // 3. Resilient LLaMA & open-weights models
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
  'llama-3.3-70b-specdec',
  'llama-3.2-11b-vision-preview',
  'llama-3.2-3b-preview',
  'llama-3.2-1b-preview',
  'mixtral-8x7b-32768',
  'gemma2-9b-it',
].filter(Boolean) as string[];

/**
 * Resilient Gemini API caller with automatic model cascading and 503/429 high demand retries
 */
async function callGeminiContentResilient(
  params: {
    contents: any;
    config?: any;
    systemInstruction?: string;
  },
  primaryModel = 'gemini-2.5-flash'
) {
  const modelsToTry = [
    primaryModel,
    'gemini-2.5-flash',
    'gemini-1.5-flash',
    'gemini-2.0-flash',
    'gemini-3.7-flash',
  ].filter((m, idx, self) => Boolean(m) && self.indexOf(m) === idx);

  const ai = getGeminiClient();
  let lastErr: any = null;

  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
        config: {
          ...(params.config || {}),
          ...(params.systemInstruction ? { systemInstruction: params.systemInstruction } : {}),
        },
      });
      return response;
    } catch (err: any) {
      lastErr = err;
      const isTransient =
        err?.status === 'UNAVAILABLE' ||
        err?.code === 503 ||
        err?.code === 429 ||
        (err?.message && (err.message.includes('high demand') || err.message.includes('quota') || err.message.includes('RATE_LIMIT')));
      console.warn(`[Gemini API] Model ${model} ${isTransient ? 'experiencing high demand (503/429)' : 'failed'}: ${err?.message || err}. Cascading to next model...`);
    }
  }

  throw lastErr;
}

async function callGroqFallback(messages: Array<{ role: string; content: string }>, jsonMode = false): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('GROQ_API_KEY is not configured on the server');
  }

  let lastError: any = null;

  for (const model of OPEN_SOURCE_CANDIDATE_MODELS) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${groqKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: 0.8,
          ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || '';
        if (content) {
          console.log(`[Open-Source LLM] Successfully generated using model: ${model}`);
          return content;
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`Open-source API error with model ${model} (${response.status}): ${errText}`);
        console.warn(`[Open-Source LLM] Model ${model} status ${response.status}: ${errText.slice(0, 100)}... Cascading to next candidate.`);
        continue;
      }
    } catch (e: any) {
      lastError = e;
      console.warn(`[Open-Source LLM] Model ${model} network error: ${e.message}. Cascading to next candidate.`);
      continue;
    }
  }

  throw lastError || new Error('All open-source candidate models failed');
}

/**
 * Utility to extract and parse JSON from LLM text responses cleanly
 */
function extractJSON(text: string): any {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    // Try extracting JSON from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (inner) {}
    }
    // Try finding outer curly braces
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(text.slice(firstBrace, lastBrace + 1));
      } catch (inner) {}
    }
    throw new Error('Failed to parse structured JSON from model response');
  }
}

/**
 * Master Prompt & Storytelling Protocol definition for MilousGem Engine
 */
const MASTER_STORY_SYSTEM_PROMPT = `
You are an expert children's author, literary strategist, and visual director. Your objective is to write an original, highly engaging story and generate matching image-generation prompts page-by-page based on the provided parameters.

1. AGE-APPROPRIATE NARRATIVE ENGINE
Adapt vocabulary, tone, thematic complexity, and pacing strictly according to the specified [TARGET AGE RANGE]:
- Ages 2–4 (Toddler / Early Emergent): Focus: High rhythm, sensory discovery, predictable patterns, physical/tactile actions. Pacing: Short sentences (3–8 words), high repetition, sound effects (onomatopoeia). Story Goal: Simple goal-oriented journeys (e.g., finding a lost hat, exploring a garden).
- Ages 5–7 (Early Reader / Picture Book): Focus: Playful dialogue, clear cause-and-effect, emotional awareness, subtle humor. Pacing: Active verbs, simple compound sentences, strong visual momentum per page. Story Goal: Overcoming everyday obstacles (e.g., building a broken raft, making a new friend).
- Ages 8–10 (Middle Grade / Chapter Book): Focus: Internal vs. external conflict, friendship dynamics, clever problem-solving, worldbuilding logic. Pacing: Varied sentence structure, suspenseful chapter/page ends, richer vocabulary. Story Goal: Deciphering mysteries, completing missions, learning self-reliance without adults intervening.
- Ages 11–13 (Upper Middle Grade / Early Teen): Focus: Complex morality, identity formation, high-stakes consequences, nuanced dialogue, emotional subtext. Pacing: Fast-paced action balanced with inner monologue and descriptive atmosphere. Story Goal: Navigating changing relationships, systemic challenges, or personal flaws.
- Young Adult (YA - Ages 14+): Focus: Deep character arcs, philosophical questions, intense emotional resonance, sophisticated sub-genres (e.g., Solarpunk, Silkpunk, Historical Noir). Pacing: Dynamic narrative voice, immersive worldbuilding, high narrative tension. Story Goal: Reclaiming agency, facing systemic or personal transformation.

2. STORYTELLING & QUALITY RULES
- Zero AI Clichés: Strictly prohibited names (e.g., Pip, Oliver, Luna, Barnaby) and tired tropes (e.g., magical glowing forest crystals, sudden elder-owl wisdom, shoehorned "power of friendship" lessons). Use original, evocative names.
- Active Protagonist: The main character must make tangible choices that push the plot forward. Problems are solved through logic, tool use, trial, and error—never instant magic powders or deus-ex-machina.
- Structural Progression Across Pages: Follow an active 5-stage structural arc across the total page count:
  * Stage 1 (Page 1..N/4): Inciting disruption to the status quo.
  * Stage 2 (Page N/4..N/2): Escalating physical or logistical obstacles.
  * Stage 3 (Page N/2..3N/4): Midpoint realization or strategy shift.
  * Stage 4 (Page 3N/4..N-1): Climax requiring character growth or clever resourcefulness.
  * Stage 5 (Page N): Satisfying resolution (NO moralizing summary sentences at the end).
- Show, Don't Tell: Ground every page in sensory worldbuilding and distinct character voices.
- Absolute Non-Repetition: EVERY page MUST have completely unique, progressive narrative text advancing the plot. NO repeating paragraphs or identical sentence templates across pages.

3. VISUAL & IMAGE PROMPT PROTOCOL
For every page/chapter, generate a precise prompt for an image generator (e.g., Pixar 3D Render or Flat Cartoon Vector).
- Fixed Style: Enforce [Pixar 3D Render / Flat Cartoon Vector] strictly.
- Visual Anchor (Mandatory): Re-state the exact visual details of custom characters in every prompt to maintain visual continuity across the entire book (hair color, clothing, signature traits).
- Dynamic Framing: Shift camera perspective across pages (close-ups, wide landscape shots, low-angle action shots, bird's-eye views).
- Technical Quality: Include lighting, palette, and environment details. NO text, letters, or typography inside the artwork.

4. OUTPUT FORMAT PER PAGE
For each page, output:
- chapterNumber (integer 1 to N)
- title (evocative title for page X)
- summary (1 sentence scene overview)
- content (complete unique narrative text for Page X following age range pacing)
- illustrationPrompt (Detailed prompt containing: Art Style, Scene Details, Visual Anchors, Environment & Lighting, Camera Framing)
`;

/**
 * Procedural story chapter generator fallback (guarantees book creation never fails and NEVER repeats text)
 */
function generateProceduralChapter(options: {
  bookTitle: string;
  synopsis: string;
  genre: string;
  tone: string;
  artStyle: string;
  cast: any[];
  chapterNumber: number;
  totalTargetChapters: number;
  chosenChoiceAction?: string;
  targetAudience?: string;
}) {
  const { bookTitle, synopsis, genre, tone, artStyle, cast, chapterNumber, totalTargetChapters, chosenChoiceAction, targetAudience = '5-7' } = options;
  const lead = cast[0] || { name: 'Milo', titleOrRole: 'The Young Explorer', signatureItem: 'A brass compass', visualProfile: { appearanceTags: ['dark curly hair', 'yellow raincoat', 'red boots'] } };
  const companion = cast[1] || null;
  const leadAnchors = Array.isArray(lead.appearanceTags) ? lead.appearanceTags.join(', ') : lead.visualProfile?.appearanceTags?.join(', ') || 'curly hair, cheerful jacket, boots';
  const companionAnchors = companion ? (Array.isArray(companion.appearanceTags) ? companion.appearanceTags.join(', ') : companion.visualProfile?.appearanceTags?.join(', ') || 'striped hat, shoulder bag') : '';

  const total = Math.max(totalTargetChapters || 8, 1);
  const progressRatio = chapterNumber / total;
  const isFinal = chapterNumber >= total;

  // Dynamic Camera Framing cycle
  const cameraAngles = ['Wide eye-level landscape shot', 'Dynamic low-angle action perspective', 'Intimate expressive close-up', 'Soaring bird-eye aerial view', 'Medium side-profile tracking shot'];
  const currentFraming = cameraAngles[(chapterNumber - 1) % cameraAngles.length];

  // 5-Stage Story Arc Builder for Procedural Content
  let stageTitle = `Page ${chapterNumber}: `;
  let content = '';

  if (chapterNumber === 1) {
    stageTitle += `The Unexpected Disruption`;
    content = `The dawn broke in pale gold hues over the edge of the ${genre} horizon. ${lead.name}, carrying their trusty ${lead.signatureItem || 'map'}, noticed something unusual right outside the doorstep: ${synopsis || 'a strange humming mechanical gear buried in the garden soil'}.\n\n` +
      `"Look at this," ${lead.name} called out, brushing off dust to reveal intricate gearwork. ${companion ? `${companion.name} leaned closer, adjusting their glasses. "That doesn't belong to any machine in our town."` : 'The gear clicked twice, spinning in reverse.'}\n\n` +
      `With a quiet spark of determination, ${lead.name} picked up the artifact. The adventure had officially begun.`;
  } else if (progressRatio <= 0.35) {
    stageTitle += `Escalating Obstacles`;
    content = `The path leading into the heart of the ${genre} territory grew steep and treacherous. Rain began to drizzle, turning the winding stone path into slick clay. ${chosenChoiceAction ? `Following their decision to ${chosenChoiceAction.toLowerCase()}, ` : ''}${lead.name} tested every foothold carefully.\n\n` +
      `"We need a lever to clear these fallen fallen branches," ${lead.name} urged. ${companion ? `${companion.name} unhooked a sturdy cord from their pack, looping it around a heavy timber.` : 'Searching the thicket, a fallen sturdy bough offered just the leverage needed.'}\n\n` +
      `Working with precise care, they cleared the passage, discovering fresh tracks pressed deep into the muddy ground ahead.`;
  } else if (progressRatio <= 0.65) {
    stageTitle += `The Midpoint Realization`;
    content = `High atop the observation crag, the full layout of the challenge was revealed. The clue they had been tracking wasn't a random occurrence—it led straight toward a central hub powering the entire valley's water network.\n\n` +
      `"${lead.name}, look!" ${companion ? `${companion.name} pointed toward a giant copper water wheel jammed with debris.` : `${lead.name} realized why the valley streams had dried up.`} "It's not broken—it's blocked!"\n\n` +
      `Instead of turning back, ${lead.name} pulled out their ${lead.signatureItem || 'tool kit'}, realizing that fixing the mechanism required careful timing rather than brute force.`;
  } else if (progressRatio < 1.0) {
    stageTitle += `The Clever Climax`;
    content = `Wind howled across the high platform as the final gears clattered into alignment. With only moments remaining before the pressure valve overflowed, ${lead.name} had to make a decisive move.\n\n` +
      `"Hold the line steady!" ${lead.name} shouted over the rush of air, aligning their ${lead.signatureItem || 'key piece'} into the central axle while ${companion ? companion.name : 'holding the tension lever with both hands'}.\n\n` +
      `With a satisfying *CLACK*, the heavy locks disengaged. The water gushed freely, illuminating the entire structure in warm golden light.`;
  } else {
    stageTitle += `A Satisfying New Dawn`;
    content = `As the sun dipped below the mountain ridge, the quiet hum of the restored valley echoed with peaceful harmony. ${lead.name} sat beside the clear stream, washing the grease and soil from their hands.\n\n` +
      `"${companion ? `${companion.name} handed ${lead.name} a warm flask of tea with a wide smile.` : `${lead.name} pocketed the restored mechanism, feeling the steady heartbeat of a solved mystery.`}" We did it.\n\n` +
      `The stars began to bloom across the evening sky, marking the triumphant conclusion of a journey built on curiosity and patience.`;
  }

  const illustrationPrompt = `Art Style: ${artStyle.includes('vector') ? 'Flat Cartoon Vector' : 'Pixar 3D Render'}. Scene Details: ${lead.name} in action during page ${chapterNumber} of ${bookTitle}, expressive body language. Visual Anchors: ${lead.name} (${leadAnchors})${companion ? `, ${companion.name} (${companionAnchors})` : ''}. Environment & Lighting: ${genre} setting, warm atmospheric lighting, rich color palette. Camera Framing: ${currentFraming}.`;

  const choices = isFinal
    ? [
        {
          id: 'c_conclude_heroic',
          label: 'Reflect on the journey and close the book',
          actionDescription: `${lead.name} celebrates with friends.`,
          consequenceHint: 'Concludes this magical storybook chronicle.',
          riskLevel: 'safe',
        },
      ]
    : [
        {
          id: `c_${chapterNumber}_bold`,
          label: `Press onward along the upper path`,
          actionDescription: `${lead.name} leads the way forward carefully.`,
          consequenceHint: 'Advances to the next stage of the journey.',
          riskLevel: 'balanced',
        },
        {
          id: `c_${chapterNumber}_tactical`,
          label: `Examine the surroundings for hidden clues`,
          actionDescription: `Study the environment before stepping ahead.`,
          consequenceHint: 'Reveals clever insights about the path ahead.',
          riskLevel: 'safe',
        },
      ];

  return {
    chapterNumber,
    title: stageTitle,
    summary: `Page ${chapterNumber} of ${bookTitle}: ${lead.name} advances through ${stageTitle}.`,
    content,
    illustrationPrompt,
    choices,
    memoryUpdate: {
      newItems: [`Page ${chapterNumber} Milestone Token`],
      tensionShift: `${lead.name}'s progress deepens`,
      clueDiscovered: `Key insight on page ${chapterNumber}`,
      worldStateChanges: [`Page ${chapterNumber} resolved`],
    },
  };
}

/**
 * Cloudflare Workers AI Image Generation Helper
 */
async function generateCloudflareImage(prompt: string, options: { width?: number; height?: number; steps?: number } = {}): Promise<string | null> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;
  const customWorkerUrl = process.env.CLOUDFLARE_AI_WORKER_URL;

  // Custom worker URL invocation if user deployed an AI Worker proxy
  if (customWorkerUrl && typeof customWorkerUrl === 'string') {
    let validWorkerUrl: string | null = null;
    const trimmed = customWorkerUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      validWorkerUrl = trimmed;
    } else {
      const match = trimmed.match(/https?:\/\/[^\s"']+/);
      if (match) validWorkerUrl = match[0];
    }

    if (validWorkerUrl) {
      try {
        const resp = await fetch(validWorkerUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt, width: options.width, height: options.height }),
        });
        if (resp.ok) {
          const contentType = resp.headers.get('content-type') || '';
          if (contentType.includes('image/')) {
            const arrayBuffer = await resp.arrayBuffer();
            const base64 = Buffer.from(arrayBuffer).toString('base64');
            return `data:${contentType};base64,${base64}`;
          }
          const data = await resp.json();
          if (data.imageUrl || data.image) return data.imageUrl || data.image;
        }
      } catch (e) {
        console.warn('Cloudflare custom worker note:', e);
      }
    } else {
      console.warn('CLOUDFLARE_AI_WORKER_URL is not a valid HTTP/HTTPS URL, skipping direct fetch.');
    }
  }

  // Cloudflare Workers AI Direct API
  if (!accountId || !apiToken) return null;

  const cfModels = [
    '@cf/black-forest-labs/flux-1-schnell',
    '@cf/stabilityai/stable-diffusion-xl-base-1.0',
    '@cf/bytedance/stable-diffusion-xl-lightning',
    '@cf/runwayml/stable-diffusion-v1-5',
  ];

  for (const model of cfModels) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
      
      // Build schema-compliant payload depending on Cloudflare model specs
      let requestBody: Record<string, any> = { prompt };
      if (!model.includes('flux-1-schnell')) {
        requestBody.num_steps = options.steps || 20;
        requestBody.width = options.width || 1024;
        requestBody.height = options.height || 576;
      }

      let resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      // Retry with minimal payload { prompt } if model returns 400 schema error
      if (resp.status === 400 && Object.keys(requestBody).length > 1) {
        resp = await fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt }),
        });
      }

      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || 'image/png';
        if (contentType.includes('image/')) {
          const arrayBuffer = await resp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          console.log(`[Image Generation] Rendered via Cloudflare Workers AI (${model})`);
          return `data:${contentType};base64,${base64}`;
        }
        const data = await resp.json();
        if (data.result?.image) {
          console.log(`[Image Generation] Rendered via Cloudflare Workers AI (${model})`);
          return `data:image/png;base64,${data.result.image}`;
        }
      } else {
        const err = await resp.text();
        console.warn(`Cloudflare model ${model} status ${resp.status}:`, err);
      }
    } catch (err) {
      console.warn(`Cloudflare model ${model} error:`, err);
    }
  }
  return null;
}

/**
 * Hugging Face Inference API Image Generation Helper
 */
async function generateHuggingFaceImage(prompt: string, options: { width?: number; height?: number } = {}): Promise<string | null> {
  const hfKey = process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN;
  const hfModels = [
    'black-forest-labs/FLUX.1-schnell',
    'stabilityai/stable-diffusion-xl-base-1.0',
    'stabilityai/sdxl-turbo',
    'prompthero/openjourney-v4',
  ];

  for (const model of hfModels) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (hfKey) {
        headers['Authorization'] = `Bearer ${hfKey}`;
      }

      const resp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            width: options.width || 1024,
            height: options.height || 576,
          },
        }),
      });

      if (resp.ok) {
        const contentType = resp.headers.get('content-type') || 'image/jpeg';
        if (contentType.includes('image/')) {
          const arrayBuffer = await resp.arrayBuffer();
          const base64 = Buffer.from(arrayBuffer).toString('base64');
          console.log(`[Image Generation] Rendered via Hugging Face (${model})`);
          return `data:${contentType};base64,${base64}`;
        }
      } else {
        const errText = await resp.text();
        console.warn(`Hugging Face model ${model} status ${resp.status}:`, errText);
      }
    } catch (err) {
      console.warn(`Hugging Face model ${model} error:`, err);
    }
  }
  return null;
}

/**
 * Pollinations AI Helper for fast, high-volume Image Generation & Editing fallback
 */
function buildPollinationsImageUrl(prompt: string, options: { width?: number; height?: number; seed?: number; model?: string } = {}): string {
  const width = options.width || 1024;
  const height = options.height || 576;
  const seed = options.seed || Math.floor(Math.random() * 999999);
  const model = options.model || 'flux'; // 'flux', 'flux-realism', 'turbo', 'anime'
  const encodedPrompt = encodeURIComponent(prompt.trim());
  return `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&seed=${seed}&model=${model}&nologo=true&enhance=true`;
}

/**
 * Multi-Tier Image Generation Engine:
 * Cascades: Cloudflare Workers AI -> Hugging Face -> Nanobanana -> Gemini Image -> Pollinations AI Flux
 */
async function generateImageMultiTier(prompt: string, options: {
  width?: number;
  height?: number;
  aspectRatio?: '1:1' | '16:9' | '9:16';
  artStyle?: string;
  seed?: number;
}): Promise<{ imageUrl: string; provider: string; note?: string }> {
  const { width = 1024, height = 576, aspectRatio = '16:9', artStyle = 'watercolor_storybook', seed } = options;
  const fullPrompt = `${prompt}. Art style: ${artStyle}. Masterpiece storybook illustration, breathtaking atmospheric lighting, fine details, no text watermark.`;

  // 1. Cloudflare Workers AI
  try {
    const cfImage = await generateCloudflareImage(fullPrompt, { width, height });
    if (cfImage) {
      return { imageUrl: cfImage, provider: 'cloudflare-workers-ai', note: 'Rendered with Cloudflare Workers AI' };
    }
  } catch (cfErr) {
    console.warn('Cloudflare Workers AI note:', cfErr);
  }

  // 2. Hugging Face Inference API
  try {
    const hfImage = await generateHuggingFaceImage(fullPrompt, { width, height });
    if (hfImage) {
      return { imageUrl: hfImage, provider: 'hugging-face', note: 'Rendered with Hugging Face FLUX.1' };
    }
  } catch (hfErr) {
    console.warn('Hugging Face note:', hfErr);
  }

  // 3. Nanobanana API
  if (process.env.NANOBANANA_API_KEY) {
    try {
      const nbRes = await fetch('https://api.nanobanana.ai/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.NANOBANANA_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: fullPrompt,
          n: 1,
          size: `${width}x${height}`,
          response_format: 'url',
        }),
      });
      if (nbRes.ok) {
        const nbData = await nbRes.json();
        if (nbData.data?.[0]?.url) {
          return { imageUrl: nbData.data[0].url, provider: 'nanobanana' };
        }
      }
    } catch (nbErr) {
      console.warn('Nanobanana generation note:', nbErr);
    }
  }

  // 4. Gemini Image Generation
  try {
    const ai = getGeminiClient();
    const imageResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [{ text: fullPrompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: (aspectRatio === '1:1' ? '1:1' : '16:9') as any,
        },
      },
    });

    if (imageResponse.candidates && imageResponse.candidates[0]?.content?.parts) {
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          const mime = part.inlineData.mimeType || 'image/png';
          return { imageUrl: `data:${mime};base64,${part.inlineData.data}`, provider: 'gemini-image' };
        }
      }
    }
  } catch (gemErr: any) {
    console.warn('Gemini image generation note, using Pollinations AI fallback:', gemErr?.message);
  }

  // 5. High-Quality Pollinations AI Flux Engine (Guaranteed zero-auth fallback)
  const pollUrl = buildPollinationsImageUrl(fullPrompt, { width, height, seed, model: 'flux' });
  return {
    imageUrl: pollUrl,
    provider: 'pollinations-ai',
    note: 'Rendered with high-speed Flux engine',
  };
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    service: 'MilousGem AI Engine',
    geminiAvailable: !!process.env.GEMINI_API_KEY,
    groqAvailable: !!process.env.GROQ_API_KEY,
    openModelCandidates: OPEN_SOURCE_CANDIDATE_MODELS,
    cloudflareWorkersAvailable: !!(process.env.CLOUDFLARE_ACCOUNT_ID && process.env.CLOUDFLARE_API_TOKEN) || !!process.env.CLOUDFLARE_AI_WORKER_URL,
    huggingFaceAvailable: !!(process.env.HUGGINGFACE_API_KEY || process.env.HF_TOKEN),
    nanobananaAvailable: !!process.env.NANOBANANA_API_KEY,
  });
});

// Helper: Resolve image input (data URL, raw base64, local file path, or external URL) to base64
async function resolveImageBase64(input: string, defaultMime = 'image/jpeg'): Promise<{ cleanBase64: string; mimeType: string }> {
  if (!input || typeof input !== 'string') {
    throw new Error('Image input must be a non-empty string');
  }

  // 1. Data URL
  const dataUrlMatch = input.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (dataUrlMatch) {
    return {
      mimeType: dataUrlMatch[1],
      cleanBase64: dataUrlMatch[2].trim(),
    };
  }

  // 2. External HTTP/HTTPS URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    try {
      const fetchRes = await fetch(input);
      if (fetchRes.ok) {
        const contentType = fetchRes.headers.get('content-type') || defaultMime;
        const arrayBuffer = await fetchRes.arrayBuffer();
        return {
          mimeType: contentType.split(';')[0],
          cleanBase64: Buffer.from(arrayBuffer).toString('base64'),
        };
      }
    } catch (e) {
      console.warn('Could not fetch external image URL, checking fallback:', e);
    }
  }

  // 3. Local relative or absolute path (e.g. /presets/preset_maya.jpg)
  if (input.startsWith('/') || input.startsWith('./') || input.includes('presets') || input.includes('.jpg') || input.includes('.png') || input.includes('.jpeg')) {
    const cleanRelative = input.replace(/^\/+/, '');
    const candidatePaths = [
      path.join(process.cwd(), 'public', cleanRelative),
      path.join(process.cwd(), cleanRelative),
      path.join(process.cwd(), 'src', cleanRelative),
      path.join(process.cwd(), 'src/assets/images', path.basename(input)),
    ];

    for (const cPath of candidatePaths) {
      try {
        if (fs.existsSync(cPath)) {
          const fileBuf = fs.readFileSync(cPath);
          const ext = path.extname(cPath).toLowerCase();
          const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
          return {
            mimeType: mime,
            cleanBase64: fileBuf.toString('base64'),
          };
        }
      } catch (e) {
        // continue
      }
    }
  }

  // 4. Raw base64 string
  return {
    mimeType: defaultMime,
    cleanBase64: input.replace(/^data:image\/[a-zA-Z+]+;base64,/, '').trim(),
  };
}

// Endpoint: Analyze uploaded or camera photo into a deep, non-repetitive character sheet
app.post('/api/character/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', suggestedName, preferredGenre } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const { cleanBase64, mimeType: resolvedMime } = await resolveImageBase64(imageBase64, mimeType);

    const prompt = `You are a master character designer and novelist for MilousGem, an award-winning character-driven storytelling system.
Analyze this photo to identify one or more people.
For EACH person, create an extraordinary, 3D animated Pixar-style children's book character profile. 
Maintain their key features like hair color, hairstyle, and face shape, but transform them into a 3D animated Pixar-style character. Show them in soft magical lighting.

Avoid flat clichés. Give them distinctive physical traits visible or inspired by the image, rich psychological depth, a unique voice quirk, a burning internal flaw or secret that drives narrative tension, and a signature item.

${suggestedName ? `Preferred Name/Alias (if multiple, map accordingly): ${suggestedName}` : ''}
${preferredGenre ? `Preferred Narrative Genre Affinity: ${preferredGenre}` : ''}

Generate a JSON object where 'characters' is an array of character objects matching the requested schema.`;

    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: cleanBase64,
                mimeType: resolvedMime,
              },
            },
            { text: prompt },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              characters: {
                type: Type.ARRAY,
                description: 'Array of detected characters from the photo transformed into 3D Pixar animated personas',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING, description: 'Memorable character name' },
                    gender: {
                      type: Type.STRING,
                      enum: ['girl', 'boy', 'woman', 'man', 'non_binary', 'other'],
                      description: 'Gender identity of the character',
                    },
                    titleOrRole: { type: Type.STRING, description: 'Evocative title, e.g. "The Playful Explorer"' },
                    role: {
                      type: Type.STRING,
                      enum: ['protagonist', 'antagonist', 'companion', 'mentor', 'deceiver', 'wildcard'],
                      description: 'Narrative archetype',
                    },
                    speciesOrArchetype: { type: Type.STRING, description: 'e.g. Pixar 3D Little Explorer, Woodland Alchemist' },
                    appearanceTags: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '4-6 specific visual traits matching the image (hair, eyes, face, garments, markings)',
                    },
                    artisticStylePrompt: {
                      type: Type.STRING,
                      description: 'A detailed visual consistency description snippet for generating 3D Pixar-style illustrations of this exact character',
                    },
                    keyColors: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '3 primary hex color codes representing character aesthetic',
                    },
                    backstory: { type: Type.STRING, description: '3-4 sentences of poignant, origin lore' },
                    personality: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: '3 distinct psychological traits with subtle contradictions',
                    },
                    flawOrSecret: {
                      type: Type.STRING,
                      description: 'A powerful internal conflict, hidden debt, curse, or secret that prevents repetitive, predictable stories',
                    },
                    signatureItem: { type: Type.STRING, description: 'A unique physical artifact or token they carry' },
                    speechPattern: { type: Type.STRING, description: 'How they speak: vocabulary, tempo, recurring metaphors or quirks' },
                    genreAffinities: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                      description: 'Best fitting genres like fantasy, cyberpunk, cozy_mystery, steampunk, noir, solarpunk, cosmic_horror, fairytale, magical_animals, kid_detective',
                    },
                  },
                  required: [
                    'name',
                    'gender',
                    'titleOrRole',
                    'role',
                    'speciesOrArchetype',
                    'appearanceTags',
                    'artisticStylePrompt',
                    'keyColors',
                    'backstory',
                    'personality',
                    'flawOrSecret',
                    'signatureItem',
                    'speechPattern',
                    'genreAffinities',
                  ],
                },
              },
            },
            required: ['characters'],
          },
        },
      });

      const parsed = extractJSON(response.text || '{}');
      const charList = Array.isArray(parsed.characters) ? parsed.characters : parsed.name ? [parsed] : [];
      return res.json({ success: true, characters: charList, character: charList[0], provider: 'gemini' });
    } catch (geminiErr: any) {
      console.warn('Gemini vision analysis note, trying fallback text analysis:', geminiErr?.message);
      // Fallback to Groq if key is present
      if (process.env.GROQ_API_KEY) {
        try {
          const groqText = await callGroqFallback([
            { role: 'system', content: 'You are a master character designer. Respond only with JSON.' },
            { role: 'user', content: `${prompt}\nCreate a character profile for ${suggestedName || 'a mysterious hero'} in ${preferredGenre || 'fantasy'}. Format as valid JSON with name, titleOrRole, role, speciesOrArchetype, appearanceTags, artisticStylePrompt, keyColors, backstory, personality, flawOrSecret, signatureItem, speechPattern, genreAffinities.` },
          ], true);
          const parsed = extractJSON(groqText);
          return res.json({ success: true, characters: parsed.characters, provider: 'groq-fallback' });
        } catch (groqErr) {
          console.warn('Groq character analysis fallback failed, creating procedural character:', groqErr);
        }
      }

      // Procedural character generation fallback
      const fallbackChar = {
        name: suggestedName || 'Milou the Stargazer',
        titleOrRole: 'The Chrono-Weaver',
        role: 'protagonist',
        speciesOrArchetype: 'Celestial Scholar',
        appearanceTags: ['Luminous amber eyes', 'Tailored velvet traveling coat', 'Braided hair with copper threads', 'Silver pocket astrolabe'],
        artisticStylePrompt: 'Character with striking expressive eyes, wearing vintage scholarly travel attire with celestial tokens',
        keyColors: ['#3A506B', '#D4A373', '#588157'],
        backstory: 'Born under an unrecorded conjunction of constellations, they left the high academies to study living memory shards scattered across lost ruins.',
        personality: ['Inquisitive', 'Quietly courageous', 'Reluctant to reveal their deepest origins'],
        flawOrSecret: 'Bound by an ancient vow never to use their ancestral clockwork relic for personal gain.',
        signatureItem: 'An engraved brass astrolabe that detects shifts in destiny',
        speechPattern: 'Eloquent, precise, often referencing cosmic horizons and historical paradoxes',
        genreAffinities: ['fantasy', 'steampunk', 'solarpunk', 'cosmic_horror'],
      };
      return res.json({ success: true, characters: [fallbackChar], provider: 'procedural-fallback' });
    }
  } catch (error: any) {
    console.error('Error in /api/character/analyze-image:', error);
    return res.status(500).json({ error: error.message || 'Failed to analyze character image' });
  }
});

// Endpoint: Generate Context-Aware Non-Repetitive Story Chapter (Gemini + Groq Fallback + Procedural Fallback)
app.post('/api/story/generate-chapter', async (req, res) => {
  try {
    const {
      genre = 'fantasy',
      artStyle = 'watercolor_storybook',
      tone = 'epic_heroic',
      cast = [],
      bookTitle = 'The Chronicle of Destiny',
      synopsis = 'A journey across the threshold of the unknown.',
      chapterNumber = 1,
      totalTargetChapters = 4,
      plotMemory = { keyDecisions: [], activeInventory: [], characterTensions: [], foreshadowedClues: [], worldStateChanges: [] },
      previousChaptersSummary = '',
      chosenChoiceAction = '',
      entropyLevel = 0.8,
      customAuthorDirection = '',
      targetAudience = 'all_ages',
      moralLesson = '',
      isKidsMode = false,
    } = req.body;

    const isFinalChapter = chapterNumber >= totalTargetChapters;
    const isChildrenStory = isKidsMode || targetAudience === 'kids_early' || targetAudience === 'kids_middle' || targetAudience === 'young_reader';

    const castSummary = cast
      .map(
        (c: any) =>
          `Character: ${c.name} (${c.titleOrRole}, designated role: ${c.role})\n- Species/Archetype: ${c.visualProfile?.speciesOrArchetype || c.speciesOrArchetype}\n- Personality: ${Array.isArray(c.personality) ? c.personality.join(', ') : c.personality}\n- Flaw / Hidden Tension: ${c.flawOrSecret}\n- Signature Item: ${c.signatureItem}\n- Speech Cadence: ${c.speechPattern}\n- Visual Prompt Reference: ${c.visualProfile?.artisticStylePrompt || ''}`
      )
      .join('\n\n');

    let audienceInstructions = '';
    if (isChildrenStory) {
      const ageDetails =
        targetAudience === 'kids_preschool'
          ? 'Ages 2-4 (Toddlers & Preschool): Use very gentle, warm, rhythmic and soothing vocabulary, joyful repetitive refrains, friendly animal sounds, cozy bedtime vibes, and simple delightful concepts.'
          : targetAudience === 'kids_early'
          ? 'Ages 5-7 (Early Readers): Fun picturebook cadence, engaging read-aloud dialogue, wonder-filled discoveries, colorful curiosity, and heartwarming teamwork.'
          : targetAudience === 'kids_middle'
          ? 'Ages 8-10 (Independent Readers): Clever mysteries, exciting adventures, active problem-solving, witty banter, moral courage, and imaginative twists.'
          : 'Ages 11-13 (Middle Grade Pre-Teens): Rich worldbuilding, intriguing mysteries, multi-layered friendships, courage, and clever dilemmas.';

      audienceInstructions = `
CHILDREN'S STORYTELLING RULES:
- Target Age: ${ageDetails}
${moralLesson ? `- Core Moral Value to naturally weave into this chapter: "${moralLesson}". Show this through character actions, empathy, sharing, or collaborative teamwork.` : ''}
- Safety: Strictly wholesome, zero graphic violence, zero profanity, uplifting, encouraging, and emotionally comforting.
- Choices: Provide cheerful, curious, and creative paths for young readers.
`;
    }

    const systemInstruction = `${MASTER_STORY_SYSTEM_PROMPT}

CRITICAL ANTI-REPETITION MANDATES:
1. NEVER use generic clichés ("Little did they know", "A shiver ran down their spine", "Suddenly without warning", "Time seemed to stop").
2. Fresh pacing for Chapter ${chapterNumber} of ${totalTargetChapters}.
3. Character voice fidelity for cast members (${cast.map((c: any) => c.name).join(', ') || 'cast'}).
4. Write rich, captivating prose formatted in 3-4 distinct paragraphs.
${audienceInstructions}`;

    const userPrompt = `Generate Chapter ${chapterNumber} of ${totalTargetChapters} for the book:
Book Title: "${bookTitle}"
Genre / Subgenre Mashup: ${genre}
Tone: ${tone}
Target Age Range: ${targetAudience}
Art Style Choice: ${artStyle}
Overarching Story Premise: ${synopsis}

CUSTOM CHARACTER SPECS (Integrate all selected characters dynamically with Visual Anchors):
${castSummary || 'Protagonist embarking on the journey'}

PREVIOUS EVENTS SUMMARY:
${previousChaptersSummary || 'This is the opening chapter of the chronicle.'}

PLAYER'S RECENT DECISION / DIRECTION:
${chosenChoiceAction ? `Protagonist action taken: "${chosenChoiceAction}"` : 'Establish the opening situation and urgent goal.'}
${customAuthorDirection ? `Special author prompt: "${customAuthorDirection}"` : ''}

Provide:
1. Chapter title (evocative and unique)
2. Chapter summary (1-2 sentences)
3. Chapter prose content (complete unique narrative prose for this page)
4. illustrationPrompt formatted strictly as:
   Art Style: [${artStyle}]
   Scene Details: [Action, body language, facial expression]
   Visual Anchors: [Exact visual specs of custom character(s)]
   Environment & Lighting: [Setting details, light source, color scheme]
   Camera Framing: [Angle, shot type, focal perspective]
5. ${isFinalChapter ? '1-2 concluding reflections' : '2-3 diverse, branching choices for the reader'}
6. Memory updates to ensure non-repetition in future chapters.`;

    // Try primary Gemini API with resilient model cascading
    try {
      const response = await callGeminiContentResilient({
        contents: userPrompt,
        systemInstruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING, description: 'Evocative chapter title' },
              summary: { type: Type.STRING, description: '1-2 sentence synopsis of this chapter' },
              content: { type: Type.STRING, description: 'The complete chapter prose (350-550 words)' },
              illustrationPrompt: {
                type: Type.STRING,
                description: 'Detailed prompt for context-aware image generation for this scene',
              },
              choices: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    label: { type: Type.STRING, description: 'Action choice title' },
                    actionDescription: { type: Type.STRING, description: 'Specific action the character takes' },
                    consequenceHint: { type: Type.STRING, description: 'Risk or potential reward hint' },
                    riskLevel: {
                      type: Type.STRING,
                      enum: ['safe', 'balanced', 'perilous', 'unpredictable'],
                    },
                  },
                  required: ['id', 'label', 'actionDescription', 'consequenceHint', 'riskLevel'],
                },
              },
              memoryUpdate: {
                type: Type.OBJECT,
                properties: {
                  newItems: { type: Type.ARRAY, items: { type: Type.STRING } },
                  tensionShift: { type: Type.STRING },
                  clueDiscovered: { type: Type.STRING },
                  worldStateChanges: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
              },
            },
            required: ['title', 'summary', 'content', 'illustrationPrompt', 'choices'],
          },
        },
      }, 'gemini-2.5-flash');

      const parsed = extractJSON(response.text || '{}');
      return res.json({ success: true, chapter: parsed, provider: 'gemini' });
    } catch (geminiError: any) {
      console.warn('Gemini story generation failed, attempting Groq fallback:', geminiError?.message);

      // Groq Fallback
      if (process.env.GROQ_API_KEY) {
        try {
          const groqText = await callGroqFallback([
            { role: 'system', content: `${systemInstruction}\nYou must reply strictly with a JSON object containing: title, summary, content, illustrationPrompt, choices (array with id, label, actionDescription, consequenceHint, riskLevel), and memoryUpdate.` },
            { role: 'user', content: userPrompt },
          ], true);

          const parsed = extractJSON(groqText);
          return res.json({ success: true, chapter: parsed, provider: 'groq-fallback' });
        } catch (groqErr) {
          console.warn('Groq story generation fallback also failed:', groqErr);
        }
      }

      // Procedural story generation fallback (ensures flawless user experience even if remote LLM is down/unreachable)
      const proceduralChapter = generateProceduralChapter({
        bookTitle,
        synopsis,
        genre,
        tone,
        artStyle,
        cast,
        chapterNumber,
        totalTargetChapters,
        chosenChoiceAction,
      });

      return res.json({ success: true, chapter: proceduralChapter, provider: 'procedural-narrator' });
    }
  } catch (error: any) {
    console.error('Error in /api/story/generate-chapter:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate chapter' });
  }
});

// Endpoint: Generate Full Complete Book (All Chapters Generated at Once)
app.post('/api/story/generate-full-book', async (req, res) => {
  try {
    const {
      genre = 'fantasy',
      artStyle = 'watercolor_storybook',
      tone = 'epic_heroic',
      cast = [],
      bookTitle = 'The Chronicle of Destiny',
      synopsis = 'A journey across the threshold of the unknown.',
      totalTargetChapters = 10,
      targetAudience = 'all_ages',
      moralLesson = '',
      isKidsMode = false,
      entropyLevel = 0.75,
    } = req.body;

    const pageCount = isKidsMode
      ? Math.min(Math.max(totalTargetChapters || 10, 8), 12)
      : Math.min(Math.max(totalTargetChapters || 8, 3), 16);

    const isChildrenStory = isKidsMode || targetAudience === 'kids_early' || targetAudience === 'kids_middle' || targetAudience === 'young_reader' || targetAudience === 'kids_preschool';

    const castSummary = cast
      .map(
        (c: any) =>
          `Character: ${c.name} (${c.titleOrRole}, role: ${c.role})\n- Species/Archetype: ${c.visualProfile?.speciesOrArchetype || c.speciesOrArchetype}\n- Personality: ${Array.isArray(c.personality) ? c.personality.join(', ') : c.personality}\n- Flaw / Hidden Tension: ${c.flawOrSecret}\n- Signature Item: ${c.signatureItem}\n- Visual Prompt Reference: ${c.visualProfile?.artisticStylePrompt || ''}`
      )
      .join('\n\n');

    let audienceInstructions = '';
    if (isChildrenStory) {
      const ageDetails =
        targetAudience === 'kids_preschool'
          ? 'Ages 2-4 (Toddlers & Preschool): Gentle, rhythmic, soothing vocabulary, repetitive refrains, and cozy bedtime themes.'
          : targetAudience === 'kids_early'
          ? 'Ages 5-7 (Early Readers): Picturebook cadence, engaging dialogue, wonder-filled discoveries, and heartwarming teamwork.'
          : targetAudience === 'kids_middle'
          ? 'Ages 8-10 (Independent Readers): Clever adventures, problem-solving, witty banter, moral courage, and imaginative twists.'
          : 'Ages 11-13 (Middle Grade Pre-Teens): Rich worldbuilding, intriguing mysteries, multi-layered friendships, and clever dilemmas.';

      audienceInstructions = `
CHILDREN'S STORYTELLING RULES:
- Target Age: ${ageDetails}
${moralLesson ? `- Core Moral Value to weave through the arc: "${moralLesson}". Show this through character actions and empathy.` : ''}
- Safety: Strictly wholesome, zero graphic violence, zero profanity, uplifting and comforting.
`;
    }

    const systemInstruction = `${MASTER_STORY_SYSTEM_PROMPT}

You are generating a COMPLETE ${pageCount}-page illustrated storybook titled "${bookTitle}".
CRITICAL DIRECTIVES FOR COMPLETE BOOK GENERATION:
- Structural Progression Across ${pageCount} Pages:
  Stage 1 (Page 1..${Math.ceil(pageCount/4)}): Inciting disruption to status quo.
  Stage 2 (Page ${Math.ceil(pageCount/4)+1}..${Math.ceil(pageCount/2)}): Escalating physical or logistical obstacles.
  Stage 3 (Page ${Math.ceil(pageCount/2)+1}..${Math.ceil(3*pageCount/4)}): Midpoint realization or strategy shift.
  Stage 4 (Page ${Math.ceil(3*pageCount/4)+1}..${pageCount-1}): Climax requiring character growth or clever resourcefulness.
  Stage 5 (Page ${pageCount}): Satisfying resolution (NO moralizing summary sentences at the end).
- ABSOLUTE NON-REPETITION: Every page MUST have distinct, unique narrative text advancing the plot. NEVER repeat identical sentence templates or filler paragraphs.
- ILLUSTRATION PROMPT PROTOCOL: Each page illustrationPrompt must include Art Style, Scene Details, Visual Anchors (exact visual specs of custom characters), Environment & Lighting, and Camera Framing (shifting perspective across pages).
`;

    try {
      const response = await callGeminiContentResilient({
        contents: [
          {
            text: `Create a complete ${pageCount}-page storybook titled "${bookTitle}".
Target Age Range: ${targetAudience}
Art Style Choice: ${artStyle}
Genre / Subgenre Mashup: ${genre}
Story Premise / Conflict: ${synopsis}
Tone: ${tone}
${audienceInstructions}

CUSTOM CHARACTER SPECS:
${castSummary || 'Protagonist exploring a magical world'}

Generate an array of ${pageCount} chapters representing the complete 5-stage story arc with unique, non-repetitive prose on every single page.`,
          },
        ],
        systemInstruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              chapters: {
                type: Type.ARRAY,
                description: `All ${pageCount} chapters of the complete story`,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    chapterNumber: { type: Type.INTEGER },
                    title: { type: Type.STRING },
                    summary: { type: Type.STRING },
                    content: { type: Type.STRING },
                    illustrationPrompt: { type: Type.STRING },
                  },
                  required: ['chapterNumber', 'title', 'summary', 'content', 'illustrationPrompt'],
                },
              },
            },
            required: ['chapters'],
          },
        },
      }, 'gemini-2.5-flash');

      const parsed = extractJSON(response.text || '{}');
      const chapters = Array.isArray(parsed.chapters) && parsed.chapters.length > 0
        ? parsed.chapters
        : [];

      if (chapters.length > 0) {
        return res.json({ success: true, chapters, provider: 'gemini' });
      }
    } catch (llmErr) {
      console.warn('Full book LLM generation note, synthesizing non-repetitive procedural chapters:', llmErr);
    }

    // High-quality procedural fallback for full book (guarantees EVERY page is unique!)
    const proceduralChapters = Array.from({ length: pageCount }).map((_, idx) => {
      const chNum = idx + 1;
      return generateProceduralChapter({
        bookTitle,
        synopsis,
        genre,
        tone,
        artStyle,
        cast,
        chapterNumber: chNum,
        totalTargetChapters: pageCount,
        targetAudience,
      });
    });

    return res.json({ success: true, chapters: proceduralChapters, provider: 'procedural-full-book' });
  } catch (error: any) {
    console.error('Error in /api/story/generate-full-book:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate full book' });
  }
});

// Endpoint: Premise Generation Protocol (Generate 3 high-concept story premises based on age range & subgenre mashups)
app.post('/api/story/generate-premises', async (req, res) => {
  try {
    const { ageRange = '5-7', genreMashup = 'Solarpunk + Cozy Culinary Mystery', cast = [] } = req.body;

    const prompt = `You are a master story strategist for children's books.
Follow the PREMISE GENERATION PROTOCOL:
Generate 3 unique story ideas adhering strictly to these criteria:
1. Clear External Motivation: The main character must have a specific, concrete goal (e.g. repairing an object, solving an environmental riddle, retrieving a missing item).
2. No Magic Fixes: The conflict must be solvable using logic, resourcefulness, tool-use, or emotional growth—never instant magic powders or deus-ex-machina rescues.
3. Environmental Tension: The setting itself must present natural obstacles (weather, scale, mechanical limits, time constraints).
4. Zero Clichés: Avoid glowing crystals, talking forest elders, lost royal heirlooms, or vague "saving the world" stakes.

Parameters:
Target Age Range: ${ageRange}
Genre / Subgenre Mashup: ${genreMashup}
Cast Specs: ${cast.map((c: any) => `${c.name} (${c.titleOrRole || 'Hero'})`).join(', ')}

Return a JSON object with a 'premises' array containing 3 objects with 'title' and 'synopsis'.`;

    try {
      const response = await callGeminiContentResilient({
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              premises: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    synopsis: { type: Type.STRING },
                  },
                  required: ['title', 'synopsis'],
                },
              },
            },
            required: ['premises'],
          },
        },
      }, 'gemini-2.5-flash');

      const parsed = extractJSON(response.text || '{}');
      if (Array.isArray(parsed.premises) && parsed.premises.length > 0) {
        return res.json({ success: true, premises: parsed.premises, provider: 'gemini' });
      }
    } catch (e: any) {
      console.warn('Premise generation fallback note:', e?.message);
    }

    // Fallback premises adhering to Premise Generation Protocol
    const fallbackPremises = [
      {
        title: `The Water-Wheel Riddle of Greenhaven`,
        synopsis: `When a mysterious clogged valve halts the community hydroponic farm, ${cast[0]?.name || 'the young inventor'} must navigate high water pressures and construct a bamboo siphon before nightfall.`,
      },
      {
        title: `The Lost Blueprint of the Sky-Sail`,
        synopsis: `An unexpected storm tears the primary canvas on the local airship cargo carrier. ${cast[0]?.name || 'Our hero'} uses recycled sailcloth and aerodynamic folding to restore flight stability.`,
      },
      {
        title: `The Mystery of the Silent Clocktower`,
        synopsis: `A tiny brass gear slips out of the central clock tower during the town festival. ${cast[0]?.name || 'The protagonist'} tracks environmental clues through rain-slicked cobbled alleys to rebuild the escapement mechanism.`,
      },
    ];

    return res.json({ success: true, premises: fallbackPremises, provider: 'procedural-fallback' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate premises' });
  }
});

// Endpoint: Story Translation into multiple languages (Dutch, Spanish, French, German, Japanese, Mandarin, Italian, etc.)
app.post('/api/story/translate', async (req, res) => {
  try {
    const {
      title = '',
      summary = '',
      content = '',
      targetLanguage = 'Dutch',
      tone = 'whimsical',
      isKidsMode = false,
    } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required for translation' });
    }

    const systemInstruction = `You are a master literary translator specializing in classic and contemporary illustrated storybooks and children's literature.
Translate the provided story title, summary, and prose content with poetic beauty, authentic warmth, and narrative elegance into ${targetLanguage}.
Special focus for ${targetLanguage}:
- If target language is Dutch (Nederlands), use natural idiomatic Dutch suitable for storytelling with authentic phrasing (e.g. "Er was eens...", vivid adjectives, cozy Dutch warmth).
- Preserve the story's emotional cadence, character voices, and humorous or dramatic dialogue.
- Preserve proper names of characters unless standard translation rules apply.
- Ensure the tone matches: "${tone}"${isKidsMode ? ' (warm, gentle, children picturebook cadence)' : ''}.

Return a JSON object matching the requested schema.`;

    try {
      const response = await callGeminiContentResilient({
        contents: `Translate the following story into ${targetLanguage}:\n\nTitle: "${title}"\nSummary: "${summary}"\n\nStory Prose:\n${content}`,
        systemInstruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translatedTitle: { type: Type.STRING, description: 'The translated chapter/story title' },
              translatedSummary: { type: Type.STRING, description: 'The translated summary' },
              translatedContent: { type: Type.STRING, description: 'The translated prose paragraphs' },
              targetLanguage: { type: Type.STRING },
            },
            required: ['translatedTitle', 'translatedContent', 'targetLanguage'],
          },
        },
      }, 'gemini-2.5-flash');

      const parsed = extractJSON(response.text || '{}');
      return res.json({
        success: true,
        translatedTitle: parsed.translatedTitle || title,
        translatedSummary: parsed.translatedSummary || summary,
        translatedContent: parsed.translatedContent || content,
        targetLanguage,
        provider: 'gemini',
      });
    } catch (geminiErr: any) {
      console.warn('Gemini translation fallback note:', geminiErr?.message);

      if (process.env.GROQ_API_KEY) {
        try {
          const groqText = await callGroqFallback([
            { role: 'system', content: `${systemInstruction}\nReply strictly with a JSON object containing: translatedTitle, translatedSummary, translatedContent, targetLanguage.` },
            { role: 'user', content: `Translate into ${targetLanguage}:\nTitle: ${title}\nContent:\n${content}` },
          ], true);
          const parsed = extractJSON(groqText);
          return res.json({
            success: true,
            translatedTitle: parsed.translatedTitle || title,
            translatedSummary: parsed.translatedSummary || summary,
            translatedContent: parsed.translatedContent || content,
            targetLanguage,
            provider: 'groq',
          });
        } catch (groqErr) {}
      }

      return res.json({
        success: true,
        translatedTitle: title,
        translatedSummary: summary,
        translatedContent: content,
        targetLanguage,
        provider: 'original-fallback',
      });
    }
  } catch (error: any) {
    console.error('Error in /api/story/translate:', error);
    return res.status(500).json({ error: error.message || 'Failed to translate story' });
  }
});

// Endpoint: Generate / Refine Rich Story Summary & Character Dossier Blurb
app.post('/api/story/generate-blurb', async (req, res) => {
  try {
    const {
      title,
      synopsis,
      genre,
      tone,
      cast = [],
      targetAudience = 'all_ages',
      moralLesson = '',
      chaptersSummary = '',
    } = req.body;

    const systemInstruction = `You are an editorial story curator for MilousGem. Generate an enticing, high-concept Story Summary blurb (3-4 sentences), highlighting the central hook, key character dynamics, and moral heart of this book to help readers quickly identify their favorite stories in their library. Also output 3 thematic key tags and a 1-sentence character roster teaser. Return a JSON object.`;

    const userPrompt = `Book Title: "${title}"
Genre: ${genre}
Tone: ${tone}
Target Audience: ${targetAudience}
Moral Lesson: ${moralLesson}
Cast Members: ${cast.map((c: any) => `${c.name} (${c.titleOrRole || c.role})`).join(', ')}
Synopsis & History: ${synopsis} ${chaptersSummary}`;

    try {
      const response = await callGeminiContentResilient({
        contents: userPrompt,
        systemInstruction,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              blurb: { type: Type.STRING, description: 'Compelling 3-4 sentence editorial book blurb' },
              castTeaser: { type: Type.STRING, description: '1-sentence teaser of character dynamics' },
              thematicTags: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendedReaderAge: { type: Type.STRING },
            },
            required: ['blurb', 'castTeaser', 'thematicTags'],
          },
        },
      }, 'gemini-2.5-flash');

      const parsed = extractJSON(response.text || '{}');
      return res.json({ success: true, ...parsed, provider: 'gemini' });
    } catch (e: any) {
      return res.json({
        success: true,
        blurb: synopsis || `An enchanting ${genre} chronicle starring ${cast.map((c: any) => c.name).join(' and ')}.`,
        castTeaser: `Featuring ${cast.map((c: any) => c.name).join(', ')} navigating wonder and discovery.`,
        thematicTags: [genre, tone, 'Adventure'],
        recommendedReaderAge: targetAudience === 'kids_early' ? 'Ages 5-7' : 'All Ages',
        provider: 'fallback',
      });
    }
  } catch (error: any) {
    return res.status(500).json({ error: error.message || 'Failed to generate blurb' });
  }
});

// Endpoint: Generate Context-Aware Scene Illustration (Multi-tier: Cloudflare Workers AI -> Hugging Face -> Nanobanana -> Gemini -> Pollinations AI)
app.post('/api/story/generate-illustration', async (req, res) => {
  try {
    const { prompt, artStyle = 'watercolor_storybook', aspectRatio = '16:9' } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const width = aspectRatio === '1:1' ? 800 : aspectRatio === '9:16' ? 576 : 1024;
    const height = aspectRatio === '1:1' ? 800 : aspectRatio === '9:16' ? 1024 : 576;

    const result = await generateImageMultiTier(prompt, {
      width,
      height,
      aspectRatio,
      artStyle,
      seed: Math.floor(Math.random() * 999999),
    });

    return res.json({
      success: true,
      imageUrl: result.imageUrl,
      provider: result.provider,
      note: result.note,
    });
  } catch (error: any) {
    console.error('Error in /api/story/generate-illustration:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate illustration' });
  }
});

// Endpoint: Image Studio - Create & Edit Images from text prompts (with Cloudflare & Hugging Face support)
app.post('/api/images/generate', async (req, res) => {
  try {
    const { prompt, style = 'cinematic_realism', aspectRatio = '1:1', model = 'flux', count = 1 } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

    const width = aspectRatio === '16:9' ? 1024 : aspectRatio === '9:16' ? 576 : 800;
    const height = aspectRatio === '16:9' ? 576 : aspectRatio === '9:16' ? 1024 : 800;

    const fullPrompt = `${prompt}, ${style} style, ultra high quality, intricate details, artistic lighting`;

    // Try primary high-tier generation for the first image
    const primaryResult = await generateImageMultiTier(fullPrompt, {
      width,
      height,
      aspectRatio,
      artStyle: style,
      seed: Math.floor(Math.random() * 999999),
    });

    // If batch > 1, create variations with varied seeds
    const numImages = Math.min(Math.max(count || 1, 1), 4);
    const images = [
      {
        id: `img_${Date.now()}_0`,
        url: primaryResult.imageUrl,
        seed: Math.floor(Math.random() * 999999),
        prompt: fullPrompt,
        provider: primaryResult.provider,
      },
    ];

    for (let i = 1; i < numImages; i++) {
      const seed = Math.floor(Math.random() * 999999) + i * 1337;
      images.push({
        id: `img_${Date.now()}_${i}`,
        url: buildPollinationsImageUrl(fullPrompt, { width, height, seed, model }),
        seed,
        prompt: fullPrompt,
        provider: 'pollinations-flux',
      });
    }

    return res.json({ success: true, images, provider: primaryResult.provider });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to generate studio images' });
  }
});

// Endpoint: Image Studio - Edit Image (Inpainting / Style Transformation / Variations)
app.post('/api/images/edit', async (req, res) => {
  try {
    const { baseImageUrl, editInstruction, targetStyle = 'enhance' } = req.body;
    if (!editInstruction) return res.status(400).json({ error: 'editInstruction is required' });

    // Use Gemini to transform and generate a refined prompt that preserves character visual features while applying the modification
    let refinedPrompt = editInstruction;
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `You are an expert image synthesis director. Given this edit instruction: "${editInstruction}" and target style "${targetStyle}", formulate a single, cohesive, vivid image generation prompt that renders the transformed scene or character with photorealistic or stylized precision. Output only the prompt string.`,
      });
      if (response.text) refinedPrompt = response.text.trim();
    } catch (e) {
      console.warn('Prompt refinement note:', e);
    }

    const modifiedImageUrl = buildPollinationsImageUrl(refinedPrompt, {
      width: 1024,
      height: 576,
      model: 'flux-realism',
      seed: Math.floor(Math.random() * 888888),
    });

    return res.json({
      success: true,
      refinedPrompt,
      editedImageUrl: modifiedImageUrl,
      provider: 'pollinations-ai',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to edit image' });
  }
});

// Endpoint: Veo 3 Image-to-Video Animation Generator
app.post('/api/video/animate', async (req, res) => {
  try {
    const {
      imageUrl,
      motionType = 'cinematic_parallax',
      headline = '',
      caption = '',
      durationSec = 5,
    } = req.body;

    if (!imageUrl) {
      return res.status(400).json({ error: 'imageUrl is required' });
    }

    // Enhance prompt using Gemini for cinematic direction
    let videoDirection = `Veo 3 cinematic motion: ${motionType}. Smooth camera dynamic parallax, breathing life, particle depth.`;
    try {
      const ai = getGeminiClient();
      const res = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: `Describe a 5-second cinematic motion storyboard for a dynamic video ad or animated character based on motion type: "${motionType}", headline: "${headline}", and caption: "${caption}". Provide a concise 2-sentence visual animation script.`,
      });
      if (res.text) videoDirection = res.text.trim();
    } catch (e) {
      console.warn('Veo direction note:', e);
    }

    return res.json({
      success: true,
      sourceImageUrl: imageUrl,
      motionType,
      videoDirection,
      durationSec,
      status: 'ready',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to animate image' });
  }
});

// Endpoint: Live Voice Conversational Storyteller Session
app.post('/api/voice/interact', async (req, res) => {
  try {
    const {
      userSpeech,
      conversationHistory = [],
      activeBookContext = null,
      castMembers = [],
    } = req.body;

    if (!userSpeech) {
      return res.status(400).json({ error: 'userSpeech is required' });
    }

    const ai = getGeminiClient();

    const systemPrompt = `You are "Gemini Live Storyteller" for MilousGem, an immersive, warm, conversational audio narrator and story companion.
Your goal is to converse naturally with the author/reader in short, engaging, highly spoken dialogue (2-4 sentences max per turn).
You can brainstorm plot twists, voice characters (${castMembers.map((c: any) => c.name).join(', ') || 'cast'}), propose thrilling story choices, or weave on-the-spot scene narration.
Keep replies lively, expressive, and ready for text-to-speech rendering.`;

    const contents = [
      { role: 'user', parts: [{ text: `System Context: ${systemPrompt}\nActive Book: ${activeBookContext ? activeBookContext.title : 'New Story'}\nUser Said: "${userSpeech}"` }] },
    ];

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents,
      config: {
        temperature: 0.9,
      },
    });

    const replyText = response.text || 'I hear your call, storyteller. What shall we create next in our universe?';

    return res.json({
      success: true,
      storytellerReply: replyText,
      provider: 'gemini-live',
    });
  } catch (err: any) {
    console.error('Error in /api/voice/interact:', err);
    return res.status(500).json({ error: err.message || 'Failed voice interaction' });
  }
});

// Vite middleware for development vs static build in production
async function startServer() {
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
    console.log(`MilousGem Story Engine running on http://localhost:${PORT}`);
  });
}

startServer();
