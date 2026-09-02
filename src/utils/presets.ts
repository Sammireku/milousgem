import { GenreDefinition, ArtStyleDefinition, Character, StoryBook } from '../types';

export const GENRE_PRESETS: GenreDefinition[] = [
  // --- Speculative & Worldbuilding-Heavy Genres ---
  {
    id: 'solarpunk',
    name: 'Solarpunk',
    tagline: 'Glass sails, vertical gardens, and tech in harmony with nature.',
    description: 'Optimistic, green sci-fi where human technology exists in harmony with nature. Visually features glass, solar sails, vertical gardens, and community-driven problems rather than epic battles.',
    iconName: 'Sun',
    themeColor: 'from-emerald-400 to-teal-500',
    defaultTone: 'heartwarming',
    samplePromptSeed: 'A chef running a zero-waste hydroponic greenhouse on an airship solves the mystery of a missing rare seed species.',
    isKidsFriendly: true,
    weight: 1.5,
    compatibleGenreIds: ['cozy_culinary_mystery', 'biopunk_ecofiction', 'micro_scale_fiction', 'slice_of_life_twist', 'historical_retro_futurism', 'space_western_frontier', 'maritime_adventure'],
  },
  {
    id: 'silkpunk',
    name: 'Silkpunk',
    tagline: 'Bamboo airships, silk sails, and organic East Asian technology.',
    description: 'A subgenre blending technology and organic materials inspired by East Asian antiquity—think airships built from bamboo and silk, powered by internal pressure or wind dynamics.',
    iconName: 'Feather',
    themeColor: 'from-amber-500 to-rose-400',
    defaultTone: 'epic_heroic',
    samplePromptSeed: 'A tiny clockwork beetle pilot navigating a towering ancient bamboo forest to deliver a critical message.',
    isKidsFriendly: true,
    weight: 1.3,
    compatibleGenreIds: ['maritime_adventure', 'micro_scale_fiction', 'folklore_noir', 'arcanepunk_clockwork', 'slice_of_life_twist'],
  },
  {
    id: 'gaslamp_fantasy',
    name: 'Gaslamp Fantasy',
    tagline: 'Cobblestone secrets, Victorian lanterns, and soft alchemy.',
    description: 'High-society gothic mystery set in Victorian or Edwardian eras with low-level alchemy or soft magic. Emphasizes atmospheric tension, cobblestones, lanterns, and secrets.',
    iconName: 'Flame',
    themeColor: 'from-amber-700 to-stone-800',
    defaultTone: 'psychological_suspense',
    samplePromptSeed: 'An archivist on a steam-powered research vessel tracking rare deep-sea luminous tide phenomena.',
    isKidsFriendly: true,
    weight: 1.2,
    compatibleGenreIds: ['maritime_adventure', 'cozy_culinary_mystery', 'folklore_noir', 'arcanepunk_clockwork', 'historical_retro_futurism'],
  },
  {
    id: 'arcanepunk_clockwork',
    name: 'Arcanepunk / Clockwork Fantasy',
    tagline: 'Industrial gearwork, magical runes, and steam engineering.',
    description: 'Worlds where magic acts as an industrial power source (gears, runes, steam engines). Conflict centers around mechanical engineering, discovery, and societal balance.',
    iconName: 'Cpu',
    themeColor: 'from-orange-500 to-amber-600',
    defaultTone: 'curious_educational',
    samplePromptSeed: 'A clockwork apprentice restores a dry river siphon using an ancient brass gear mechanism.',
    isKidsFriendly: true,
    weight: 1.4,
    compatibleGenreIds: ['solarpunk', 'silkpunk', 'gaslamp_fantasy', 'biopunk_ecofiction', 'historical_retro_futurism', 'space_western_frontier'],
  },
  {
    id: 'biopunk_ecofiction',
    name: 'Biopunk / Eco-Fiction',
    tagline: 'Living architecture, synthetic ecosystems, and biological tech.',
    description: 'Focuses on biological technology—living architecture, synthetic organisms, or characters who solve problems by understanding animal ecosystems rather than using magic.',
    iconName: 'Sparkles',
    themeColor: 'from-emerald-600 to-lime-500',
    defaultTone: 'curious_educational',
    samplePromptSeed: 'A young botanist communicates with bioluminescent coral trees to heal a blighted coastal estuary.',
    isKidsFriendly: true,
    weight: 1.2,
    compatibleGenreIds: ['solarpunk', 'arcanepunk_clockwork', 'micro_scale_fiction', 'cozy_culinary_mystery'],
  },

  // --- Atmospheric & Mystery Genres ---
  {
    id: 'cozy_culinary_mystery',
    name: 'Cozy Whodunit / Culinary Mystery',
    tagline: 'Small communities, hidden clues, and mouthwatering craft.',
    description: 'Low-stakes, highly tactical mysteries focused on small communities, hidden clues, eccentric characters, and sensory details (food, crafts, restoration work).',
    iconName: 'Search',
    themeColor: 'from-amber-500 to-orange-400',
    defaultTone: 'whimsical',
    samplePromptSeed: 'A village baker uses sensory clues and spice aromas to uncover who rearranged the secret recipe ledger.',
    isKidsFriendly: true,
    weight: 1.5,
    compatibleGenreIds: ['solarpunk', 'gaslamp_fantasy', 'micro_scale_fiction', 'slice_of_life_twist', 'biopunk_ecofiction'],
  },
  {
    id: 'maritime_adventure',
    name: 'Maritime / High Seas Adventure',
    tagline: 'Navigational logic, weather survival, and uncharted coastal folklore.',
    description: 'Navigational logic, weather survival, ancient uncharted maps, and coastal folklore. Perfect for forcing dynamic action rather than static conversations.',
    iconName: 'Compass',
    themeColor: 'from-cyan-600 to-blue-700',
    defaultTone: 'epic_heroic',
    samplePromptSeed: 'A young navigator uses stellar angles and tidal currents to guide a storm-tossed research lugger around hidden reefs.',
    isKidsFriendly: true,
    weight: 1.3,
    compatibleGenreIds: ['solarpunk', 'silkpunk', 'gaslamp_fantasy', 'space_western_frontier', 'folklore_noir'],
  },
  {
    id: 'folklore_noir',
    name: 'Mythological Reimagining (Folklore Noir)',
    tagline: 'Global myths retold through a detective or slice-of-life lens.',
    description: 'Classic folklore or regional mythologies retold through a detective or slice-of-life lens. Moves away from Western European medieval tropes toward global traditions.',
    iconName: 'Moon',
    themeColor: 'from-indigo-900 to-purple-800',
    defaultTone: 'poetic_lyrical',
    samplePromptSeed: 'A detective who speaks to river spirits investigates why the moonlit tides left golden riddle stones on the shore.',
    isKidsFriendly: true,
    weight: 1.1,
    compatibleGenreIds: ['silkpunk', 'gaslamp_fantasy', 'maritime_adventure', 'historical_retro_futurism', 'slice_of_life_twist'],
  },
  {
    id: 'micro_scale_fiction',
    name: 'Micro-Scale Fiction',
    tagline: 'Tiny creatures navigating human spaces as vast epic landscapes.',
    description: 'Stories told from the perspective of tiny creatures (insects, toys, garden life) navigating human environments as vast, epic landscapes.',
    iconName: 'Smile',
    themeColor: 'from-emerald-400 to-yellow-500',
    defaultTone: 'playful_funny',
    samplePromptSeed: 'A miniature clockwork beetle pilot crosses a carpet forest to deliver a leaf-encoded cipher.',
    isKidsFriendly: true,
    weight: 1.4,
    compatibleGenreIds: ['solarpunk', 'silkpunk', 'cozy_culinary_mystery', 'biopunk_ecofiction', 'slice_of_life_twist'],
  },

  // --- Character-Driven & Everyday Genres ---
  {
    id: 'slice_of_life_twist',
    name: 'Slice-of-Life with a Twist',
    tagline: 'Realistic family dynamics touch a subtle, unexplainable magic.',
    description: 'Grounded, realistic family or school dynamics where one subtle, unexplainable element exists (e.g., a library where forgotten memories end up in physical jars).',
    iconName: 'Heart',
    themeColor: 'from-rose-400 to-amber-300',
    defaultTone: 'heartwarming',
    samplePromptSeed: 'A neighborhood library maintains a hidden aisle where lost childhood memories are stored in glass jars.',
    isKidsFriendly: true,
    weight: 1.3,
    compatibleGenreIds: ['solarpunk', 'cozy_culinary_mystery', 'micro_scale_fiction', 'folklore_noir', 'historical_retro_futurism'],
  },
  {
    id: 'historical_retro_futurism',
    name: 'Historical Invention / Retro-Futurism',
    tagline: '1800s aviation races, radio pioneers, and alternate history.',
    description: 'Alternate timeline history—for instance, an 1800s aviation race or early radio-broadcasting pioneers solving an unusual mystery.',
    iconName: 'Compass',
    themeColor: 'from-yellow-600 to-amber-700',
    defaultTone: 'curious_educational',
    samplePromptSeed: 'An 1890s radio operator picks up an unscheduled telegraph signal sent from a floating cloud observatory.',
    isKidsFriendly: true,
    weight: 1.2,
    compatibleGenreIds: ['gaslamp_fantasy', 'arcanepunk_clockwork', 'folklore_noir', 'solarpunk'],
  },
  {
    id: 'space_western_frontier',
    name: 'Space Western / Orbital Frontier',
    tagline: 'Asteroid miners, cargo drivers, and orbital survival engineering.',
    description: 'Outer-space survival framed around frontier themes—maintenance crews, asteroid miners, or space cargo drivers dealing with practical engineering dilemmas.',
    iconName: 'Rocket',
    themeColor: 'from-indigo-600 to-slate-800',
    defaultTone: 'epic_heroic',
    samplePromptSeed: 'A space tug mechanic repairs a solar sail array while navigating through a dense field of ice particles.',
    isKidsFriendly: true,
    weight: 1.3,
    compatibleGenreIds: ['solarpunk', 'arcanepunk_clockwork', 'maritime_adventure', 'slice_of_life_twist'],
  },

  // --- Random Subgenre Mashup ---
  {
    id: 'random_subgenre_mashup',
    name: '🎲 Surprise Me! (Random Subgenre Mashup)',
    tagline: 'Sparks a weighted random blend of two compatible subgenres!',
    description: 'Uses a weighted randomizer to pick a primary genre and pairs it with a second compatible subgenre to create an unrepeatable story context.',
    iconName: 'Sparkles',
    themeColor: 'from-fuchsia-500 to-cyan-500',
    defaultTone: 'whimsical',
    samplePromptSeed: 'A zero-waste airship greenhouse chef and a tiny clockwork pilot team up to solve a maritime weather riddle.',
    isKidsFriendly: true,
  },
];

export const KIDS_MORAL_THEMES = [
  { id: 'kindness', label: 'Kindness & Empathy', description: 'Showing love and consideration to friends and all creatures' },
  { id: 'courage', label: 'Courage & Bravery', description: 'Overcoming fears, trying new things, and standing up for others' },
  { id: 'sharing', label: 'Sharing & Generosity', description: 'Learning the joy of giving, teamwork, and making room for everyone' },
  { id: 'curiosity', label: 'Curiosity & Discovery', description: 'Asking wonderful questions, exploring nature, and loving to learn' },
  { id: 'honesty', label: 'Honesty & Truthfulness', description: 'Being truthful, keeping promises, and building trust' },
  { id: 'nature', label: 'Protecting Nature', description: 'Caring for trees, oceans, animals, and our beautiful planet' },
  { id: 'bedtime_peace', label: 'Peaceful Bedtime & Gratitude', description: 'Celebrating the day’s blessings and resting peacefully' },
];

export const UNIFIED_PIXAR_3D_STYLE_PROMPT =
  'Pixar 3D animated film render, masterpiece 3D animation still, Physically-Based Rendering (PBR), micro-texture detail, subsurface scattering on skin, expressive stylized character design, warm cinematic volumetric studio lighting, rich vibrant color palette, octane render style';

export const ART_STYLES: ArtStyleDefinition[] = [
  {
    id: 'hyper_articulated_realism',
    name: '3D Pixar Animated Film',
    description: 'Masterpiece 3D Pixar animation still with Physically-Based Rendering (PBR), subsurface scattering on skin, expressive character design, and warm cinematic studio lighting.',
    sampleThumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=300&q=80',
    promptModifier: UNIFIED_PIXAR_3D_STYLE_PROMPT,
  },
];

// Initial preset characters with 3D animated Pixar-style children's book aesthetics
export const INITIAL_PRESET_CHARACTERS: Character[] = [
  {
    id: 'preset_char_zula',
    userId: 'default',
    name: 'Zula',
    titleOrRole: 'The Playful Explorer',
    role: 'protagonist',
    gender: 'girl',
    backstory: 'A cheerful, energetic girl full of silly jokes and boundless imagination who brings sunshine into every classroom.',
    personality: ['Playful', 'Joyful', 'Imaginative'],
    flawOrSecret: 'Sometimes gets so excited she forgets to finish her crafts before starting new ones.',
    signatureItem: 'Handmade origami rainbow bird',
    speechPattern: 'Bubbly, energetic, with joyful giggles and playful expressions',
    genreAffinities: ['solarpunk', 'cozy_culinary_mystery', 'micro_scale_fiction'],
    visualProfile: {
      photoUrl: '/presets/preset_maya.jpg',
      appearanceTags: ['Braided buns', 'Dark brown skin', 'Navy ruffled dress', 'Playful expression', 'Sandals'],
      speciesOrArchetype: 'Pixar 3D Little Explorer',
      artisticStylePrompt: "3D animated Pixar-style children's book character, adorable playful young girl named Zula with dark braided buns, dark skin, expressive eyes, navy ruffled sundress in soft magical lighting",
      keyColors: ['#3A506B', '#F5EFEB', '#B45F3C'],
    },
    createdAt: 1700000001,
  },
  {
    id: 'preset_char_jo',
    userId: 'default',
    name: 'Jo',
    titleOrRole: 'The Butterfly Dreamer',
    role: 'companion',
    gender: 'girl',
    backstory: 'Curious and kind-hearted, Jo collects colorful butterfly clips and loves reading about fast cheetahs and magical savannas.',
    personality: ['Curious', 'Gentle', 'Observant'],
    flawOrSecret: 'Worries about making mistakes when speaking up in front of large groups.',
    signatureItem: 'Cheetah graphic t-shirt and pastel butterfly clips',
    speechPattern: 'Warm, thoughtful, asking clever questions about nature and animals',
    genreAffinities: ['solarpunk', 'biopunk_ecofiction', 'slice_of_life_twist'],
    visualProfile: {
      photoUrl: '/presets/preset_zara.jpg',
      appearanceTags: ['Curly afro puffs', 'Pastel butterfly clips', 'Green cheetah tee', 'Dark shorts', 'Green sneakers'],
      speciesOrArchetype: 'Pixar 3D Curious Explorer',
      artisticStylePrompt: "3D animated Pixar-style children's book character, cheerful young girl named Jo with curly afro puff adorned with colorful butterfly clips, dark skin, bright smile, green cheetah tee in soft magical lighting",
      keyColors: ['#5B6B56', '#D0A97E', '#4A443F'],
    },
    createdAt: 1700000002,
  },
  {
    id: 'preset_char_sam',
    userId: 'default',
    name: 'Sam',
    titleOrRole: 'The Cheerful Storyteller',
    role: 'companion',
    gender: 'boy',
    backstory: 'An enthusiastic big brother and loyal friend who loves inventing games, building treehouses, and encouraging everyone to be brave.',
    personality: ['Enthusiastic', 'Welcoming', 'Courageous'],
    flawOrSecret: 'Tries to carry everyone else’s burdens without asking for help.',
    signatureItem: 'Bright green high-top sneakers and cheetah shirt',
    speechPattern: 'Inspiring, upbeat, greeting everyone with big smiles and open arms',
    genreAffinities: ['arcanepunk_clockwork', 'maritime_adventure', 'historical_retro_futurism'],
    visualProfile: {
      photoUrl: '/presets/preset_kofi.jpg',
      appearanceTags: ['Short fade hair', 'Warm dark skin', 'Cheetah t-shirt', 'Grey pants', 'Green sneakers'],
      speciesOrArchetype: 'Pixar 3D Big Brother & Friend',
      artisticStylePrompt: "3D animated Pixar-style children's book character, enthusiastic teenage boy named Sam with neat fade haircut, beaming smile, open welcoming gestures, green cheetah t-shirt in soft magical storybook lighting",
      keyColors: ['#4A6344', '#78716A', '#F9F7F2'],
    },
    createdAt: 1700000003,
  },
  {
    id: 'preset_char_milou',
    userId: 'default',
    name: 'Milou',
    titleOrRole: 'The Wise & Caring Guide',
    role: 'mentor',
    gender: 'woman',
    backstory: 'A beloved teacher and storyteller who believes every child holds an infinite universe of creativity and wisdom waiting to bloom.',
    personality: ['Patient', 'Nurturing', 'Wise'],
    flawOrSecret: 'Sometimes misses quiet moments of silence in her bustling world.',
    signatureItem: 'Geometric dangle earrings and classic blue dress',
    speechPattern: 'Gentle, melodious, encouraging, offering comforting pearls of wisdom',
    genreAffinities: ['silkpunk', 'gaslamp_fantasy', 'folklore_noir'],
    visualProfile: {
      photoUrl: '/presets/preset_elena.jpg',
      appearanceTags: ['Wavy brown top bun', 'Hazel eyes', 'Geometric earrings', 'Navy blue dress', 'Warm smile'],
      speciesOrArchetype: 'Pixar 3D Mentor & Teacher',
      artisticStylePrompt: "3D animated Pixar-style children's book character, kind mentor teacher named Milou with wavy brown hair in a top bun, gentle smile, geometric earrings, navy blue dress in warm magical classroom lighting",
      keyColors: ['#2E2A27', '#B45F3C', '#EAEFE9'],
    },
    createdAt: 1700000004,
  },
];

export const SAMPLE_INITIAL_BOOKS: StoryBook[] = [];

export const TARGET_AGE_RANGES = [
  { id: '2-4', label: 'Ages 2–4 (Toddler / Early Emergent)', description: 'High rhythm, sensory discovery, short sentences (3–8 words), physical/tactile actions.' },
  { id: '5-7', label: 'Ages 5–7 (Early Reader / Picture Book)', description: 'Playful dialogue, clear cause-and-effect, simple compound sentences, visual momentum.' },
  { id: '8-10', label: 'Ages 8–10 (Middle Grade / Chapter Book)', description: 'Internal vs. external conflict, friendship dynamics, clever problem-solving, worldbuilding logic.' },
  { id: '11-13', label: 'Ages 11–13 (Upper Middle Grade / Early Teen)', description: 'Complex morality, identity formation, fast action balanced with inner monologue.' },
  { id: '14+', label: 'Young Adult (YA - Ages 14+)', description: 'Deep character arcs, philosophical questions, sophisticated sub-genres, high emotional resonance.' },
];

export const SUBGENRE_MASHUPS = [
  { id: 'solarpunk_culinary', name: 'Solarpunk + Cozy Culinary Mystery', description: 'Bioluminescent community gardens, solar ovens, and missing heirloom recipes.' },
  { id: 'silkpunk_micro', name: 'Silkpunk + Micro-Scale Adventure', description: 'Bamboo airships, clockwork beetles, and journeys through giant lotus gardens.' },
  { id: 'gaslamp_maritime', name: 'Gaslamp Fantasy + Maritime Expedition', description: 'Foggy harbor docks, copper-clad sub-surface boats, and chart room mysteries.' },
  { id: 'arcanepunk_ecofiction', name: 'Arcanepunk / Clockwork + Eco-Fiction', description: 'Restoring balance to mechanical rainforests and river siphons.' },
  { id: 'folklore_retro', name: 'Folklore Noir + Historical Invention', description: 'Vintage inventions meeting ancient mythical riddle guardians.' },
  { id: 'space_sliceoflife', name: 'Space Western + Slice-of-Life', description: 'Cozy hydroponic station diners on the rim of the asteroid belt.' },
];

/**
 * Surprise Me Mode: Weighted randomizer that selects a primary genre based on probability weights,
 * then selects a second compatible genre to form an engaging, non-repetitive subgenre mashup!
 */
export function getWeightedSurpriseMashup(): {
  genreId: string;
  name: string;
  description: string;
  defaultTone: any;
  sampleSeed: string;
  primaryGenre: GenreDefinition;
  secondaryGenre: GenreDefinition;
  compatibilityNote: string;
} {
  const baseGenres = GENRE_PRESETS.filter((g) => g.id !== 'random_subgenre_mashup');

  // Step 1: Weighted random choice for Genre 1
  const totalWeight = baseGenres.reduce((acc, g) => acc + (g.weight || 1.0), 0);
  let rand1 = Math.random() * totalWeight;
  let g1 = baseGenres[0];
  for (const g of baseGenres) {
    const w = g.weight || 1.0;
    if (rand1 <= w) {
      g1 = g;
      break;
    }
    rand1 -= w;
  }

  // Step 2: Select a second compatible genre
  const compatibleIds = g1.compatibleGenreIds || [];
  let candidateGenres = baseGenres.filter((g) => g.id !== g1.id && (compatibleIds.length === 0 || compatibleIds.includes(g.id)));
  if (candidateGenres.length === 0) {
    candidateGenres = baseGenres.filter((g) => g.id !== g1.id);
  }

  // Step 3: Weighted random choice for Genre 2 among candidate genres
  const candidateTotalWeight = candidateGenres.reduce((acc, g) => acc + (g.weight || 1.0), 0);
  let rand2 = Math.random() * candidateTotalWeight;
  let g2 = candidateGenres[0];
  for (const g of candidateGenres) {
    const w = g.weight || 1.0;
    if (rand2 <= w) {
      g2 = g;
      break;
    }
    rand2 -= w;
  }

  // Step 4: Synthesize rich Mashup definition
  const mashupName = `${g1.name} × ${g2.name}`;
  const description = `A weighted subgenre mashup combining ${g1.name} (${g1.tagline}) with compatible subgenre ${g2.name} (${g2.tagline}).`;
  const compatibilityNote = `Weighted Randomizer selected ${g1.name} (weight: ${g1.weight || 1.0}) and paired it with compatible subgenre ${g2.name}.`;

  const cleanSeed1 = g1.samplePromptSeed.replace(/\.$/, '');
  const sampleSeed = `${cleanSeed1}, while discovering a hidden secret influenced by ${g2.name.toLowerCase()} technology and atmosphere.`;

  return {
    genreId: `${g1.name} + ${g2.name}`,
    name: mashupName,
    description,
    defaultTone: g1.defaultTone,
    sampleSeed,
    primaryGenre: g1,
    secondaryGenre: g2,
    compatibilityNote,
  };
}

/**
 * Randomization System: Pick a single genre or generate a random subgenre mashup!
 */
export function getRandomGenreOrMashup(): { genreId: string; name: string; description: string; defaultTone: any; sampleSeed: string } {
  return getWeightedSurpriseMashup();
}
