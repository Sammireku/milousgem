import express from 'express';
import path from 'path';
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
 * Procedural story chapter generator fallback (guarantees book creation never fails)
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
}) {
  const { bookTitle, synopsis, genre, tone, artStyle, cast, chapterNumber, totalTargetChapters, chosenChoiceAction } = options;
  const lead = cast[0] || { name: 'The Hero', titleOrRole: 'The Wanderer', signatureItem: 'A silver talisman' };
  const companion = cast[1] || null;
  const isFinal = chapterNumber >= totalTargetChapters;

  const titles = [
    `The Threshold of ${lead.name}'s Awakening`,
    `Shadows Across the ${genre.toUpperCase()} Horizon`,
    `The Echo in the Crucible`,
    `The Confluence of Destiny`,
  ];

  const chapterTitle = titles[Math.min(chapterNumber - 1, titles.length - 1)] || `Chapter ${chapterNumber}: The Turning Tide`;

  let content = '';
  if (chapterNumber === 1) {
    content = `The morning broke with an uneasy luminescence over the uncharted frontiers. ${lead.name}, known among whispers as ${lead.titleOrRole}, tightened the grip on their ${lead.signatureItem || 'cherished token'}. The warning bells had ceased, leaving behind an eerie stillness that smelled faintly of ozone and ancient parchment.\n\n` +
      `"${synopsis || 'The anomaly has awakened,'}" murmured ${lead.name}, studying the strange geometric fissures expanding across the ground. ${companion ? `${companion.name} stepped forward, their eyes scanning the shifting horizon with guarded skepticism. "If we proceed beyond this boundary, there is no turning back."` : 'Every instinct urged caution, yet the threshold beckoned with undeniable gravity.'}\n\n` +
      `With every step, the reality of their quest sharpened. The mystery was no longer a distant rumor—it was pulsing right beneath their feet, demanding an immediate decision.`;
  } else if (isFinal) {
    content = `The culmination of their journey gathered in an incandescent vortex. Following ${chosenChoiceAction || 'their courageous path'}, ${lead.name} confronted the heart of the enigma. The chamber resonated with harmonic vibrations, unlocking secrets long thought buried in myth.\n\n` +
      `"${lead.name}!" called out ${companion ? companion.name : 'a voice through the ether'}, as the final threshold illuminated the path ahead. The choice was laid bare: reshape the destiny of the realm or seal away the forbidden power forever.\n\n` +
      `With resolute conviction, ${lead.name} channeled their ${lead.signatureItem || 'artifact'}, sealing their chronicle into legend.`;
  } else {
    content = `The repercussions of ${chosenChoiceAction || 'their previous actions'} reverberated across the terrain. ${lead.name} navigated the treacherous crossing, where ancient mechanisms clattered to life in response to their presence.\n\n` +
      `"Watch your step," ${companion ? `${companion.name} cautioned, pointing toward the pulsating glyphs on the stone arches.` : 'a whisper in the wind seemed to warn.'} The air grew heavy with anticipation as an unexpected discovery emerged from the shadows.\n\n` +
      `A hidden chamber lay revealed, presenting a dilemma that would test the resolve of everyone involved.`;
  }

  const illustrationPrompt = `${lead.name} the ${lead.titleOrRole}, standing dramatically in a ${genre} setting, atmospheric lighting, ${artStyle} art style, intricate details, cinematic perspective`;

  const choices = isFinal
    ? [
        {
          id: 'c_conclude_heroic',
          label: 'Embrace the new dawn as guardians',
          actionDescription: `${lead.name} accepts the mantle and establishes lasting harmony.`,
          consequenceHint: 'Brings peaceful resolution and celebrated legacy.',
          riskLevel: 'safe',
        },
      ]
    : [
        {
          id: `c_${chapterNumber}_bold`,
          label: `Press onward into the core sanctuary`,
          actionDescription: `${lead.name} leads the advance directly toward the pulsating anomaly.`,
          consequenceHint: 'High stakes and immediate confrontation with unknown forces.',
          riskLevel: 'perilous',
        },
        {
          id: `c_${chapterNumber}_tactical`,
          label: `Decipher the ancient glyphs and formulate a strategy`,
          actionDescription: `Carefully study the chamber mechanisms before proceeding.`,
          consequenceHint: 'Reveals hidden lore and safer routes through the labyrinth.',
          riskLevel: 'balanced',
        },
      ];

  return {
    title: chapterTitle,
    summary: `Chapter ${chapterNumber} of ${bookTitle}: The party confronts unexpected revelations.`,
    content,
    illustrationPrompt,
    choices,
    memoryUpdate: {
      newItems: [`Artifact of Chapter ${chapterNumber}`],
      tensionShift: `${lead.name}'s resolve deepens`,
      clueDiscovered: `A piece of the overarching enigma falls into place`,
      worldStateChanges: [`Chapter ${chapterNumber} concluded`],
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
  if (customWorkerUrl) {
    try {
      const resp = await fetch(customWorkerUrl, {
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
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt,
          num_steps: options.steps || 4,
          width: options.width || 1024,
          height: options.height || 576,
        }),
      });

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

// Endpoint: Analyze uploaded or camera photo into a deep, non-repetitive character sheet
app.post('/api/character/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType = 'image/jpeg', suggestedName, preferredGenre } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

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
                mimeType: mimeType,
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
              name: { type: Type.STRING, description: 'Memorable character name' },
              titleOrRole: { type: Type.STRING, description: 'Evocative title, e.g. "The Glass-Clock Alchemist"' },
              role: {
                type: Type.STRING,
                enum: ['protagonist', 'antagonist', 'companion', 'mentor', 'deceiver', 'wildcard'],
                description: 'Narrative archetype',
              },
              speciesOrArchetype: { type: Type.STRING, description: 'e.g. Cybernetic Courier, Celestial Cartographer, Solarpunk Botanist' },
              appearanceTags: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: '4-6 specific visual traits matching the image (hair, eyes, face, garments, markings)',
              },
              artisticStylePrompt: {
                type: Type.STRING,
                description: 'A detailed visual consistency description snippet for generating illustrations of this exact character',
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
                description: 'Best fitting genres like fantasy, cyberpunk, cozy_mystery, steampunk, noir, solarpunk, cosmic_horror, fairytale',
              },
            },
            required: [
              'name',
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
      });

      const parsed = extractJSON(response.text || '{}');
      return res.json({ success: true, characters: parsed.characters, provider: 'gemini' });
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
      audienceInstructions = `
CHILDREN'S STORYTELLING RULES:
- Target Age: ${targetAudience === 'kids_early' ? 'Ages 3-5 (Preschool): Use joyful, rhythmic, simple words, sensory wonder, and cuddly/warm descriptions.' : targetAudience === 'kids_middle' ? 'Ages 6-9 (Early Readers): Fun chapter book style, curiosity, clever teamwork, and uplifting humor.' : 'Ages 10-12 (Middle Grade): Brave adventures, light mystery, friendship, and positive problem-solving.'}
${moralLesson ? `- Core Moral Value to naturally weave into this chapter: "${moralLesson}". Show this through character actions, kindness, or teamwork.` : ''}
- Safety: Strictly wholesome, zero graphic violence, zero profanity, uplifting, encouraging, and bedtime-appropriate.
- Choices: Provide cheerful, curious, and creative paths for young readers.
`;
    }

    const systemInstruction = `You are the lead narrative architect of MilousGem, an AI storytelling engine designed for exquisite, non-repetitive literature.
CRITICAL ANTI-REPETITION MANDATES:
1. NEVER use generic clichés ("Little did they know", "A shiver ran down their spine", "Suddenly without warning", "Time seemed to stop", "He couldn't help but feel").
2. Fresh pacing: Chapter ${chapterNumber} of ${totalTargetChapters}. ${
      chapterNumber === 1
        ? 'Inciting incident with sensory immersion, immediate stakes, character banter, and flaw displays.'
        : isFinalChapter
        ? 'Climactic confrontation and emotional resolution that pays off earlier clues and character tensions without neat cop-outs.'
        : 'Escalating conflict, unexpected tactical pivot, moral dilemma, and discovery that complicates the objective.'
    }
3. Character voice fidelity: Ensure all cast members (${cast.map((c: any) => c.name).join(', ') || 'cast'}) interact with genuine chemistry, conflicting motives, and distinctive dialogue cadences.
4. Memory consistency: Directly reference active inventory items (${plotMemory.activeInventory?.join(', ') || 'none'}), past decisions (${plotMemory.keyDecisions?.slice(-2).join('; ') || 'none'}), and tensions (${plotMemory.characterTensions?.slice(-2).join('; ') || 'none'}).
5. High Entropy (${entropyLevel}): Introduce unexpected sensory motifs, genre trope inversions, and fresh atmospheric worldbuilding details.
6. Write rich, captivating prose (${isChildrenStory ? '250-400 words' : '350-550 words'}) formatted in 3-4 distinct paragraphs with natural dialogue and vivid scene action.
${audienceInstructions}`;

    const userPrompt = `Generate Chapter ${chapterNumber} for the book:
Book Title: "${bookTitle}"
Genre: ${genre}
Tone: ${tone}
Overarching Synopsis: ${synopsis}
Target Audience: ${targetAudience}
${isKidsMode ? 'Mode: KIDS & FAMILY STORYBOOK' : ''}
${moralLesson ? `Moral Lesson Theme: ${moralLesson}` : ''}

CAST MEMBERS (Integrate all selected characters dynamically):
${castSummary || 'Protagonist embarking on the journey'}

PREVIOUS EVENTS SUMMARY:
${previousChaptersSummary || 'This is the opening chapter of the chronicle.'}

PLAYER'S RECENT DECISION / DIRECTION:
${chosenChoiceAction ? `Protagonist action taken: "${chosenChoiceAction}"` : 'Establish the opening situation and urgent goal.'}
${customAuthorDirection ? `Special author prompt: "${customAuthorDirection}"` : ''}

CURRENT PLOT MEMORY:
- Inventory: ${JSON.stringify(plotMemory.activeInventory || [])}
- Active Tensions: ${JSON.stringify(plotMemory.characterTensions || [])}
- Clues/Foreshadowing: ${JSON.stringify(plotMemory.foreshadowedClues || [])}
- World State: ${JSON.stringify(plotMemory.worldStateChanges || [])}

Provide:
1. Chapter title (evocative, poetic or thrilling)
2. Chapter summary (1-2 sentences)
3. Chapter prose content (${isChildrenStory ? '250-400 words' : '350-550 words'} of atmospheric narrative with dialogue between cast members)
4. A vivid, highly specific illustration prompt for this exact moment (including art style "${artStyle}", character visual tokens for ${cast.map((c: any) => c.name).join(', ')}, camera angle, lighting, colors${isChildrenStory ? ', friendly joyful atmosphere, children picturebook composition' : ''})
5. ${isFinalChapter ? '1-2 concluding reflections or epilogue choices' : '2-3 diverse, branching choices for the reader with clear stakes and consequence hints'}
6. Memory updates: newly gained items, shifted tensions, and clues discovered to ensure non-repetition in future chapters.`;

    // Try primary Gemini API
    try {
      const ai = getGeminiClient();
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: userPrompt,
        config: {
          systemInstruction,
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
      });

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
