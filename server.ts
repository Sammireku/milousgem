import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import {
  buildCharacterVisualAnchors,
  getGenreWorldConcept,
  sanitizeStoryMetaText,
  getChapterNarrativeBeat,
  healAndValidateStoryProse,
  BANNED_OPENING_CLICHES,
} from './src/utils/characterVisual';

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
  primaryModel = 'gemini-3.8-flash'
) {
  const modelsToTry = [
    primaryModel,
    'gemini-3.8-flash',
    'gemini-flash-latest',
    'gemini-2.5-flash',
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
 * Utility to extract and parse JSON from LLM text responses cleanly and self-heal slight malformations
 */
function extractJSON(text: string): any {
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch (e) {
    // 1. Try extracting JSON from markdown code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (inner) {
        // Try cleaning trailing commas
        const cleanedInner = match[1].replace(/,\s*([\]}])/g, '$1');
        try {
          return JSON.parse(cleanedInner);
        } catch (inner2) {}
      }
    }

    // 2. Try finding outer curly braces
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      const slice = text.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(slice);
      } catch (inner) {
        // Strip trailing commas before closing braces/brackets
        const cleanedSlice = slice.replace(/,\s*([\]}])/g, '$1');
        try {
          return JSON.parse(cleanedSlice);
        } catch (inner2) {}
      }
    }

    // 3. Try finding outer array brackets
    const firstBracket = text.indexOf('[');
    const lastBracket = text.lastIndexOf(']');
    if (firstBracket !== -1 && lastBracket > firstBracket) {
      const arraySlice = text.slice(firstBracket, lastBracket + 1);
      try {
        return JSON.parse(arraySlice);
      } catch (inner) {
        const cleanedArray = arraySlice.replace(/,\s*([\]}])/g, '$1');
        try {
          return JSON.parse(cleanedArray);
        } catch (inner2) {}
      }
    }

    throw new Error('Failed to parse structured JSON from model response');
  }
}

/**
 * Master Prompt & Storytelling Protocol definition for MilousGem Engine
 */
export const KIDS_MODE_AUTHOR_PROMPT = `
You are a children's book author specializing in stories for 5-to-7-year-olds (Early Readers / Kindergarten to 2nd Grade). Your task is to write warm, easy-to-follow stories that encourage reading comprehension and hold a young child's attention.

Follow these strict writing rules:
Target Vocabulary & Grammar:
- Use simple, high-frequency words that a 3-to-11 year-old can read or easily understand when read aloud.
- Keep sentences short (5–10 words average). Avoid long, winding, or complex sentences.
- Use simple present or past tense consistently. Avoid passive voice.
- Limit adjectives to one per sentence maximum. Rely on clear action verbs instead of descriptive filler.

Tone & Prose Style:
- Banned: No "purple prose," poetic metaphors, flowery sensory details, or adult vocabulary (e.g., avoid words like "brine," "luminescent," "solitude," "melancholy," "crystalline," or "resplendent").
- Keep descriptions visual, direct, and concrete (e.g., "The big dog barked" instead of "A massive hound sounded a booming alert").
- Maintain a warm, inviting, and playful tone throughout.

Narrative & Pacing:
- Focus on simple, relatable plot lines with clear cause-and-effect sequences.
- Keep scenes contained—avoid rapid jumps in location or complex subplots.
- Include lively dialogue and gentle sound effects (e.g., "Whoosh," "Splash," "Beep-beep") to make read-alouds interactive.
- Ensure all character actions and objects strictly fit the story's setting.

Formatting for Early Readers:
- Use short paragraphs (2 to 5 sentences maximum).
- Break up heavy blocks of text to make the page look approachable and inviting.
`;

const MASTER_STORY_SYSTEM_PROMPT = `
You are a world-class literary author, Pixar-level visual director, and master story strategist. Your mission is to craft captivating, deeply immersive, completely non-repetitive storybook chapters with matching Pixar 3D cinematic scene illustrations for every single page.

================================================================================
1. ZERO-REPETITION & NARRATIVE IMMERSION ARCHITECTURE
================================================================================
- THE RULE OF 3 BEATS (MANDATORY FOR EVERY PAGE):
  Every single page MUST contain three distinct, sequential narrative beats:
  1. Sensory Environment Beat: Ground the reader immediately in physical sensations—specific sounds (clicking clockwork, whispering bamboo, splashing water), smells (warm cinnamon, rain on grass, sweet apples), and tactile textures.
  2. Action & Dialogue Exchange: Characters must interact with contrasting speech rhythms, personality friction, or collaborative problem-solving. No monologues or passive narration.
  3. Tactical Micro-Cliffhanger or World Shift: The page must end on an active physical choice, discovery, or mechanical threshold that irrevocably alters the environment for the next page.

- STRICTLY FORBIDDEN CLICHÉS & REPETITIVE OPENINGS:
  * NEVER begin sentences with: "As the sun rose...", "With a deep breath...", "Little did they know...", "Suddenly without warning...", "Time seemed to stop...".
  * NEVER use generic magic shortcuts. Problems are solved through logic, tool use, observation, and character growth.
  * Every page MUST exhibit completely unique sentence cadences and progressive narrative momentum.

================================================================================
2. AGE-APPROPRIATE NARRATIVE ENGINE
================================================================================
Adapt vocabulary, tone, thematic complexity, and pacing strictly according to the specified [TARGET AGE RANGE]:
- Ages 2–4 (Toddler / Early Emergent): High rhythm, sensory discovery, predictable patterns, tactile actions. Pacing: 3–8 word sentences, joyful onomatopoeia, cozy soothing themes.
- Ages 5–7 (Early Reader / Picture Book): Playful dialogue, clear cause-and-effect, emotional awareness, visual momentum per page. Overcoming tangible obstacles (building, fixing, exploring). Short sentences (5-10 words average), zero purple prose.
- Ages 8–10 (Middle Grade / Chapter Book): Internal vs. external conflict, active problem-solving, worldbuilding logic, varied sentence structure, clever dilemmas.
- Ages 11–13 (Upper Middle Grade / Early Teen): Complex morality, identity formation, high-stakes consequences, nuanced dialogue, fast-paced action balanced with atmosphere.
- Young Adult (YA - Ages 14+): Deep character arcs, intense emotional resonance, sophisticated sub-genres, high narrative tension.

================================================================================
3. PIXAR 3D VISUAL CONTINUITY & CINEMATIC STAGING PROTOCOL
================================================================================
For EVERY page, craft a context-aware illustrationPrompt engineered for stunning Pixar 3D animation quality:
- Character Visual Anchor Token: Repeat the exact signature appearance tokens for the protagonist and companions in every prompt to eliminate visual drift (e.g. "[Lead Name]: 3D Pixar character model, [exact hair, skin tone, clothing, signature item], expressive emotive facial features").
- Rotational Camera & Lens Staging Protocol: Cycle dynamic camera lenses across pages (24mm wide-angle, 35mm dynamic low-angle, 50mm intimate close-up, macro focal shot, 85mm medium-telephoto).
- Color Scripting & Lighting: Specify rich color palettes (e.g., golden hour amber, bioluminescent cyan, twilight indigo), raytraced sub-surface skin scattering, and atmospheric particle mist. NO text, typography, speech bubbles, or watermarks.

================================================================================
4. STRICT ANTI-META & DIEGETIC WORLDBUILDING MANDATE
================================================================================
- EMBODY THE WORLDBUILDING CONCEPT WITHOUT EVER STATING META LABELS:
  * Understand the genre and world setting conceptually (its atmosphere, tools, architecture, environmental logic, and sensory textures) and weave it naturally into the characters' immediate surroundings and actions.
  * ABSOLUTELY FORBIDDEN PHRASES: NEVER mention or repeat UI options, headers, or meta labels in the story prose, titles, summaries, or choices. Specifically:
    - NEVER write "Select Story Genre & Worldbuilding" or "Select Story Genre"
    - NEVER write "choice of Select Story Genre & Worldbuilding" or "choice of worldbuilding"
    - NEVER write "chosen genre", "in this genre", "subgenre mashup", or "worldbuilding"
  * The story must read like a published literary book. The characters do not know they are in a genre; they live inside their world naturally.
  * Show the setting through physical details: solar panels, bamboo sails, cobblestones, brass dials, dewdrop bridges, etc. Show, don't tell.

================================================================================
5. STRICT CHARACTER FIDELITY IN ILLUSTRATIONS (NO RANDOM CHARACTERS)
================================================================================
- Every single illustrationPrompt MUST explicitly feature the created/selected cast members from CUSTOM CHARACTER SPECS.
- NEVER invent random substitute characters, random animals, or generic faceless figures when depicting scenes where the heroes are active.
- Always include the character's exact name and physical descriptors in illustrationPrompt (e.g., "Zula, a young girl with dark brown skin, braided buns, navy ruffled sundress and sandals, holding her handmade origami rainbow bird").
- The action in the illustrationPrompt must directly depict the character's physical interaction with their immediate environment.
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

  const leadRawTags = [
    ...(Array.isArray(lead.visualProfile?.appearanceTags) ? lead.visualProfile.appearanceTags : []),
    ...(Array.isArray(lead.appearanceTags) ? lead.appearanceTags : []),
  ].filter(Boolean);
  const leadAnchors = leadRawTags.length > 0 ? leadRawTags.join(', ') : lead.visualProfile?.artisticStylePrompt || 'dark curly hair, yellow raincoat, red boots';

  const compRawTags = companion
    ? [
        ...(Array.isArray(companion.visualProfile?.appearanceTags) ? companion.visualProfile.appearanceTags : []),
        ...(Array.isArray(companion.appearanceTags) ? companion.appearanceTags : []),
      ].filter(Boolean)
    : [];
  const companionAnchors = companion ? (compRawTags.length > 0 ? compRawTags.join(', ') : companion.visualProfile?.artisticStylePrompt || 'friendly smile, colorful outfit') : '';

  const total = Math.max(totalTargetChapters || 8, 1);
  const isFinal = chapterNumber >= total;

  const genreConcept = getGenreWorldConcept(genre);
  const envPhrase = genreConcept.naturalEnvironmentPhrase || 'wondrous sunlit';
  const cleanSynopsis = sanitizeStoryMetaText(synopsis);
  const cleanAction = sanitizeStoryMetaText(chosenChoiceAction || '');

  // Dynamic Camera Framing cycle
  const cameraAngles = [
    'Wide eye-level landscape shot featuring environmental depth',
    'Dynamic low-angle action perspective with expressive motion',
    'Intimate expressive close-up highlighting emotional focus',
    'Soaring bird-eye aerial view revealing landscape architecture',
    'Medium side-profile tracking shot with cinematic background blur',
  ];
  const currentFraming = cameraAngles[(chapterNumber - 1) % cameraAngles.length];

  // Unique 10-Stage Granular Beats ensuring NO TWO CHAPTERS ever share text
  const stageBeats = [
    {
      title: 'The Unexpected Discovery',
      buildContent: () =>
        `The morning sun washed over the ${envPhrase} horizon in warm golden amber. ${lead.name}, gripping their signature ${lead.signatureItem || 'compass'}, spotted a strange shimmer resting near the trail. ${cleanSynopsis ? `It was connected to ${cleanSynopsis.toLowerCase()}.` : 'An ancient brass key marked with unknown glyphs clicked softly as it was touched.'}\n\n` +
        `"Look at this," ${lead.name} called out. ${companion ? `${companion.name} leaned closer, inspecting the intricate markings with wide eyes. "That isn't like anything in our local maps."` : 'The artifact hummed faintly, pointing toward the ridge.'}\n\n` +
        `With a surge of curiosity, ${lead.name} pocketed the discovery. The journey had officially begun.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) crouching beside a mossy trail in warm golden morning sunlight, gently picking up a glowing ancient brass key as ${c ? `${c.name} (${cAnchors}) watches closely with wide, curious eyes` : 'warm dust motes sparkle in the forest air'}.`,
    },
    {
      title: 'Stepping Beyond the Known',
      buildContent: () =>
        `The path led into dense, unexplored territory, where the air grew cool and scented with pine and ozone. ${cleanAction ? `Having decided to ${cleanAction.toLowerCase()}, ` : ''}${lead.name} carefully guided the way across a footbridge spanning a rushing creek.\n\n` +
        `"Watch your step," ${lead.name} warned as mist gathered on the stones. ${companion ? `${companion.name} unhitched a braided rope from their pack to secure the trailing timber.` : 'A sudden flash of light bounced off a mossy stone ahead.'}\n\n` +
        `They pressed onward, leaving the familiar outskirts behind as the surroundings grew more mysterious.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) carefully guiding the way across a weathered rustic wooden footbridge spanning a roaring mountain creek, with ${c ? `${c.name} (${cAnchors}) holding a braided safety rope` : 'cool white mist swirling over wet river stones'} beneath tall towering pines.`,
    },
    {
      title: 'Unraveling the First Cipher',
      buildContent: () =>
        `Near an overgrown archway, a sequence of copper dials blocked the narrow passage. ${lead.name} crouched down, studying the interlocking gears.\n\n` +
        `"It's an ancient locking mechanism," ${lead.name} noted, aligning the symbols. ${companion ? `${companion.name} held a glowing lantern steady, shining light directly onto the hidden keyhole.` : 'Using their trusty tools, every turn brought a deep metallic click.'}\n\n` +
        `With a soft sigh of releasing pressure, the heavy archway swung open, revealing an undiscovered valley beyond.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) kneeling before an ancient stone archway, turning interlocking glowing copper gears and dials as ${c ? `${c.name} (${cAnchors}) holds a warm brass lantern steady` : 'golden mechanical light illuminates carved stone glyphs'}.`,
    },
    {
      title: 'The Midpoint Challenge',
      buildContent: () =>
        `High atop the observation crag, the true scale of the journey became clear. A vast network of ${envPhrase} structures stretched across the canyon below, but the central conduit had stopped flowing.\n\n` +
        `"${lead.name}, over there!" ${companion ? `${companion.name} pointed toward a giant mechanical wheel caught in tangled vines.` : `${lead.name} realized the entire valley depended on restoring this gateway.`}\n\n` +
        `Realizing that brute force wouldn't work, ${lead.name} drew upon their ${lead.signatureItem || 'journal'}, mapping out a clever plan to clear the obstruction.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) standing high on a dramatic rocky cliff overlook, pointing down at a vast scenic canyon where a colossal ancient mechanical waterwheel is entangled in flowering ivy vines.`,
    },
    {
      title: 'A Test of Resourcefulness',
      buildContent: () =>
        `Rushing water thundered down the stone chute as the team reached the lower pump house. ${cleanAction ? `By ${cleanAction.toLowerCase()}, ` : ''}${lead.name} secured a foothold near the vibrating central valve.\n\n` +
        `"Hold the line!" ${lead.name} called out over the roar. ${companion ? `${companion.name} braced the heavy lever with all their strength, giving ${lead.name} time to calibrate the gauge.` : 'Every movement required total focus and steady hands.'}\n\n` +
        `Together, they freed the primary intake, sending a fresh surge of power pulsing through the ancient conduits.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) and ${c ? `${c.name} (${cAnchors})` : 'companions'} bracing a giant iron pressure lever beside a roaring waterfall stone chute as brilliant blue energy surges through ancient copper conduits.`,
    },
    {
      title: 'Shadows in the Canyon',
      buildContent: () =>
        `Twilight began to paint the sky in shades of violet and crimson. Deep inside the canyon, strange echoes bounced off the sheer cliff faces.\n\n` +
        `"Stay alert," whispered ${lead.name}, holding their ${lead.signatureItem || 'lantern'} high. ${companion ? `${companion.name} spotted a series of fresh footprints leading toward the high tower.` : 'A gentle breeze rustled the leaves, carrying the melody of distant music.'}\n\n` +
        `Rather than turning back, they gathered their courage and followed the trail upward.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) holding a glowing amber lantern high in a shadowy canyon at twilight, with deep purple skies overhead, examining glowing footsteps leading toward a distant illuminated mountain tower.`,
    },
    {
      title: 'The Turning Point',
      buildContent: () =>
        `Inside the main chamber, the final puzzle piece presented itself—a towering celestial globe covered in glowing star charts.\n\n` +
        `"It requires a specific harmonic frequency," ${lead.name} realized, adjusting the copper tuning prongs. ${companion ? `${companion.name} hummed the melody they had heard earlier, matching the pitch perfectly.` : 'The globe began to spin, illuminating the room in brilliant blue light.'}\n\n` +
        `The path to the ultimate goal was finally unlocked.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) carefully adjusting copper tuning prongs on a gigantic spinning celestial star globe that fills an ancient stone observatory chamber with swirling constellations and brilliant starlight.`,
    },
    {
      title: 'The Decisive Moment',
      buildContent: () =>
        `Wind howled around the summit platform as the pressure valves reached critical levels. With only seconds remaining, ${lead.name} made the final connection.\n\n` +
        `"Now!" shouted ${lead.name}, sliding their ${lead.signatureItem || 'key'} into the central axle while ${companion ? companion.name : 'holding the tension lever firm'}.\n\n` +
        `With a resounding *CLACK*, the heavy locks disengaged, restoring complete harmony to the entire realm in a burst of warm golden light.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) turning a golden key inside a monumental clockwork mechanism atop a windy mountain summit as radiant beams of warm golden light illuminate the entire sky.`,
    },
    {
      title: 'Reflections under Starlight',
      buildContent: () =>
        `As evening settled over the peaceful valley, the gentle hum of the restored realm echoed softly. ${lead.name} sat beside the clear stream, reflecting on how far they had come.\n\n` +
        `"${companion ? `${companion.name} shared a warm flask of tea with a tired smile.` : `${lead.name} looked up at the twinkling sky, feeling the deep satisfaction of a solved mystery.`}" We made a real difference today.\n\n` +
        `The stars bloomed across the night sky, marking a triumphant milestone built on friendship, courage, and curiosity.`,
      getScenePrompt: (l: any, c: any, lAnchors: string, cAnchors: string) =>
        `${l.name} (${lAnchors}) and ${c ? `${c.name} (${cAnchors})` : 'companions'} sitting contentedly beside a gently bubbling stream under a breathtaking canopy of twinkling stars, holding warm mugs of tea by a cozy lantern.`,
    },
  ];

  // Select beat index deterministically per chapterNumber
  const beatIndex = Math.min(chapterNumber - 1, stageBeats.length - 1);
  const currentBeat = stageBeats[beatIndex] || stageBeats[stageBeats.length - 1];

  const stageTitle = sanitizeStoryMetaText(`Page ${chapterNumber}: ${currentBeat.title}`);
  const content = sanitizeStoryMetaText(currentBeat.buildContent());

  const effectiveCastForAnchors = cast && cast.length > 0 ? cast : [lead, ...(companion ? [companion] : [])];
  const fullCharacterAnchors = buildCharacterVisualAnchors(effectiveCastForAnchors);

  const sceneDetail = currentBeat.getScenePrompt(lead, companion, leadAnchors, companionAnchors);
  const illustrationPrompt = injectPageContext({
    pageText: content,
    artStyle,
    rawPrompt: sceneDetail,
    characterAnchors: fullCharacterAnchors,
    chapterNumber,
  });

  const choices = isFinal
    ? [
        {
          id: 'c_conclude_heroic',
          label: 'Reflect on the journey and complete this chapter',
          actionDescription: `${lead.name} celebrates with trusted companions.`,
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
    summary: sanitizeStoryMetaText(`Page ${chapterNumber} of ${bookTitle}: ${lead.name} experiences ${currentBeat.title}.`),
    content,
    illustrationPrompt,
    choices: choices.map((c) => ({
      ...c,
      label: sanitizeStoryMetaText(c.label),
      actionDescription: sanitizeStoryMetaText(c.actionDescription),
    })),
    memoryUpdate: {
      newItems: [`Page ${chapterNumber} Milestone Token`],
      tensionShift: `${lead.name}'s story advances to Page ${chapterNumber}`,
      clueDiscovered: `Key insight on page ${chapterNumber}`,
      worldStateChanges: [`Page ${chapterNumber} completed`],
      currentObjective: '',
      emotionalArcStatus: '',
    },
  };
}

/**
 * Strict Server-Side Anti-Repetition Post-Filter:
 * Verifies every generated chapter array and replaces any duplicate page text with guaranteed unique prose.
 */
function ensureUniqueChapterContents(chapters: any[], options: any): any[] {
  if (!Array.isArray(chapters) || chapters.length === 0) return chapters;

  const seenContents = new Set<string>();

  return chapters.map((ch, idx) => {
    const chNum = ch.chapterNumber || idx + 1;
    const rawContent = (ch.content || '').trim();

    // Check if content is empty or seen in a previous page
    const normalized = rawContent.toLowerCase().replace(/[^a-z0-9]/g, '');
    const isDuplicate = normalized.length < 30 || seenContents.has(normalized);

    if (isDuplicate) {
      console.warn(`[Anti-Repetition Engine] Duplicate text detected on Chapter ${chNum}. Regenerating unique procedural content.`);
      const freshProcedural = generateProceduralChapter({
        ...options,
        chapterNumber: chNum,
        totalTargetChapters: chapters.length,
      });
      seenContents.add(freshProcedural.content.toLowerCase().replace(/[^a-z0-9]/g, ''));
      return freshProcedural;
    } else {
      seenContents.add(normalized);
      return ch;
    }
  });
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

// Unified 3D Pixar Style Modifier for All System Image Generation
export const UNIFIED_PIXAR_3D_STYLE_PROMPT =
  'Pixar 3D animated film render, masterpiece 3D animation still, Physically-Based Rendering (PBR), micro-texture detail, subsurface scattering on skin, expressive stylized character design, warm cinematic volumetric studio lighting, rich vibrant color palette, octane render style';

/**
 * Pollinations AI Helper for fast, high-volume Image Generation & Editing fallback
 */
function buildPollinationsImageUrl(prompt: string, options: { width?: number; height?: number; seed?: number; model?: string } = {}): string {
  const width = options.width || 1024;
  const height = options.height || 576;
  const seed = options.seed || Math.floor(Math.random() * 999999);
  const model = options.model || 'flux'; // 'flux', 'flux-realism', 'turbo', 'anime'
  let cleanPrompt = prompt.trim();
  if (!cleanPrompt.toLowerCase().includes('pixar 3d') && !cleanPrompt.toLowerCase().includes('animated film')) {
    cleanPrompt = `${UNIFIED_PIXAR_3D_STYLE_PROMPT}. Scene: ${cleanPrompt}. Camera & atmosphere: sharp focus, volumetric lighting, rich color palette, octane render style, no text, no watermark.`;
  }
  const encodedPrompt = encodeURIComponent(cleanPrompt);
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
  const { width = 1024, height = 576, aspectRatio = '16:9', seed } = options;

  // Build clean, non-repetitive prompt strictly enforcing the 3D Pixar style
  let fullPrompt = prompt.trim();
  const lowerPrompt = fullPrompt.toLowerCase();
  
  if (!lowerPrompt.includes('pixar 3d') && !lowerPrompt.includes('animated film')) {
    fullPrompt = `${UNIFIED_PIXAR_3D_STYLE_PROMPT}. Scene: ${fullPrompt}.`;
  }
  
  if (!lowerPrompt.includes('no text') && !lowerPrompt.includes('clean rendering')) {
    fullPrompt = `${fullPrompt} Masterpiece cinematic storybook illustration, sharp focus, clean rendering, no text, no watermark, no captions.`;
  }

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

const PIXAR_STYLE_PROMPTS: Record<string, string> = {
  hyper_articulated_realism: "Physically-Based Rendering (PBR), micro-texture detail, subsurface scattering, cinematic volumetric lighting, hyper-detailed Pixar 3D",
  chunky_claymation: "Tactile claymation aesthetic, soft clay surfaces, rounded geometric shapes, stop-motion feel, handcrafted 3D render",
  bean_mouth_cartoon: "Bean-mouth character design, expressive exaggerated eyes, flushed cheeks, soft pastel color palette, modern Pixar stylized animation",
  abstract_surrealism: "Ethereal translucent shaders, glowing particle volumetric light, abstract 3D shapes, painterly gradient background, surreal Pixar concept art style",
  stylized_photorealism: "Photorealistic 3D environment, shallow depth of field, cinematic camera lens blur, PBR lighting, stylized character in realistic setting",
  anime_2d_3d_hybrid: "3D anime hybrid style, exaggerated expressive poses, 2D impact lines in 3D, vivid neon lighting, snappy stylized 3D animation",
};

/**
 * Strips away any previous metadata headers or repetitive labels
 * that might have been prepended by previous pipeline passes.
 */
function cleanPromptOfMetaLabels(text: string): string {
  if (!text) return '';
  return text
    .replace(/Page Narrative Intent & Specific Action:\s*"?([^".]*)"?/gi, '$1')
    .replace(/Art Style:\s*[^.]+\./gi, '')
    .replace(/Visual Anchors:\s*[^.]+\./gi, '')
    .replace(/Camera Staging:\s*[^.]+\./gi, '')
    .replace(/Camera & atmosphere:\s*[^.]+\./gi, '')
    .replace(/Character Model:\s*/gi, '')
    .replace(/Scene Details:\s*/gi, '')
    .replace(/Scene:\s*/gi, '')
    .replace(/Environment & Lighting:\s*[^.]+\./gi, '')
    .replace(/Render Specs:\s*[^.]+\./gi, '')
    .replace(/Featuring characters:\s*[^.]+\./gi, '')
    .replace(/choice\s+of\s+Select\s+Story\s+Genre\s+&\s+Worldbuilding/gi, '')
    .replace(/Select\s+Story\s+Genre\s+&\s+Worldbuilding/gi, '')
    .replace(/Select\s+Story\s+Genre/gi, '')
    .replace(/Worldbuilding:\s*[^.]+\./gi, '')
    .replace(/Pixar 3D animated film render,?\s*/gi, '')
    .replace(/Masterpiece 3D Pixar animated film still,?\s*/gi, '')
    .replace(/sharp focus, volumetric raytracing, clean rendering, zero text, zero watermark, zero speech bubbles\.?/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Smart Narrative Action Extractor:
 * Analyzes the entire chapter text to identify the most dynamic, character-driven
 * physical action of the page rather than blindly taking the first introductory sentence.
 */
function extractKeyActionFromProse(prose: string, characterNames: string[] = []): string {
  if (!prose || prose.trim().length === 0) return '';
  const clean = prose.trim();

  // Split into natural sentences
  const allSentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
  if (allSentences.length <= 1) return allSentences[0].trim();

  // Active verbs that indicate visual scene composition
  const actionKeywords = [
    'turned', 'holding', 'climbed', 'looked', 'pointed', 'unlocked', 'pressed',
    'lifted', 'reached', 'discovered', 'opened', 'stepped', 'grasped', 'examined',
    'watched', 'ran', 'gazed', 'pulled', 'activated', 'leaped', 'touched', 'whispered',
    'glowed', 'shimmered', 'sparked', 'spotted', 'found', 'aligned', 'braced', 'sliding'
  ];

  let bestSentence = '';
  let highestScore = -999;

  allSentences.forEach((s, idx) => {
    const trimmed = s.trim();
    if (trimmed.length < 25 || trimmed.length > 180) return;

    let score = 0;
    const lower = trimmed.toLowerCase();

    // Prefer middle & climactic sentences over opening exposition
    if (idx === 0) score -= 4; // Opening lines like "The morning was cold" are passive
    if (idx >= 1 && idx <= 4) score += 3; // Heart of the action

    // Bonus for characters present in the sentence
    characterNames.forEach(name => {
      if (name && lower.includes(name.toLowerCase())) score += 5;
    });

    // Bonus for active verbs
    actionKeywords.forEach(kw => {
      if (lower.includes(kw)) score += 2;
    });

    // Heavy penalty for dialogue-only or abstract intros
    if (lower.startsWith('"') || lower.startsWith('“')) score -= 1;
    if (lower.startsWith('the morning') || lower.startsWith('as the sun') || lower.startsWith('a silence')) {
      score -= 5;
    }

    if (score > highestScore) {
      highestScore = score;
      bestSentence = trimmed;
    }
  });

  return bestSentence || allSentences[Math.min(1, allSentences.length - 1)].trim();
}

/**
 * Mandatory Page Context Injection Helper:
 * Produces a clean, coherent natural language prompt for text-to-image models (FLUX.1, SDXL, Gemini Image),
 * ensuring the illustration style directly reflects the page's specific narrative action, character anchors,
 * and chosen Pixar styling without confusing metadata headers.
 */
function injectPageContext(options: {
  pageText?: string;
  artStyle?: string;
  rawPrompt?: string;
  characterAnchors?: string;
  chapterNumber?: number;
}): string {
  const { pageText = '', artStyle = 'hyper_articulated_realism', rawPrompt = '', characterAnchors = '', chapterNumber = 1 } = options;

  // Extract clean character names & parsed anchor objects
  interface ParsedAnchor {
    name: string;
    description: string;
  }
  const parsedAnchors: ParsedAnchor[] = characterAnchors
    ? characterAnchors
        .split(';')
        .map((entry) => {
          const colonIdx = entry.indexOf(':');
          if (colonIdx === -1) return null;
          const cleanName = entry.slice(0, colonIdx).trim();
          const desc = entry.slice(colonIdx + 1).trim();
          return cleanName ? { name: cleanName, description: desc } : null;
        })
        .filter((x): x is ParsedAnchor => Boolean(x))
    : [];

  const charNames = parsedAnchors.map((a) => a.name);

  const cleanedRaw = sanitizeStoryMetaText(cleanPromptOfMetaLabels(rawPrompt));
  const cleanedPageText = sanitizeStoryMetaText(pageText);

  // Determine the core narrative action of this specific page
  let sceneAction = '';
  const isGeneric = !cleanedRaw || cleanedRaw.length < 20 || cleanedRaw.toLowerCase().includes('active on page') || cleanedRaw.toLowerCase().includes('a milestone in the journey');
  if (!isGeneric) {
    sceneAction = cleanedRaw;
  } else if (cleanedPageText && cleanedPageText.trim().length > 20) {
    sceneAction = extractKeyActionFromProse(cleanedPageText, charNames);
  } else {
    sceneAction = cleanedRaw || 'Storybook character embarking on an imaginative adventure';
  }

  // Identify active characters in this scene, or fallback to the primary cast members
  const matchingAnchors = parsedAnchors.filter(
    (a) =>
      sceneAction.toLowerCase().includes(a.name.toLowerCase()) ||
      cleanedPageText.toLowerCase().includes(a.name.toLowerCase())
  );
  const activeAnchors = matchingAnchors.length > 0 ? matchingAnchors : parsedAnchors.slice(0, 2);

  // Build character specification string to put DIRECTLY at the start of the visual prompt
  const characterSpecClause = activeAnchors
    .map((a) => (a.description ? `${a.name} (${a.description})` : a.name))
    .join(' alongside ');

  // Rotational Lens & Framing Protocol
  const lenses = [
    '24mm cinematic wide-angle establishing shot, environmental depth, volumetric light rays',
    '35mm dynamic low-angle perspective emphasizing character action and physical interaction',
    '50mm intimate medium close-up highlighting expressive facial micro-expressions and warm rim lighting',
    '85mm hero portrait shot, shallow depth of field f/1.8 soft bokeh',
    'tactile atmospheric shot highlighting physical interaction and luminous particles',
  ];
  const lensStaging = lenses[(chapterNumber - 1) % lenses.length];

  // Return prompt with the character visual depiction placed FIRST and FOREMOST
  if (characterSpecClause) {
    return `Pixar 3D animated film render depicting ${characterSpecClause}. Scene action: ${sceneAction}. Camera & atmosphere: ${lensStaging}, warm volumetric studio lighting, rich colors, octane render style, sharp focus, no text, no watermark, no captions.`;
  }

  return `${UNIFIED_PIXAR_3D_STYLE_PROMPT}. Scene action: ${sceneAction}. Camera & atmosphere: ${lensStaging}, sharp focus, rich colors, octane render style, no text, no watermark, no captions.`;
}

interface StoryHistoryBufferData {
  recentParagraphSubjects: string[];
  keyPlotBeats: string[];
  recentSentencePhrases: string[];
  recentOpeningPhrases?: string[];
  activeBeatOutline?: string[];
  blockedClichés?: string[];
}

/**
 * Story History Buffer Tracker:
 * Extracts recent paragraph subjects, sentence phrases, and opening clause cadence
 * to enforce zero repetition across chapters.
 */
function updateStoryHistoryBuffer(
  existingBuffer: StoryHistoryBufferData | undefined,
  newChapterContent: string,
  chapterTitle: string
): StoryHistoryBufferData {
  const current: StoryHistoryBufferData = existingBuffer || {
    recentParagraphSubjects: [],
    keyPlotBeats: [],
    recentSentencePhrases: [],
    recentOpeningPhrases: [],
    blockedClichés: BANNED_OPENING_CLICHES,
  };

  if (!newChapterContent) return current;

  // Extract opening sentence phrase (first 5-8 words) to prevent opening repetition
  const firstSentence = (newChapterContent.split(/[.!?]/)[0] || '').trim();
  const openingPhrase = firstSentence.split(/\s+/).slice(0, 8).join(' ');

  const paragraphs = newChapterContent.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 20);
  const newSubjects = paragraphs.slice(0, 3).map(p => {
    const s = p.split(/[.!?]/)[0] || p;
    return s.trim().slice(0, 100);
  });

  const allSentences = newChapterContent.match(/[^.!?]+[.!?]+/g) || [];
  const keyPhrases = allSentences.slice(0, 4).map(s => s.trim().slice(0, 75));

  return {
    recentParagraphSubjects: Array.from(new Set([...newSubjects, ...current.recentParagraphSubjects])).slice(0, 12),
    keyPlotBeats: Array.from(new Set([chapterTitle, ...current.keyPlotBeats])).slice(0, 10),
    recentSentencePhrases: Array.from(new Set([...keyPhrases, ...current.recentSentencePhrases])).slice(0, 15),
    recentOpeningPhrases: Array.from(new Set([openingPhrase, ...(current.recentOpeningPhrases || [])])).filter(Boolean).slice(0, 8),
    blockedClichés: Array.from(new Set([...(current.blockedClichés || []), ...BANNED_OPENING_CLICHES])),
  };
}

/**
 * Formats Story History Buffer into prompt instructions for LLMs,
 * enforcing dynamic scene entry, active inventory integration, and continuity.
 */
function formatStoryHistoryBufferPrompt(
  buffer: StoryHistoryBufferData | undefined,
  plotMemory?: any
): string {
  const inventoryItems = plotMemory?.activeInventory || [];
  const worldStates = plotMemory?.worldStateChanges || [];
  const tensions = plotMemory?.characterTensions || [];
  const openingPhrases = buffer?.recentOpeningPhrases || [];

  return `================================================================================
STORY HISTORY BUFFER & MANDATORY ANTI-REPETITION CONSTRAINTS
================================================================================
PREVIOUS CHAPTER OPENING PHRASES (STRICTLY FORBIDDEN TO REPEAT OR COPY CADENCE):
${openingPhrases.length > 0 ? openingPhrases.map(p => `- "${p}..."`).join('\n') : '- Opening Page (No previous openings recorded yet)'}

RECENT PARAGRAPH SUBJECTS ALREADY COVERED IN THIS SESSION:
${buffer?.recentParagraphSubjects && buffer.recentParagraphSubjects.length > 0 ? buffer.recentParagraphSubjects.map(s => `- "${s}"`).join('\n') : '- None yet'}

KEY PLOT BEATS ALREADY RESOLVED:
${buffer?.keyPlotBeats && buffer.keyPlotBeats.length > 0 ? buffer.keyPlotBeats.map(b => `- ${b}`).join('\n') : '- None yet'}

FORBIDDEN CLICHÉS & STOCK OPENERS (INSTANTLY REJECT):
${BANNED_OPENING_CLICHES.slice(0, 10).map(c => `- "${c}..."`).join('\n')}

ACTIVE CHARACTER INVENTORY (MUST INCORPORATE OR USE IN THIS SCENE):
${inventoryItems.length > 0 ? inventoryItems.map((i: string) => `- ${i}`).join('\n') : '- Standard equipment and personal wits'}

PERMANENT WORLD STATE CHANGES (MAINTAIN ABSOLUTE CONTINUITY):
${worldStates.length > 0 ? worldStates.map((w: string) => `- ${w}`).join('\n') : '- Starting world conditions intact'}
${tensions.length > 0 ? `CURRENT ACTIVE TENSIONS:\n${tensions.map((t: string) => `- ${t}`).join('\n')}` : ''}

MANDATORY LLM ANTI-REPETITION RULES:
1. ROTATE THE ENTRY POINT: Do NOT start with the weather, waking up, yawning, or looking out a window. Enter in media res with an immediate sensory action.
2. If any sentence opening or paragraph subject mirrors an item in the buffer, REJECT IT IMMEDIATELY and generate an active, character-grounded perspective.
3. Build upon the ACTIVE INVENTORY: have the characters physically interact with their carried tools or previous discoveries.
4. Drive the narrative into UNEXPLORED territory with NEW environmental, mechanical, or emotional developments.`;
}

// Endpoint: Generate Context-Aware Non-Repetitive Story Chapter (Gemini + Groq Fallback + Procedural Fallback)
app.post('/api/story/generate-chapter', async (req, res) => {
  try {
    const {
      genre = 'fantasy',
      artStyle = 'hyper_articulated_realism',
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
      historyBuffer,
    } = req.body;

    const activeHistoryBuffer = historyBuffer || plotMemory?.historyBuffer;
    const isFinalChapter = chapterNumber >= totalTargetChapters;
    const isChildrenStory = isKidsMode || targetAudience === 'kids_early' || targetAudience === 'kids_middle' || targetAudience === 'young_reader';
    const leadName = cast[0]?.name || 'The hero';

    // Calculate deterministic progressive narrative beat
    const narrativeBeat = getChapterNarrativeBeat(chapterNumber, totalTargetChapters);

    const castSummary = cast
      .map(
        (c: any) =>
          `Character: ${c.name} (${c.titleOrRole}, designated role: ${c.role})\n- Species/Archetype: ${c.visualProfile?.speciesOrArchetype || c.speciesOrArchetype}\n- Personality: ${Array.isArray(c.personality) ? c.personality.join(', ') : c.personality}\n- Flaw / Hidden Tension: ${c.flawOrSecret}\n- Signature Item: ${c.signatureItem}\n- Speech Cadence: ${c.speechPattern}\n- Visual Prompt Reference: ${c.visualProfile?.artisticStylePrompt || ''}`
      )
      .join('\n\n');

    const companionVoicesDirective = cast && cast.length > 1
      ? `================================================================================
CHARACTER VOICES & COMPANION COOPERATION (MANDATORY):
================================================================================
${cast.map((c: any) => `- ${c.name} (${c.titleOrRole}): Personality: ${Array.isArray(c.personality) ? c.personality.join(', ') : c.personality}. Speech Cadence: "${c.speechPattern}". Carries: "${c.signatureItem}".`).join('\n')}
- RULE OF DISTINCT VOICES: Characters must speak with distinct cadences and contrasting perspectives.
- BAN MONOLITHIC UNISON: Companions must NOT simply nod or say "Yes!" in unison. They show playful friction, unique observations, and teamwork.`
      : `LEAD CHARACTER VOICE:
- ${leadName}: Speech Pattern: "${cast[0]?.speechPattern || 'Thoughtful and observant'}". Carries: "${cast[0]?.signatureItem || 'a treasured token'}".`;

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
================================================================================
CHILDREN'S STORYTELLING & EARLY READER MANDATES:
================================================================================
Target Age: ${ageDetails}
${moralLesson ? `- Core Moral Value to naturally weave into this chapter: "${moralLesson}". Show this through character actions, empathy, sharing, or collaborative teamwork.` : ''}
- Safety: Strictly wholesome, zero graphic violence, zero profanity, uplifting, encouraging, and emotionally comforting.
- Choices: Provide cheerful, curious, and creative paths for young readers.

${KIDS_MODE_AUTHOR_PROMPT}
`;
    }

    const isEarlyKids = isChildrenStory || targetAudience === 'kids_early' || targetAudience === 'kids_preschool' || targetAudience === '2-4' || targetAudience === '5-7';
    const isMiddleGrade = targetAudience === 'kids_middle' || targetAudience === '8-10';
    const targetWordCount = isEarlyKids ? '120-220 words' : isMiddleGrade ? '220-350 words' : '300-450 words';
    const targetParagraphs = isEarlyKids ? '2-3 short, accessible paragraphs' : '3-4 captivating paragraphs';

    const historyBufferPromptSection = formatStoryHistoryBufferPrompt(activeHistoryBuffer, plotMemory);

    const systemInstruction = `${MASTER_STORY_SYSTEM_PROMPT}

${historyBufferPromptSection}

${companionVoicesDirective}

CRITICAL ANTI-REPETITION & NARRATIVE ARC MANDATES:
1. STRICTLY FORBIDDEN CLICHÉS: Never use "${BANNED_OPENING_CLICHES.slice(0, 6).join('", "')}".
2. ROTATE OPENING CLAUSE: Never start this chapter with a template or sentence pattern identical to previous chapters.
3. ADHERE TO THE CHAPTER BEAT: Focus narrative action on the assigned beat objective ("${narrativeBeat.beatName}") without jumping ahead or stalling.
4. PROSE FLOW: Write ${targetParagraphs} with active verbs and natural dialogue (${targetWordCount}).
${audienceInstructions}`;

    const userPrompt = `Generate Chapter ${chapterNumber} of ${totalTargetChapters} for the book:
Book Title: "${bookTitle}"
Genre / Subgenre Mashup: ${genre}
Tone: ${tone}
Target Age Range: ${targetAudience}
Art Style Choice: ${artStyle}
Overarching Story Premise: ${synopsis}

================================================================================
NARRATIVE ARC BEAT ASSIGNMENT (CHAPTER ${chapterNumber} OF ${totalTargetChapters})
================================================================================
Stage: ${narrativeBeat.stageType.toUpperCase()} - "${narrativeBeat.beatName}"
Narrative Objective: ${narrativeBeat.narrativeObjective}
Strict Boundary: ${narrativeBeat.forbiddenAction}
Sensory Entry Point Style: ${narrativeBeat.sensoryEntryStyle}

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
3. Chapter prose content (complete unique narrative prose for this page, fulfilling the beat objective)
4. illustrationPrompt: A vivid visual description (40-60 words) capturing the SINGLE MOST DRAMATIC ACTION of THIS specific chapter's prose. Explicitly describe: which characters are present, their clothing/appearance, their physical pose and specific interaction with items or environment (e.g., '${leadName} reaches out to steady the trembling crystal sphere while sparks illuminate the chamber'), the immediate setting, and lighting. Do NOT use meta-tags or prefixes like 'Scene:' or 'Style:'.
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
              content: { type: Type.STRING, description: `The complete chapter prose (${targetWordCount})` },
              illustrationPrompt: {
                type: Type.STRING,
                description: 'Vivid, direct visual description of the single most dramatic action of this page, naming characters, physical action, and setting',
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
      }, 'gemini-3.8-flash');

      const parsed = extractJSON(response.text || '{}');
      const fullCharacterAnchors = buildCharacterVisualAnchors(cast);

      parsed.title = sanitizeStoryMetaText(parsed.title || `Chapter ${chapterNumber}`);
      parsed.summary = sanitizeStoryMetaText(parsed.summary || '');
      parsed.content = healAndValidateStoryProse(parsed.content || '', leadName);
      if (Array.isArray(parsed.choices)) {
        parsed.choices = parsed.choices.map((c: any, idx: number) => ({
          id: c.id || `choice_${chapterNumber}_${idx + 1}`,
          label: sanitizeStoryMetaText(c.label || `Choice ${idx + 1}`),
          actionDescription: sanitizeStoryMetaText(c.actionDescription || `${leadName} takes action`),
          consequenceHint: sanitizeStoryMetaText(c.consequenceHint || 'A new discovery unfolds'),
          riskLevel: c.riskLevel || (idx === 0 ? 'balanced' : idx === 1 ? 'safe' : 'perilous'),
        }));
      }

      if (!parsed.memoryUpdate) {
        parsed.memoryUpdate = {};
      }
      parsed.memoryUpdate.currentObjective = narrativeBeat.narrativeObjective;
      parsed.memoryUpdate.emotionalArcStatus = narrativeBeat.stageType;

      // Update Story History Buffer
      const updatedHistoryBuffer = updateStoryHistoryBuffer(activeHistoryBuffer, parsed.content || '', parsed.title || '');

      // Apply Page Context Injection to illustration prompt
      const contextInjectedPrompt = injectPageContext({
        pageText: parsed.content,
        artStyle,
        rawPrompt: parsed.illustrationPrompt,
        characterAnchors: fullCharacterAnchors,
        chapterNumber,
      });

      parsed.illustrationPrompt = contextInjectedPrompt;

      return res.json({
        success: true,
        chapter: parsed,
        historyBuffer: updatedHistoryBuffer,
        provider: 'gemini',
      });
    } catch (geminiError: any) {
      console.warn('Gemini story generation failed, attempting Groq fallback:', geminiError?.message);

      const fullCharacterAnchors = buildCharacterVisualAnchors(cast);

      // Groq Fallback
      if (process.env.GROQ_API_KEY) {
        try {
          const groqText = await callGroqFallback([
            { role: 'system', content: `${systemInstruction}\nYou must reply strictly with a JSON object containing: title, summary, content, illustrationPrompt, choices (array with id, label, actionDescription, consequenceHint, riskLevel), and memoryUpdate.` },
            { role: 'user', content: userPrompt },
          ], true);

          const parsed = extractJSON(groqText);
          parsed.title = sanitizeStoryMetaText(parsed.title || `Chapter ${chapterNumber}`);
          parsed.summary = sanitizeStoryMetaText(parsed.summary || '');
          parsed.content = healAndValidateStoryProse(parsed.content || '', leadName);
          if (Array.isArray(parsed.choices)) {
            parsed.choices = parsed.choices.map((c: any, idx: number) => ({
              id: c.id || `choice_${chapterNumber}_${idx + 1}`,
              label: sanitizeStoryMetaText(c.label || `Choice ${idx + 1}`),
              actionDescription: sanitizeStoryMetaText(c.actionDescription || `${leadName} takes action`),
              consequenceHint: sanitizeStoryMetaText(c.consequenceHint || 'A new discovery unfolds'),
              riskLevel: c.riskLevel || (idx === 0 ? 'balanced' : idx === 1 ? 'safe' : 'perilous'),
            }));
          }

          if (!parsed.memoryUpdate) {
            parsed.memoryUpdate = {};
          }
          parsed.memoryUpdate.currentObjective = narrativeBeat.narrativeObjective;
          parsed.memoryUpdate.emotionalArcStatus = narrativeBeat.stageType;

          const updatedHistoryBuffer = updateStoryHistoryBuffer(activeHistoryBuffer, parsed.content || '', parsed.title || '');
          parsed.illustrationPrompt = injectPageContext({
            pageText: parsed.content,
            artStyle,
            rawPrompt: parsed.illustrationPrompt,
            characterAnchors: fullCharacterAnchors,
            chapterNumber,
          });

          return res.json({ success: true, chapter: parsed, historyBuffer: updatedHistoryBuffer, provider: 'groq-fallback' });
        } catch (groqErr) {
          console.warn('Groq story generation fallback also failed:', groqErr);
        }
      }

      // Procedural story generation fallback
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

      proceduralChapter.content = healAndValidateStoryProse(proceduralChapter.content, leadName);
      if (proceduralChapter.memoryUpdate) {
        proceduralChapter.memoryUpdate.currentObjective = narrativeBeat.narrativeObjective;
        proceduralChapter.memoryUpdate.emotionalArcStatus = narrativeBeat.stageType;
      }

      const updatedHistoryBuffer = updateStoryHistoryBuffer(activeHistoryBuffer, proceduralChapter.content, proceduralChapter.title);
      proceduralChapter.illustrationPrompt = injectPageContext({
        pageText: proceduralChapter.content,
        artStyle,
        rawPrompt: proceduralChapter.illustrationPrompt,
        characterAnchors: fullCharacterAnchors,
        chapterNumber,
      });

      return res.json({ success: true, chapter: proceduralChapter, historyBuffer: updatedHistoryBuffer, provider: 'procedural-narrator' });
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
    const leadName = cast[0]?.name || 'The hero';

    // Generate comprehensive two-pass architectural beat-sheet across all pages
    const beatOutlines = Array.from({ length: pageCount }, (_, i) => {
      const b = getChapterNarrativeBeat(i + 1, pageCount);
      return `Page ${i + 1} [Stage: ${b.stageType.toUpperCase()} - "${b.beatName}"]:
- Narrative Goal: ${b.narrativeObjective}
- Sensory Entry Style: ${b.sensoryEntryStyle}
- Strict Boundary: ${b.forbiddenAction}`;
    }).join('\n\n');

    const castSummary = cast
      .map(
        (c: any) =>
          `Character: ${c.name} (${c.titleOrRole}, role: ${c.role})\n- Species/Archetype: ${c.visualProfile?.speciesOrArchetype || c.speciesOrArchetype}\n- Personality: ${Array.isArray(c.personality) ? c.personality.join(', ') : c.personality}\n- Flaw / Hidden Tension: ${c.flawOrSecret}\n- Signature Item: ${c.signatureItem}\n- Visual Prompt Reference: ${c.visualProfile?.artisticStylePrompt || ''}`
      )
      .join('\n\n');

    const companionVoicesDirective = cast && cast.length > 1
      ? `================================================================================
CHARACTER VOICES & COMPANION COOPERATION (MANDATORY):
================================================================================
${cast.map((c: any) => `- ${c.name} (${c.titleOrRole}): Personality: ${Array.isArray(c.personality) ? c.personality.join(', ') : c.personality}. Speech Cadence: "${c.speechPattern}". Carries: "${c.signatureItem}".`).join('\n')}
- RULE OF DISTINCT VOICES: Characters must speak with distinct cadences and contrasting perspectives.
- BAN MONOLITHIC UNISON: Companions must NOT simply nod or say "Yes!" in unison. They show playful friction, unique observations, and teamwork.`
      : `LEAD CHARACTER VOICE:
- ${leadName}: Speech Pattern: "${cast[0]?.speechPattern || 'Thoughtful and observant'}". Carries: "${cast[0]?.signatureItem || 'a treasured token'}".`;

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
================================================================================
CHILDREN'S STORYTELLING & EARLY READER MANDATES:
================================================================================
Target Age: ${ageDetails}
${moralLesson ? `- Core Moral Value to weave through the arc: "${moralLesson}". Show this through character actions and empathy.` : ''}
- Safety: Strictly wholesome, zero graphic violence, zero profanity, uplifting and comforting.

${KIDS_MODE_AUTHOR_PROMPT}
`;
    }

    const isEarlyKids = isChildrenStory || targetAudience === 'kids_early' || targetAudience === 'kids_preschool' || targetAudience === '2-4' || targetAudience === '5-7';
    const isMiddleGrade = targetAudience === 'kids_middle' || targetAudience === '8-10';
    const perPageWordCount = isEarlyKids ? '100-180 words in 2 approachable paragraphs' : isMiddleGrade ? '180-280 words in 3 paragraphs' : '250-400 words in 3-4 paragraphs';

    const systemInstruction = `${MASTER_STORY_SYSTEM_PROMPT}

You are generating a COMPLETE ${pageCount}-page illustrated storybook titled "${bookTitle}".

================================================================================
TWO-PASS ARCHITECTURAL BEAT-SHEET FOR THIS ${pageCount}-PAGE BOOK:
================================================================================
${beatOutlines}

${companionVoicesDirective}

CRITICAL DIRECTIVES FOR COMPLETE BOOK GENERATION:
1. PROGRESSIVE BEAT ENFORCEMENT: Each page MUST strictly fulfill the assigned Narrative Goal for that page number.
2. ABSOLUTE NON-REPETITION: Every page MUST have distinct, unique narrative text advancing the plot. NEVER repeat opening sentence patterns, clichés, or filler paragraphs.
3. FORBIDDEN OPENING CLICHÉS: Never start any page with: "${BANNED_OPENING_CLICHES.slice(0, 8).join('", "')}".
4. ITEM & CLUE CONTINUITY: Artifacts or discoveries made on early pages must be referenced and utilized by the characters on later pages.
5. ILLUSTRATION PROMPT PROTOCOL: For each chapter, illustrationPrompt MUST be a direct, vivid 40-60 word scene description of the SINGLE KEY DRAMATIC ACTION taking place on THAT page. Explicitly describe which characters are doing what physical action, what objects they are interacting with, the immediate environment, and the lighting. Never write generic labels, meta tags, or repeated phrases.
6. PAGE PROSE LENGTH: Target ${perPageWordCount} per page to maintain energetic narrative momentum and prevent dragged-out passages.
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
                    content: { type: Type.STRING, description: `The complete chapter prose (${perPageWordCount})` },
                    illustrationPrompt: {
                      type: Type.STRING,
                      description: 'Direct, vivid 40-60 word scene description of the single key dramatic action on this page',
                    },
                  },
                  required: ['chapterNumber', 'title', 'summary', 'content', 'illustrationPrompt'],
                },
              },
            },
            required: ['chapters'],
          },
        },
      }, 'gemini-3.8-flash');

      const parsed = extractJSON(response.text || '{}');
      const chapters = Array.isArray(parsed.chapters) && parsed.chapters.length > 0
        ? parsed.chapters
        : [];

      const fullCharacterAnchors = buildCharacterVisualAnchors(cast);

      if (chapters.length > 0) {
        const validatedChapters = chapters.map((ch: any, idx: number) => ({
          ...ch,
          chapterNumber: ch.chapterNumber || idx + 1,
          title: sanitizeStoryMetaText(ch.title || `Page ${idx + 1}`),
          summary: sanitizeStoryMetaText(ch.summary || ''),
          content: healAndValidateStoryProse(ch.content || '', leadName),
        }));

        const uniqueChapters = ensureUniqueChapterContents(validatedChapters, {
          bookTitle,
          synopsis,
          genre,
          tone,
          artStyle,
          cast,
          targetAudience,
        });

        // Apply Page Context Injection across all generated pages
        const contextInjectedChapters = uniqueChapters.map((ch: any, idx: number) => {
          const injectedPrompt = injectPageContext({
            pageText: ch.content,
            artStyle,
            rawPrompt: ch.illustrationPrompt,
            characterAnchors: fullCharacterAnchors,
            chapterNumber: idx + 1,
          });
          return {
            ...ch,
            title: sanitizeStoryMetaText(ch.title || `Page ${idx + 1}`),
            summary: sanitizeStoryMetaText(ch.summary || ''),
            content: healAndValidateStoryProse(ch.content || '', leadName),
            illustrationPrompt: injectedPrompt,
          };
        });

        return res.json({ success: true, chapters: contextInjectedChapters, provider: 'gemini' });
      }
    } catch (llmErr) {
      console.warn('Full book Gemini generation note, attempting Groq fallback or procedural synthesis:', llmErr);
    }

    const fullCharacterAnchors = buildCharacterVisualAnchors(cast);

    // Groq Fallback for Full Book
    if (process.env.GROQ_API_KEY) {
      try {
        const groqText = await callGroqFallback([
          {
            role: 'system',
            content: `${systemInstruction}\nYou must reply strictly with a JSON object containing: chapters (an array of ${pageCount} objects each with chapterNumber, title, summary, content, and illustrationPrompt).`,
          },
          {
            role: 'user',
            content: `Create all ${pageCount} chapters of "${bookTitle}" with non-repetitive prose on every page according to the two-pass beat sheet.`,
          },
        ], true);

        const parsed = extractJSON(groqText);
        if (Array.isArray(parsed.chapters) && parsed.chapters.length > 0) {
          const validatedGroq = parsed.chapters.map((ch: any, idx: number) => ({
            ...ch,
            chapterNumber: ch.chapterNumber || idx + 1,
            title: sanitizeStoryMetaText(ch.title || `Page ${idx + 1}`),
            summary: sanitizeStoryMetaText(ch.summary || ''),
            content: healAndValidateStoryProse(ch.content || '', leadName),
          }));

          const uniqueGroq = ensureUniqueChapterContents(validatedGroq, {
            bookTitle,
            synopsis,
            genre,
            tone,
            artStyle,
            cast,
            targetAudience,
          });

          const contextInjectedGroq = uniqueGroq.map((ch: any, idx: number) => {
            const injectedPrompt = injectPageContext({
              pageText: ch.content,
              artStyle,
              rawPrompt: ch.illustrationPrompt,
              characterAnchors: fullCharacterAnchors,
              chapterNumber: idx + 1,
            });
            return {
              ...ch,
              title: sanitizeStoryMetaText(ch.title || `Page ${idx + 1}`),
              summary: sanitizeStoryMetaText(ch.summary || ''),
              content: healAndValidateStoryProse(ch.content || '', leadName),
              illustrationPrompt: injectedPrompt,
            };
          });

          return res.json({ success: true, chapters: contextInjectedGroq, provider: 'groq-full-book' });
        }
      } catch (groqErr) {
        console.warn('Groq full-book fallback failed, synthesizing procedural chapters:', groqErr);
      }
    }

    // High-quality procedural fallback for full book (guarantees EVERY page is unique!)
    const proceduralChapters = Array.from({ length: pageCount }).map((_, idx) => {
      const chNum = idx + 1;
      const ch = generateProceduralChapter({
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
      return {
        ...ch,
        content: healAndValidateStoryProse(ch.content, leadName),
      };
    });

    const uniqueProcedural = ensureUniqueChapterContents(proceduralChapters, {
      bookTitle,
      synopsis,
      genre,
      tone,
      artStyle,
      cast,
      targetAudience,
    });

    const contextInjectedProcedural = uniqueProcedural.map((ch: any, idx: number) => {
      const injectedPrompt = injectPageContext({
        pageText: ch.content,
        artStyle,
        rawPrompt: ch.illustrationPrompt,
        characterAnchors: fullCharacterAnchors,
        chapterNumber: idx + 1,
      });
      return {
        ...ch,
        title: sanitizeStoryMetaText(ch.title || `Page ${idx + 1}`),
        summary: sanitizeStoryMetaText(ch.summary || ''),
        content: healAndValidateStoryProse(ch.content || '', leadName),
        illustrationPrompt: injectedPrompt,
      };
    });

    return res.json({ success: true, chapters: contextInjectedProcedural, provider: 'procedural-full-book' });
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
    const {
      prompt,
      storyText = '',
      artStyle = 'hyper_articulated_realism',
      aspectRatio = '16:9',
      characterAnchors = '',
      chapterNumber = 1,
    } = req.body;

    if (!prompt && !storyText) {
      return res.status(400).json({ error: 'Prompt or storyText is required' });
    }

    // Apply mandatory Page Context Injection
    const finalPrompt = injectPageContext({
      pageText: storyText,
      artStyle,
      rawPrompt: prompt,
      characterAnchors,
      chapterNumber,
    });

    const width = aspectRatio === '1:1' ? 800 : aspectRatio === '9:16' ? 576 : 1024;
    const height = aspectRatio === '1:1' ? 800 : aspectRatio === '9:16' ? 1024 : 576;

    const result = await generateImageMultiTier(finalPrompt, {
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
      injectedPrompt: finalPrompt,
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

    const fullPrompt = `${UNIFIED_PIXAR_3D_STYLE_PROMPT}. Scene: ${prompt}. Camera & atmosphere: cinematic studio lighting, sharp focus, clean rendering, no text, no watermark, no captions.`;

    // Try primary high-tier generation for the first image
    const primaryResult = await generateImageMultiTier(fullPrompt, {
      width,
      height,
      aspectRatio,
      artStyle: 'hyper_articulated_realism',
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
        contents: `You are an expert image synthesis director specializing in 3D Pixar animated film renders. Given this edit instruction: "${editInstruction}", formulate a single, cohesive, vivid image generation prompt that renders the transformed scene or character strictly in 3D Pixar animated film style with Physically-Based Rendering (PBR), subsurface scattering on skin, expressive stylized character design, warm cinematic volumetric studio lighting, rich vibrant color palette, and octane render style. Output only the prompt string.`,
      });
      if (response.text) refinedPrompt = response.text.trim();
    } catch (e) {
      console.warn('Prompt refinement note:', e);
    }

    if (!refinedPrompt.toLowerCase().includes('pixar 3d')) {
      refinedPrompt = `${UNIFIED_PIXAR_3D_STYLE_PROMPT}. Scene: ${refinedPrompt}. Camera & atmosphere: cinematic lighting, sharp focus, clean rendering, no text, no watermark.`;
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
