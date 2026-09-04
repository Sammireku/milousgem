import { Character } from '../types';

/**
 * Builds comprehensive, high-fidelity visual anchor tokens for cast members.
 * Guarantees that diffusion models & multimodal engines render the exact created/selected
 * characters (skin tone, hair, clothing, signature items, species/age) rather than random characters.
 */
export function buildCharacterVisualAnchors(cast: (Character | any)[]): string {
  if (!cast || !Array.isArray(cast) || cast.length === 0) {
    return 'Milo: Pixar 3D animated young boy, dark curly hair, yellow raincoat, red boots, brass compass';
  }

  return cast
    .map((c) => {
      const name = c.name || 'Hero';
      const gender = c.gender || 'other';
      const genderLabel =
        gender === 'girl'
          ? 'young girl'
          : gender === 'boy'
          ? 'young boy'
          : gender === 'woman'
          ? 'woman'
          : gender === 'man'
          ? 'man'
          : 'child';

      const archetype = c.visualProfile?.speciesOrArchetype || c.speciesOrArchetype || '';
      
      // Combine appearance tags from both potential locations (visualProfile.appearanceTags or legacy appearanceTags)
      const rawTags = [
        ...(Array.isArray(c.visualProfile?.appearanceTags) ? c.visualProfile.appearanceTags : []),
        ...(Array.isArray(c.appearanceTags) ? c.appearanceTags : []),
      ].filter(Boolean);

      const uniqueTags = Array.from(new Set(rawTags));
      const appearanceString = uniqueTags.length > 0 ? uniqueTags.join(', ') : '';

      const signatureItem = c.signatureItem ? `carrying/wearing ${c.signatureItem}` : '';
      const artisticSnippet = c.visualProfile?.artisticStylePrompt || '';

      const descriptiveElements = [
        `Pixar 3D stylized ${genderLabel}${archetype ? ` (${archetype})` : ''}`,
        appearanceString ? appearanceString : '',
        signatureItem,
        artisticSnippet && !artisticSnippet.includes(appearanceString) ? artisticSnippet : '',
      ]
        .filter(Boolean)
        .join(', ');

      return `${name}: ${descriptiveElements}`;
    })
    .join('; ');
}

/**
 * Maps genre IDs to deep conceptual worldbuilding summaries.
 * Explains the world's atmosphere, sensory texture, architecture, and technology
 * so the AI understands the setting's meaning without ever printing meta-labels.
 */
export function getGenreWorldConcept(genreId: string): {
  conceptName: string;
  worldMeaning: string;
  sensoryAtmosphere: string;
  naturalEnvironmentPhrase: string;
} {
  const cleanId = (genreId || '').toLowerCase().trim();

  switch (cleanId) {
    case 'solarpunk':
      return {
        conceptName: 'Solarpunk',
        worldMeaning:
          'An optimistic, eco-technological world where human architecture and green plant life coexist in harmony. Community gardens, solar-glass awnings, clean riverways, and sustainable inventions.',
        sensoryAtmosphere:
          'Warm sunlight filtering through vine-covered glass, sweet morning breeze, soft hum of clean solar motors, and rich garden soil.',
        naturalEnvironmentPhrase: 'sun-drenched, vine-draped canopy',
      };
    case 'silkpunk':
      return {
        conceptName: 'Silkpunk',
        worldMeaning:
          'An organic antiquity setting inspired by East Asian technology, featuring flying airships crafted from woven silk and flexible bamboo, propelled by wind currents and pressure valves.',
        sensoryAtmosphere:
          'Whispering giant bamboo groves, creaking polished timber, fluttering silk sails, and cool mountain mist.',
        naturalEnvironmentPhrase: 'misty bamboo and silk-sailed',
      };
    case 'gaslamp_fantasy':
      return {
        conceptName: 'Gaslamp Mystery',
        worldMeaning:
          'A cozy Victorian-style cobblestone realm with amber gaslight lanterns, soft alchemical workshops, brass pocket watches, and gentle harbor mysteries.',
        sensoryAtmosphere:
          'Flickering amber lantern light, clattering cobblestones, damp evening air scented with tea and rain on stone.',
        naturalEnvironmentPhrase: 'cobblestone and gaslamp-lit',
      };
    case 'arcanepunk_clockwork':
      return {
        conceptName: 'Clockwork & Steam Craft',
        worldMeaning:
          'A realm of intricate mechanical engineering, interlocking copper dials, water siphons, and polished brass gears that power hillside aqueducts and village mills.',
        sensoryAtmosphere:
          'Rhythmic clicking of precision gears, warm metallic scent of brass, hissing steam valves, and flowing river water.',
        naturalEnvironmentPhrase: 'brass clockwork and steam-carved',
      };
    case 'biopunk_ecofiction':
      return {
        conceptName: 'Living Ecosystem',
        worldMeaning:
          'A wondrous world of biological innovation where living architecture, bioluminescent flora, and gentle animal partnerships solve everyday challenges.',
        sensoryAtmosphere:
          'Glow of bioluminescent moss, sweet nectar scents, gentle rustling leaves, and soft emerald ambient lighting.',
        naturalEnvironmentPhrase: 'living green and bioluminescent',
      };
    case 'cozy_culinary_mystery':
      return {
        conceptName: 'Cozy Culinary Village',
        worldMeaning:
          'A warm, heartwarming small-town community where clues are discovered through baking, cooking, artisanal crafts, and neighborhood observation.',
        sensoryAtmosphere:
          'Freshly baked cinnamon bread, clinking porcelain tea cups, warm hearth fires, and friendly chatter.',
        naturalEnvironmentPhrase: 'sweet-scented, cozy village',
      };
    case 'maritime_adventure':
      return {
        conceptName: 'Coastal & High Seas Exploration',
        worldMeaning:
          'An ocean and archipelago setting highlighting navigation by the stars, coastal tide charts, lighthouse signaling, and sturdy sailing craft.',
        sensoryAtmosphere:
          'Salty sea spray, rhythmic ocean waves lapping against wooden hulls, wheeling seabirds, and crisp sea breezes.',
        naturalEnvironmentPhrase: 'salt-sprayed coastal',
      };
    case 'folklore_noir':
      return {
        conceptName: 'Mythological Riddle Realm',
        worldMeaning:
          'An atmospheric twilight forest of ancient stone statues, mossy arches, riddle-guarding creatures, and hidden folkloric history.',
        sensoryAtmosphere:
          'Moonlight through ancient oak branches, firefly flickers, cool mossy earth, and soft distant flute melodies.',
        naturalEnvironmentPhrase: 'moonlit, ancient riddle-guarded',
      };
    case 'micro_scale_fiction':
      return {
        conceptName: 'Micro-Scale Adventure',
        worldMeaning:
          'A delightful perspective of tiny adventurers exploring a giant natural world—navigating beneath giant clover leaves, acorn houses, and dewdrop bridges.',
        sensoryAtmosphere:
          'Gigantic dewdrops magnifying morning sunlight, towering blades of grass, and miniature wooden tools.',
        naturalEnvironmentPhrase: 'dewdrop-glistening clover',
      };
    case 'slice_of_life_twist':
      return {
        conceptName: 'Everyday Wonder',
        worldMeaning:
          'A charming neighborhood setting where ordinary daily routines turn into extraordinary, heartwarming discoveries with curious friends.',
        sensoryAtmosphere:
          'Sunny sidewalk chalk, laughter in the park, backyard treehouse adventures, and cozy afternoon snacks.',
        naturalEnvironmentPhrase: 'warm, familiar hillside',
      };
    case 'historical_retro_futurism':
      return {
        conceptName: 'Retro-Futuristic Invention',
        worldMeaning:
          'A vintage inventor world featuring copper telegraph lines, vacuum tube radios, pedal-powered flying bicycles, and whimsical workshops.',
        sensoryAtmosphere:
          'Warm amber glow of vacuum tubes, clicking telegraph keys, scent of cedar shavings, and brass bells.',
        naturalEnvironmentPhrase: 'copper-riveted retro',
      };
    case 'space_western_frontier':
      return {
        conceptName: 'Starlit Frontier',
        worldMeaning:
          'A starlit dome settlement with cozy hydroponic diners, dust-red canyon trails, and gentle exploration of peaceful new horizons.',
        sensoryAtmosphere:
          'Twinkling cosmos above transparent domes, warm greenhouse tea, and panoramic views of distant purple ringed planets.',
        naturalEnvironmentPhrase: 'crimson starlit frontier',
      };
    default:
      return {
        conceptName: 'Imaginative Storybook Setting',
        worldMeaning:
          'A vibrant, wonder-filled world of exploration, teamwork, and tactile natural discoveries.',
        sensoryAtmosphere:
          'Sunlit trails, fresh outdoor breeze, sparkling discoveries, and warm natural beauty.',
        naturalEnvironmentPhrase: 'magical sunlit',
      };
  }
}

/**
 * Thoroughly sanitizes text to remove any inadvertent leaks of UI labels,
 * specifically "Select Story Genre & Worldbuilding", "worldbuilding choice", etc.
 */
export function sanitizeStoryMetaText(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return text
    .replace(/choice\s+of\s+Select\s+Story\s+Genre\s+&\s+Worldbuilding/gi, 'setting')
    .replace(/Select\s+Story\s+Genre\s+&\s+Worldbuilding/gi, 'world')
    .replace(/Select\s+Story\s+Genre/gi, 'setting')
    .replace(/choice\s+of\s+worldbuilding/gi, 'surroundings')
    .replace(/worldbuilding\s+choice/gi, 'surroundings')
    .replace(/our\s+chosen\s+genre/gi, 'this world')
    .replace(/in\s+this\s+genre/gi, 'in this place')
    .replace(/\bworldbuilding\b/gi, 'setting')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Common opening clichés that weaken story quality and produce repetitive narrative cadence.
 */
export const BANNED_OPENING_CLICHES = [
  'as the sun rose',
  'the morning sun',
  'as morning broke',
  'the golden rays of',
  'little did they know',
  'with a surge of',
  'with a deep breath',
  'a shiver ran down',
  'suddenly, without warning',
  'suddenly without warning',
  'time seemed to stop',
  'time seemed to stand still',
  'in the heart of',
  'deep in the heart of',
  'it was a day like any other',
  'taking a step forward',
  'taking a deep breath',
  'determined to make',
  'determined to find',
  'with determination in their hearts',
  'a sudden flash of light',
];

export interface NarrativeBeatGuide {
  beatNumber: number;
  totalBeats: number;
  beatName: string;
  stageType: 'setup' | 'threshold' | 'rising_action' | 'midpoint_turn' | 'friction_teamwork' | 'climax' | 'falling_action' | 'resolution';
  narrativeObjective: string;
  forbiddenAction: string;
  sensoryEntryStyle: string;
}

/**
 * Returns a strict, progressive beat assignment for any chapter index in a book.
 * Ensures that sequential chapters never repeat the same obstacle or scene setup.
 */
export function getChapterNarrativeBeat(chapterNumber: number, totalChapters: number): NarrativeBeatGuide {
  const ch = Math.max(1, chapterNumber);
  const total = Math.max(1, totalChapters);
  const progressRatio = ch / total;

  if (ch === 1) {
    return {
      beatNumber: ch,
      totalBeats: total,
      beatName: 'The Inciting Threshold & Tangible Motivation',
      stageType: 'setup',
      narrativeObjective:
        'Ground the protagonist immediately in a tactile daily task, showcasing their signature item and a specific mechanical or environmental puzzle that sets the entire journey into motion.',
      forbiddenAction: 'Do NOT start with waking up, looking in a mirror, or general morning weather descriptions.',
      sensoryEntryStyle: 'In media res tactile action or physical task (holding, repairing, adjusting, or examining an unusual object).',
    };
  }

  if (ch === total) {
    return {
      beatNumber: ch,
      totalBeats: total,
      beatName: 'Heartwarming Resolution & Lasting Horizon',
      stageType: 'resolution',
      narrativeObjective:
        'Deliver a cozy, emotionally satisfying denouement. Show the lasting physical change in the world, celebrate the bond between companions, and look forward with wonder. No preachy moral summaries.',
      forbiddenAction: 'Do NOT introduce new enemies, sudden cliffhangers, or repeat the climactic struggle.',
      sensoryEntryStyle: 'Shared warmth, sensory satisfaction (warm tea, shared laughter, gentle river breeze, starlight glow).',
    };
  }

  if (progressRatio >= 0.75) {
    return {
      beatNumber: ch,
      totalBeats: total,
      beatName: 'The Crucible & Climactic Breakthrough',
      stageType: 'climax',
      narrativeObjective:
        'The highest tension of the book. The characters must actively use an item or clue discovered earlier in their journey, combining their distinct skills to overcome the core dilemma through wits and teamwork.',
      forbiddenAction: 'Do NOT solve the problem with sudden unearned magic or outside adult intervention.',
      sensoryEntryStyle: 'High-energy physical action or urgent dialogue callout.',
    };
  }

  if (progressRatio >= 0.55) {
    return {
      beatNumber: ch,
      totalBeats: total,
      beatName: 'Collaborative Problem-Solving & Deepening Bond',
      stageType: 'friction_teamwork',
      narrativeObjective:
        'A setback forces the characters to listen to one another. Contrasting personalities balance each other out, discovering an unexpected creative solution through genuine teamwork.',
      forbiddenAction: 'Do NOT have characters agree in passive unison or repeat previous arguments.',
      sensoryEntryStyle: 'Spirited dialogue exchange with contrasting perspectives.',
    };
  }

  if (progressRatio >= 0.4) {
    return {
      beatNumber: ch,
      totalBeats: total,
      beatName: 'The Midpoint Turn & Unforeseen Realization',
      stageType: 'midpoint_turn',
      narrativeObjective:
        'A surprising discovery turns the situation upside down. What they thought was broken or lost turns out to have a deeper purpose, requiring an adaptation in their plan.',
      forbiddenAction: 'Do NOT tread water or repeat the journey from the previous chapter.',
      sensoryEntryStyle: 'Sharp acoustic sound or sudden tactile vibration (a click, a chime, a sudden mechanical gear engaging).',
    };
  }

  return {
    beatNumber: ch,
    totalBeats: total,
    beatName: 'Rising Discovery & Stepping Across the Boundary',
    stageType: 'rising_action',
    narrativeObjective:
      'The characters navigate an unfamiliar stretch of the world. They test their tools, notice subtle clues in the environment, and encounter their first real obstacle.',
    forbiddenAction: 'Do NOT repeat the setup from Chapter 1 or delay taking physical action.',
    sensoryEntryStyle: 'Environmental sensory contrast or forward kinetic movement (climbing, paddling, adjusting sails).',
  };
}

/**
 * Self-healing prose validator & integrity repairer:
 * 1. Sanitizes meta UI leaks.
 * 2. Checks and repairs truncated sentences (ensures proper punctuation at the end).
 * 3. Balances quotation marks so dialogue never remains unclosed.
 * 4. Filters out opening clichés and replaces them with active character-driven prose.
 */
export function healAndValidateStoryProse(rawText: string, fallbackLeadName = 'The hero'): string {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = sanitizeStoryMetaText(rawText);

  // Strip accidental markdown artifacts at the edges
  cleaned = cleaned.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();

  // 1. Cliché Opener Healing
  const lower = cleaned.toLowerCase();
  for (const cliche of BANNED_OPENING_CLICHES) {
    if (lower.startsWith(cliche)) {
      // Find the end of this introductory clause (comma, period, or dash)
      const commaIdx = cleaned.indexOf(',');
      const periodIdx = cleaned.indexOf('.');
      const splitIdx = commaIdx !== -1 && commaIdx < 45 ? commaIdx : periodIdx !== -1 && periodIdx < 45 ? periodIdx : -1;

      if (splitIdx !== -1) {
        let remainder = cleaned.slice(splitIdx + 1).trim();
        // Capitalize first character of remainder
        if (remainder.length > 0) {
          remainder = remainder.charAt(0).toUpperCase() + remainder.slice(1);
          cleaned = remainder;
        }
      } else {
        // Replace with direct lead engagement
        cleaned = `${fallbackLeadName} stepped forward into the scene. ` + cleaned.slice(cliche.length).trim();
      }
      break;
    }
  }

  // 2. Truncation Repair:
  // If the text ends abruptly without sentence-ending punctuation (. ! ? " ” ')
  const lastChar = cleaned.slice(-1);
  const validPunctuation = ['.', '!', '?', '"', '”', "'", '’'];

  if (!validPunctuation.includes(lastChar)) {
    // Find the last sentence terminator
    const lastTerminatorIndex = Math.max(
      cleaned.lastIndexOf('.'),
      cleaned.lastIndexOf('!'),
      cleaned.lastIndexOf('?')
    );

    if (lastTerminatorIndex > cleaned.length * 0.5) {
      // Cleanly trim to the last complete sentence
      cleaned = cleaned.slice(0, lastTerminatorIndex + 1);
    } else {
      // Complete with a period
      cleaned = cleaned + '.';
    }
  }

  // 3. Dialogue Quote Balancing
  const standardDoubleQuotes = (cleaned.match(/"/g) || []).length;
  if (standardDoubleQuotes % 2 !== 0) {
    cleaned = cleaned + '"';
  }

  const curlyOpen = (cleaned.match(/“/g) || []).length;
  const curlyClose = (cleaned.match(/”/g) || []).length;
  if (curlyOpen > curlyClose) {
    cleaned = cleaned + '”';
  }

  return cleaned;
}

