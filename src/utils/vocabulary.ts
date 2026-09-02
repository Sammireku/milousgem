import { VocabularyEntry } from '../components/VocabularyModal';

export const STORY_VOCABULARY_DATABASE: Record<string, VocabularyEntry> = {
  luminescent: {
    word: 'luminescent',
    phonetic: 'loo-muh-NES-unt',
    partOfSpeech: 'adjective',
    definition: 'Emitting light not caused by heat; glowing softly in the dark.',
    childFriendlyExplanation: 'Something that shines with a soft, magical glow like a firefly or glow-in-the-dark star!',
    exampleSentence: 'The luminescent moss cast a soft emerald glow across the cavern walls.',
    synonyms: ['glowing', 'radiant', 'gleaming', 'shimmering'],
  },
  labyrinth: {
    word: 'labyrinth',
    phonetic: 'LAB-uh-rinth',
    partOfSpeech: 'noun',
    definition: 'A complicated irregular network of passages or paths in which it is difficult to find one’s way; a maze.',
    childFriendlyExplanation: 'A giant puzzle maze made of twisty pathways, hedges, or stone corridors.',
    exampleSentence: 'They navigated the ancient stone labyrinth by following the compass markings.',
    synonyms: ['maze', 'tangle', 'network', 'web'],
  },
  chronometer: {
    word: 'chronometer',
    phonetic: 'kruh-NOM-uh-ter',
    partOfSpeech: 'noun',
    definition: 'An instrument for measuring time with exceptional accuracy.',
    childFriendlyExplanation: 'A super-precise, beautifully crafted magical clock or pocket watch!',
    exampleSentence: 'The clockwork owl tapped the silver chronometer as the gears clicked into place.',
    synonyms: ['timepiece', 'clock', 'watch', 'timer'],
  },
  sanctuary: {
    word: 'sanctuary',
    phonetic: 'SANGK-choo-air-ee',
    partOfSpeech: 'noun',
    definition: 'A place of safety, refuge, or quiet protection.',
    childFriendlyExplanation: 'A peaceful, cozy haven where you feel safe and protected from the storm.',
    exampleSentence: 'Deep within the hollow oak tree, they found a quiet woodland sanctuary.',
    synonyms: ['haven', 'refuge', 'shelter', 'oasis'],
  },
  curiosity: {
    word: 'curiosity',
    phonetic: 'kyoor-ee-OS-ih-tee',
    partOfSpeech: 'noun',
    definition: 'A strong desire to know, discover, or learn something new.',
    childFriendlyExplanation: 'The exciting feeling inside you when you want to explore and find out how something works!',
    exampleSentence: 'Her eyes sparked with curiosity when she discovered the locked bronze chest.',
    synonyms: ['wonder', 'interest', 'inquisitiveness', 'eagerness'],
  },
  bramble: {
    word: 'bramble',
    phonetic: 'BRAM-bul',
    partOfSpeech: 'noun',
    definition: 'A prickly scrambling shrub or bush, especially a blackberry bush.',
    childFriendlyExplanation: 'A wild, prickly bush filled with twisting vines and berries.',
    exampleSentence: 'They carefully ducked beneath the wild blackberry brambles.',
    synonyms: ['bush', 'thicket', 'briar', 'hedge'],
  },
  celestial: {
    word: 'celestial',
    phonetic: 'suh-LES-chul',
    partOfSpeech: 'adjective',
    definition: 'Belonging or relating to the sky, or outer space as observed in astronomy.',
    childFriendlyExplanation: 'Connected to the sky, sparkling stars, moonbeams, and the cosmos!',
    exampleSentence: 'The celestial map showed constellations that danced across the northern horizon.',
    synonyms: ['heavenly', 'stellar', 'astronomical', 'cosmic'],
  },
  tapestry: {
    word: 'tapestry',
    phonetic: 'TAP-uh-stree',
    partOfSpeech: 'noun',
    definition: 'A piece of thick textile fabric with pictures or designs formed by weaving colored threads.',
    childFriendlyExplanation: 'A grand woven cloth picture that tells an epic adventure story!',
    exampleSentence: 'The golden tapestry depicted ancient explorers crossing the savanna.',
    synonyms: ['weaving', 'fabric', 'embroidery', 'mural'],
  },
  kaleidoscope: {
    word: 'kaleidoscope',
    phonetic: 'kuh-LY-duh-skope',
    partOfSpeech: 'noun',
    definition: 'A constantly changing pattern or sequence of elements and vibrant colors.',
    childFriendlyExplanation: 'A tube you look into that creates mesmerizing, colorful changing geometric patterns!',
    exampleSentence: 'Sunlight poured through the stained glass in a kaleidoscope of amber and sapphire.',
    synonyms: ['rainbow', 'array', 'spectacle', 'pattern'],
  },
  whisper: {
    word: 'whisper',
    phonetic: 'HWIS-per',
    partOfSpeech: 'verb/noun',
    definition: 'To speak very softly using one’s breath rather than the vocal cords.',
    childFriendlyExplanation: 'Speaking in a soft, gentle secret voice so only your friend can hear.',
    exampleSentence: 'The evening breeze seemed to whisper ancient secrets through the pine needles.',
    synonyms: ['murmur', 'mutter', 'breathe', 'sigh'],
  },
  compassion: {
    word: 'compassion',
    phonetic: 'kum-PASH-un',
    partOfSpeech: 'noun',
    definition: 'Sympathetic pity and concern for the sufferings or misfortunes of others.',
    childFriendlyExplanation: 'Caring deeply when someone is hurt and wanting to help them feel better.',
    exampleSentence: 'With great compassion, Jo offered her blanket to the shivering forest fawn.',
    synonyms: ['kindness', 'empathy', 'warmth', 'caring'],
  },
};

export function findVocabularyInText(text: string): { word: string; entry: VocabularyEntry }[] {
  const found: { word: string; entry: VocabularyEntry }[] = [];
  const lowerText = text.toLowerCase();

  Object.keys(STORY_VOCABULARY_DATABASE).forEach((vocabWord) => {
    // Regex for word boundary matching
    const regex = new RegExp(`\\b${vocabWord}\\b`, 'i');
    if (regex.test(lowerText)) {
      found.push({
        word: vocabWord,
        entry: STORY_VOCABULARY_DATABASE[vocabWord],
      });
    }
  });

  return found;
}
