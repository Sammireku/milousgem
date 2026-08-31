import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  Users,
  Palette,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Wand2,
  Compass,
  ArrowRight,
  ArrowLeft,
  Flame,
  Feather,
  Heart,
  Baby,
  Smile,
} from 'lucide-react';
import {
  Character,
  StoryBook,
  StoryGenre,
  StoryArtStyle,
  StoryTone,
  StoryChapter,
  TargetAudience,
} from '../types';
import { GENRE_PRESETS, ART_STYLES, KIDS_MORAL_THEMES } from '../utils/presets';
import { CharacterCard } from './CharacterCard';
import confetti from 'canvas-confetti';

interface StoryCreatorProps {
  characters: Character[];
  onCreateBook: (book: StoryBook) => void;
  onOpenCharacterStudio: () => void;
  preselectedCharacter?: Character | null;
}

export const StoryCreator: React.FC<StoryCreatorProps> = ({
  characters,
  onCreateBook,
  onOpenCharacterStudio,
  preselectedCharacter,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Kids Mode Toggle & Settings
  const [isKidsMode, setIsKidsMode] = useState<boolean>(false);
  const [targetAudience, setTargetAudience] = useState<TargetAudience>('all_ages');
  const [moralLesson, setMoralLesson] = useState<string>('');

  // Cast Selection (up to 3 characters)
  const [selectedCast, setSelectedCast] = useState<Character[]>(
    preselectedCharacter ? [preselectedCharacter] : characters.slice(0, 1)
  );

  // Genre & Art Style
  const [selectedGenre, setSelectedGenre] = useState<StoryGenre>('fantasy');
  const [selectedArtStyle, setSelectedArtStyle] = useState<StoryArtStyle>('watercolor_storybook');

  // Blueprint & Anti-Repetition Settings
  const [title, setTitle] = useState('');
  const [synopsis, setSynopsis] = useState('');
  const [tone, setTone] = useState<StoryTone>('epic_heroic');
  const [targetChapters, setTargetChapters] = useState<number>(4);
  const [entropyLevel, setEntropyLevel] = useState<number>(0.85);

  // Generation loading
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStepStatus, setGenerationStepStatus] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleKidsMode = (enable: boolean) => {
    setIsKidsMode(enable);
    if (enable) {
      setTargetAudience('kids_middle');
      setSelectedGenre('magical_animals');
      setSelectedArtStyle('children_picturebook');
      setTone('whimsical');
      setMoralLesson(KIDS_MORAL_THEMES[0].id);
      setTargetChapters(8); // Capped at 8 for kids
      setEntropyLevel(0.65);
    } else {
      setTargetAudience('all_ages');
      setSelectedGenre('fantasy');
      setSelectedArtStyle('watercolor_storybook');
      setTone('epic_heroic');
      setMoralLesson('');
      setTargetChapters(4);
      setEntropyLevel(0.85);
    }
  };

  const toggleCharacterInCast = (char: Character) => {
    if (selectedCast.some((c) => c.id === char.id)) {
      if (selectedCast.length > 1) {
        setSelectedCast(selectedCast.filter((c) => c.id !== char.id));
      }
    } else {
      if (selectedCast.length < 3) {
        setSelectedCast([...selectedCast, char]);
      } else {
        setSelectedCast([selectedCast[0], selectedCast[1], char]);
      }
    }
  };

  const handleSparkPremise = () => {
    const genreDef = GENRE_PRESETS.find((g) => g.id === selectedGenre) || GENRE_PRESETS[0];
    const protagonist = selectedCast[0] || characters[0];
    const companion = selectedCast[1];

    if (isKidsMode) {
      const activeMoral = KIDS_MORAL_THEMES.find((m) => m.id === moralLesson)?.label || 'Kindness & Teamwork';
      const kidsSparks = [
        {
          title: `${protagonist?.name || 'Barnaby'} and the Whispering Cloud`,
          synopsis: `When a little cloud loses its rainbow colors, ${protagonist?.name || 'the young explorer'} sets out on a gentle quest to help it smile again. A heartwarming tale exploring ${activeMoral.toLowerCase()}.`,
        },
        {
          title: `The Mystery of the Starlight Tree`,
          synopsis: `${protagonist?.name || 'Pip'} discovers that the glowing leaves on the ancient playground oak are dimming. ${companion ? `With ${companion.name}'s help, ` : ''}they gather starry dew and learn that sharing sparks the brightest light.`,
        },
        {
          title: `${protagonist?.name || 'Luna'} & the Lost Moonbeam`,
          synopsis: `A sleepy moonbeam tumbles into the cozy forest just before bedtime. ${protagonist?.name || 'Our hero'} helps guide it back up to the night sky while making wonderful animal friends.`,
        },
        {
          title: `The Secret Garden of ${protagonist?.name || 'Wonders'}`,
          synopsis: `Behind the garden gate lies a colorful realm where listening closely and showing kindness to the smallest creatures unlocks magnificent surprises.`,
        },
      ];
      const chosen = kidsSparks[Math.floor(Math.random() * kidsSparks.length)];
      setTitle(chosen.title);
      setSynopsis(chosen.synopsis);
      return;
    }

    const sparks = [
      {
        title: `The ${protagonist?.name || 'Wanderer'} & the Stolen Zenith`,
        synopsis: `When the celestial alignment of the Zenith Gates unlocks a forbidden vault beneath the city, ${protagonist?.name || 'our hero'} must decipher a coded memory before rival syndicates weaponize it.`,
      },
      {
        title: `Chronicles of the ${genreDef.name} Rift`,
        synopsis: `An uncharted anomaly begins erasing the boundaries between past and future. Armed with ${protagonist?.signatureItem || 'a rare artifact'}, ${protagonist?.name || 'the protagonist'} embarks on a high-stakes quest across uncharted terrain.`,
      },
      {
        title: `The Whisper in the Clockwork Core`,
        synopsis: `${protagonist?.name} uncovers a subterranean machine that whispers secrets about ${protagonist?.flawOrSecret ? 'their deepest vulnerability' : 'the lost founders'}. ${companion ? `Alongside ${companion.name}, ` : ''}they must make a pivotal choice before midnight.`,
      },
      {
        title: `Echoes of the Obsidian Crown`,
        synopsis: `${genreDef.samplePromptSeed}`,
      },
    ];

    const chosen = sparks[Math.floor(Math.random() * sparks.length)];
    setTitle(chosen.title);
    setSynopsis(chosen.synopsis);
  };

  const handleCreateAndWeave = async () => {
    const finalTitle = title.trim() || `The Chronicle of ${selectedCast[0]?.name || 'Destiny'}`;
    const finalSynopsis = synopsis.trim() || `${GENRE_PRESETS.find((g) => g.id === selectedGenre)?.samplePromptSeed}`;

    setIsGenerating(true);
    setErrorMsg(null);
    setGenerationStepStatus(
      isKidsMode
        ? 'Weaving cheerful Chapter 1 picturebook adventure...'
        : 'Weaving Chapter 1 narrative arc with anti-repetition engine...'
    );

    try {
      // 1. Generate Chapter 1 prose and choices
      const chapterRes = await fetch('/api/story/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: selectedGenre,
          artStyle: selectedArtStyle,
          tone: tone,
          cast: selectedCast,
          bookTitle: finalTitle,
          synopsis: finalSynopsis,
          chapterNumber: 1,
          totalTargetChapters: targetChapters,
          entropyLevel: entropyLevel,
          targetAudience: targetAudience,
          moralLesson: moralLesson,
          isKidsMode: isKidsMode,
          plotMemory: {
            keyDecisions: [],
            activeInventory: selectedCast.map((c) => c.signatureItem).filter(Boolean),
            characterTensions: selectedCast.map((c) => `${c.name}: ${c.flawOrSecret}`).filter(Boolean),
            foreshadowedClues: [],
            worldStateChanges: [],
          },
        }),
      });

      const chapterData = await chapterRes.json();
      if (!chapterRes.ok || !chapterData.success) {
        throw new Error(chapterData.error || 'Failed to generate chapter 1');
      }

      const generatedChapter = chapterData.chapter;

      setGenerationStepStatus('Painting context-aware scene illustration...');

      // 2. Generate initial scene illustration
      let chapterImageUrl = '';
      try {
        const illuRes = await fetch('/api/story/generate-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: generatedChapter.illustrationPrompt,
            artStyle: selectedArtStyle,
            aspectRatio: '16:9',
          }),
        });
        const illuData = await illuRes.json();
        if (illuData.success && illuData.imageUrl) {
          chapterImageUrl = illuData.imageUrl;
        }
      } catch (illuErr) {
        console.warn('Illustration fetch error:', illuErr);
      }

      const firstChapter: StoryChapter = {
        id: `chap_1_${Date.now()}`,
        chapterNumber: 1,
        title: generatedChapter.title || (isKidsMode ? 'Chapter 1: A Wonderful Discovery' : 'Chapter 1: The Inciting Threshold'),
        summary: generatedChapter.summary || 'The journey begins under unprecedented circumstances.',
        content: generatedChapter.content || 'The world shifted on its axis as the journey began...',
        illustrationPrompt: generatedChapter.illustrationPrompt,
        imageUrl: chapterImageUrl || selectedCast[0]?.visualProfile.photoUrl,
        choices: generatedChapter.choices || [
          {
            id: 'c1_investigate',
            label: isKidsMode ? 'Follow the sparkling footprints' : 'Investigate the anomaly directly',
            actionDescription: isKidsMode ? 'Step gently along the glowing path together.' : 'Step forward to inspect the glowing runes on the ground.',
            consequenceHint: isKidsMode ? 'Leads to a friendly discovery.' : 'High risk of trap trigger, but reveals instant clues.',
            riskLevel: 'safe',
          },
          {
            id: 'c1_gather_allies',
            label: isKidsMode ? 'Ask the woodland animals for help' : 'Consult with the cast members',
            actionDescription: isKidsMode ? 'Listen patiently and share a friendly greeting.' : 'Confer with the party before making any sudden moves.',
            consequenceHint: isKidsMode ? 'Builds teamwork and mutual trust.' : 'Strengthens character bonds and unlocks unique tactics.',
            riskLevel: 'safe',
          },
        ],
        memoryUpdate: generatedChapter.memoryUpdate,
        createdAt: Date.now(),
      };

      const newBook: StoryBook = {
        id: `book_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        userId: 'default',
        title: finalTitle,
        synopsis: finalSynopsis,
        genre: selectedGenre,
        artStyle: selectedArtStyle,
        tone: tone,
        targetAudience: targetAudience,
        moralLesson: moralLesson,
        isKidsMode: isKidsMode,
        cast: selectedCast,
        entropyLevel: entropyLevel,
        targetChapters: targetChapters,
        plotMemory: {
          keyDecisions: ['Embarked on the journey with the primary cast.'],
          activeInventory: [
            ...selectedCast.map((c) => c.signatureItem).filter(Boolean),
            ...(generatedChapter.memoryUpdate?.newItems || []),
          ],
          characterTensions: [
            ...selectedCast.map((c) => `${c.name}: ${c.flawOrSecret}`).filter(Boolean),
            ...(generatedChapter.memoryUpdate?.tensionShift ? [generatedChapter.memoryUpdate.tensionShift] : []),
          ],
          foreshadowedClues: generatedChapter.memoryUpdate?.clueDiscovered
            ? [generatedChapter.memoryUpdate.clueDiscovered]
            : [],
          worldStateChanges: generatedChapter.memoryUpdate?.worldStateChanges || ['The chronicle begins.'],
        },
        chapters: [firstChapter],
        currentChapterIndex: 0,
        isCompleted: false,
        isFavorite: false,
        coverImage: chapterImageUrl || selectedCast[0]?.visualProfile.photoUrl,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      try {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch (e) {}

      onCreateBook(newBook);
    } catch (err: any) {
      console.error('Error creating book:', err);
      setErrorMsg(err.message || 'Failed to weave story. Please check parameters and try again.');
    } finally {
      setIsGenerating(false);
      setGenerationStepStatus('');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8 animate-fade-in text-[#4A443F]">
      {/* Wizard Header & Kids Mode Toggle Banner */}
      <div className="space-y-4">
        <div className="text-center space-y-2.5">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#EAF0E8] border border-[#D0E0CC] text-[#3B5436] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" /> Storybook Weaving Studio
          </div>
          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-[#3A342F]">
            {isKidsMode ? 'Craft a Kids & Family Storybook' : 'Craft an Anti-Repetitive Storybook'}
          </h2>
          <p className="text-xs sm:text-sm text-[#6E665E] max-w-xl mx-auto leading-relaxed">
            {isKidsMode
              ? 'Weave wholesome, illustrated adventures tailored for children with moral themes, positive choices, and bedtime-ready pacing.'
              : 'Cast characters from your camera roster, select unique genre aesthetics, and unleash our context-aware narrative engine.'}
          </p>
        </div>

        {/* Story Mode Selector Card */}
        <div className="p-3 sm:p-4 rounded-2xl bg-white border border-[#DFD8CA] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className={`p-2.5 rounded-xl ${isKidsMode ? 'bg-[#EBF4E5] text-[#3B5436]' : 'bg-[#F5EFEB] text-[#6E665E]'}`}>
              {isKidsMode ? <Baby className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>
            <div>
              <div className="text-xs sm:text-sm font-serif font-bold text-[#3A342F] flex items-center gap-2">
                <span>Story Mode:</span>
                <span className={`px-2 py-0.5 rounded-md text-xs ${isKidsMode ? 'bg-[#E0ECD8] text-[#2C4A25] font-bold' : 'bg-[#EAE5DC] text-[#4A443F]'}`}>
                  {isKidsMode ? 'Kids & Family Picturebook' : 'General & Young Adult Literature'}
                </span>
              </div>
              <p className="text-[11px] text-[#78716A]">
                {isKidsMode ? 'Tailored age vocabulary, positive moral lessons, wholesome resolution' : 'Multi-layered conflict, high narrative entropy, and deep lore'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              id="mode-toggle-general"
              onClick={() => toggleKidsMode(false)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                !isKidsMode
                  ? 'bg-[#5B6B56] text-white shadow-xs'
                  : 'bg-[#F5EFEB] text-[#6E665E] hover:text-[#3A342F] border border-[#DFD8CA]'
              }`}
            >
              General Fiction
            </button>
            <button
              type="button"
              id="mode-toggle-kids"
              onClick={() => toggleKidsMode(true)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                isKidsMode
                  ? 'bg-[#3B5436] text-white shadow-xs'
                  : 'bg-[#EAF0E8] text-[#3B5436] hover:bg-[#DCE7D8] border border-[#D0E0CC]'
              }`}
            >
              <Smile className="w-3.5 h-3.5" />
              <span>Kids Mode</span>
            </button>
          </div>
        </div>

        {/* Step Progress Bar */}
        <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-2">
          <button
            onClick={() => setStep(1)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              step === 1
                ? 'bg-[#5B6B56] text-white shadow-sm'
                : 'bg-white text-[#6E665E] hover:text-[#3A342F] border border-[#DFD8CA]'
            }`}
          >
            <span>1. Cast</span>
            <span
              className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                step === 1 ? 'bg-white/20 text-white' : 'bg-[#EAE5DC] text-[#4A443F]'
              }`}
            >
              {selectedCast.length}
            </span>
          </button>

          <span className="text-[#A0988F] text-xs">→</span>

          <button
            onClick={() => setStep(2)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              step === 2
                ? 'bg-[#5B6B56] text-white shadow-sm'
                : 'bg-white text-[#6E665E] hover:text-[#3A342F] border border-[#DFD8CA]'
            }`}
          >
            <span>2. Genre & Style</span>
          </button>

          <span className="text-[#A0988F] text-xs">→</span>

          <button
            onClick={() => setStep(3)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs ${
              step === 3
                ? 'bg-[#5B6B56] text-white shadow-sm'
                : 'bg-white text-[#6E665E] hover:text-[#3A342F] border border-[#DFD8CA]'
            }`}
          >
            <span>3. Plot & Sparks</span>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-[#FAEDE8] border border-[#F2D0C4] text-[#933D22] text-sm flex items-center gap-3 animate-fade-in shadow-xs">
          <AlertCircle className="w-5 h-5 text-[#B45F3C] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: CAST CHARACTERS */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#F5EFEB] border border-[#DFD8CA]">
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#3A342F] flex items-center gap-2">
                <Users className="w-5 h-5 text-[#5B6B56]" />
                Select Cast Members (1 to 3)
              </h3>
              <p className="text-xs text-[#78716A]">
                Choose the lead protagonist and companions for this chronicle.
              </p>
            </div>
            <button
              onClick={onOpenCharacterStudio}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#EAE5DC] text-[#4A443F] text-xs font-semibold transition-colors flex items-center gap-2 border border-[#DFD8CA] shadow-xs shrink-0 self-start sm:self-auto"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#5B6B56]" />
              <span>Forge Portrait in Studio</span>
            </button>
          </div>

          {characters.length === 0 ? (
            <div className="p-8 sm:p-12 text-center rounded-3xl bg-[#F5EFEB]/70 border border-[#DFD8CA] space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[#EAE5DC] text-[#5B6B56] flex items-center justify-center mx-auto">
                <Users className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-serif text-lg font-bold text-[#3A342F]">No Characters Created Yet</h4>
                <p className="text-xs text-[#6E665E] max-w-md mx-auto">
                  Take a photo or upload an image in the Character Studio to bring your hero or kid's story avatar to life.
                </p>
              </div>
              <button
                onClick={onOpenCharacterStudio}
                className="px-6 py-2.5 rounded-xl bg-[#5B6B56] text-white font-bold text-xs shadow-xs hover:bg-[#4D5C47] transition-all"
              >
                Create First Character
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((char) => {
                const isSelected = selectedCast.some((c) => c.id === char.id);
                return (
                  <CharacterCard
                    key={char.id}
                    character={char}
                    isSelected={isSelected}
                    isCastMode={true}
                    onSelectForStory={() => toggleCharacterInCast(char)}
                  />
                );
              })}
            </div>
          )}

          <div className="flex justify-end pt-4">
            <button
              id="wizard-step1-next"
              onClick={() => setStep(2)}
              disabled={selectedCast.length === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all"
            >
              <span>Next: Select Genre & Art Style</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: GENRE & ART STYLE */}
      {step === 2 && (
        <div className="space-y-8 animate-fade-in">
          {/* Kids Mode Audience & Moral Settings */}
          {isKidsMode && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EAF0E8] border border-[#D0E0CC] space-y-4">
              <div className="flex items-center gap-2">
                <Heart className="w-4 h-4 text-[#3B5436]" />
                <span className="font-serif font-bold text-[#2C4A25] text-sm sm:text-base">
                  Children's Age Bracket & Moral Theme
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#2C4A25] mb-1.5">
                    Target Age Group
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'kids_early', label: 'Ages 3-5', sub: 'Preschool' },
                      { id: 'kids_middle', label: 'Ages 6-9', sub: 'Early Reader' },
                      { id: 'young_reader', label: 'Ages 10-12', sub: 'Middle Grade' },
                    ].map((age) => (
                      <button
                        key={age.id}
                        type="button"
                        onClick={() => setTargetAudience(age.id as TargetAudience)}
                        className={`p-2 rounded-xl text-center border transition-all ${
                          targetAudience === age.id
                            ? 'bg-[#3B5436] text-white border-[#3B5436] shadow-xs'
                            : 'bg-white text-[#4A443F] border-[#D0E0CC] hover:bg-[#F2F7F0]'
                        }`}
                      >
                        <div className="text-xs font-bold">{age.label}</div>
                        <div className={`text-[10px] ${targetAudience === age.id ? 'text-white/80' : 'text-[#78716A]'}`}>{age.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#2C4A25] mb-1.5">
                    Moral Theme / Life Lesson
                  </label>
                  <select
                    value={moralLesson}
                    onChange={(e) => setMoralLesson(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-white border border-[#D0E0CC] text-[#3A342F] text-xs font-medium focus:outline-none focus:border-[#3B5436]"
                  >
                    <option value="">None (Pure Adventure)</option>
                    {KIDS_MORAL_THEMES.map((theme) => (
                      <option key={theme.id} value={theme.id}>
                        {theme.label} — {theme.description}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Genre selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base sm:text-lg font-bold text-[#3A342F] flex items-center gap-2">
                  <Compass className="w-5 h-5 text-[#5B6B56]" />
                  Select Story Genre
                </h3>
                <p className="text-xs text-[#78716A]">
                  Each genre drives specialized vocabulary, trope subversions, and worldbuilding logic.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {GENRE_PRESETS.map((g) => {
                const isSelected = selectedGenre === g.id;
                const isRecommendedForMode = isKidsMode ? g.isKidsFriendly : true;
                return (
                  <div
                    key={g.id}
                    id={`genre-card-${g.id}`}
                    onClick={() => {
                      setSelectedGenre(g.id);
                      setTone(g.defaultTone);
                    }}
                    className={`p-4 rounded-2xl cursor-pointer border transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                      isSelected
                        ? 'bg-white border-[#5B6B56] ring-2 ring-[#5B6B56]/20 shadow-md'
                        : isRecommendedForMode
                        ? 'bg-white border-[#DFD8CA] hover:border-[#8C9A86] shadow-xs'
                        : 'bg-white/60 opacity-60 border-[#DFD8CA] hover:opacity-100'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif font-bold text-[#3A342F] text-sm sm:text-base">
                            {g.name}
                          </span>
                          {g.isKidsFriendly && (
                            <span className="px-1.5 py-0.5 rounded bg-[#EAF0E8] text-[#3B5436] text-[10px] font-semibold">
                              Kids
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-[#5B6B56] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-[#5B6B56] font-medium italic">{g.tagline}</p>
                      <p className="text-[11px] text-[#6E665E] leading-relaxed line-clamp-2">
                        {g.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Art style selection */}
          <div className="space-y-4 pt-4 border-t border-[#E8E2D6]">
            <div>
              <h3 className="font-serif text-base sm:text-lg font-bold text-[#3A342F] flex items-center gap-2">
                <Palette className="w-5 h-5 text-[#B45F3C]" />
                Select Illustration Art Style
              </h3>
              <p className="text-xs text-[#78716A]">
                Context-aware images will be visually generated in this artistic medium.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ART_STYLES.map((art) => {
                const isSelected = selectedArtStyle === art.id;
                return (
                  <div
                    key={art.id}
                    id={`art-style-${art.id}`}
                    onClick={() => setSelectedArtStyle(art.id)}
                    className={`p-3.5 rounded-2xl cursor-pointer border transition-all flex items-center gap-3.5 ${
                      isSelected
                        ? 'bg-white border-[#B45F3C] ring-2 ring-[#B45F3C]/20 shadow-md'
                        : 'bg-white border-[#DFD8CA] hover:border-[#B45F3C]/50 shadow-xs'
                    }`}
                  >
                    <img
                      src={art.sampleThumbnail}
                      alt={art.name}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 rounded-xl object-cover border border-[#DFD8CA] shrink-0"
                    />
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-[#3A342F] text-xs sm:text-sm truncate">
                          {art.name}
                        </span>
                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-[#B45F3C] shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#6E665E] leading-tight line-clamp-2">
                        {art.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#6E665E] hover:text-[#3A342F] text-xs font-semibold transition-colors border border-[#DFD8CA]"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Cast
            </button>
            <button
              id="wizard-step2-next"
              onClick={() => {
                if (!title) handleSparkPremise();
                setStep(3);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-bold text-sm shadow-md transition-all"
            >
              <span>Next: Narrative Arc & Sparks</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: NARRATIVE ARC & BRAINSTORMING */}
      {step === 3 && (
        <div className="space-y-8 animate-fade-in">
          {/* Spark Premise Generator Button */}
          <div className="flex items-center justify-between p-4 sm:p-5 rounded-2xl bg-[#FAF0EB] border border-[#F0D5C7]">
            <div className="flex items-center gap-3">
              <Sparkles className="w-5 h-5 text-[#B45F3C]" />
              <div>
                <span className="font-serif font-bold text-[#3A342F] text-sm">Need a Creative Spark?</span>
                <p className="text-xs text-[#78716A]">
                  {isKidsMode
                    ? 'Generate gentle, kid-friendly story prompts tailored for children.'
                    : 'Generate non-repetitive plot hooks tailored to your cast and genre.'}
                </p>
              </div>
            </div>
            <button
              id="story-spark-premise-btn"
              type="button"
              onClick={handleSparkPremise}
              className="px-4 py-2 rounded-xl bg-[#B45F3C] hover:bg-[#A05333] text-white font-bold text-xs flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Spark Premise</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title & Synopsis */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">
                  Storybook Title *
                </label>
                <input
                  id="story-title-input"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={isKidsMode ? 'e.g. Barnaby and the Starlight Tree' : 'e.g. The Clockwork Heart of Aethelgard'}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] font-serif text-base focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">
                  Overarching Synopsis / Inciting Incident
                </label>
                <textarea
                  id="story-synopsis-input"
                  rows={4}
                  value={synopsis}
                  onChange={(e) => setSynopsis(e.target.value)}
                  placeholder={
                    isKidsMode
                      ? 'What friendly mystery or bedtime adventure do the characters embark on?'
                      : 'What urgency sets the characters in motion? What truth are they uncovering?'
                  }
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] text-sm leading-relaxed focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">
                  Narrative Tone
                </label>
                <select
                  id="story-tone-select"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as StoryTone)}
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] text-sm focus:outline-none focus:border-[#5B6B56] shadow-xs"
                >
                  <option value="whimsical">Whimsical & Wonder-Filled</option>
                  <option value="heartwarming">Heartwarming & Uplifting</option>
                  <option value="bedtime_gentle">Bedtime Gentle & Soothing</option>
                  <option value="playful_humorous">Playful & Giggly Humor</option>
                  <option value="curious_educational">Curious & Educational</option>
                  <option value="epic_heroic">Epic & Grand Heroic</option>
                  <option value="gritty_noir">Gritty & Shadowy Noir</option>
                  <option value="psychological_suspense">Psychological Suspense</option>
                  <option value="poetic_lyrical">Poetic & Lyrical Fairy Romance</option>
                </select>
              </div>
            </div>

            {/* Anti-Repetition & Engine Controls */}
            <div className="space-y-5 p-5 rounded-2xl bg-white border border-[#DFD8CA] shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#5B6B56]">
                <Sliders className="w-4 h-4" />
                <span>Anti-Repetition & Entropy Control</span>
              </div>

              {/* Entropy Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#4A443F]">Narrative Entropy (Trope Subversion)</span>
                  <span className="font-mono text-[#5B6B56] font-bold">{Math.round(entropyLevel * 100)}%</span>
                </div>
                <input
                  id="story-entropy-slider"
                  type="range"
                  min="0.2"
                  max="1.0"
                  step="0.05"
                  value={entropyLevel}
                  onChange={(e) => setEntropyLevel(parseFloat(e.target.value))}
                  className="w-full accent-[#5B6B56] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#8C827A]">
                  <span>Structured Classic</span>
                  <span>Balanced Innovation</span>
                  <span>High Subversion & Twists</span>
                </div>
                <p className="text-[11px] text-[#6E665E] leading-tight pt-1">
                  Controls the AI's resistance to cliches, introducing fresh sensory motifs and engaging dilemma branching.
                </p>
              </div>

              {/* Target Chapters */}
              <div className="space-y-2 pt-2 border-t border-[#E8E2D6]">
                <label className="block text-xs font-medium text-[#4A443F]">
                  Target Chapter Count
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setTargetChapters(num)}
                      className={`py-2 rounded-xl text-xs font-bold border transition-all shadow-xs ${
                        targetChapters === num
                          ? 'bg-[#5B6B56] text-white border-[#5B6B56] shadow-xs'
                          : 'bg-[#F5EFEB] text-[#4A443F] border-[#DFD8CA] hover:border-[#8C9A86]'
                      }`}
                    >
                      {num} Chapters
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#78716A]">
                  Interactive storybook with choice branching at the end of each chapter.
                </p>
              </div>

              {/* Cast Summary Chips */}
              <div className="pt-2 border-t border-[#E8E2D6]">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716A] mb-2">
                  Assembled Cast
                </label>
                <div className="flex flex-wrap gap-2">
                  {selectedCast.map((c, i) => (
                    <div
                      key={c.id}
                      className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-[#F5EFEB] border border-[#DFD8CA] text-xs text-[#4A443F]"
                    >
                      <img
                        src={c.visualProfile.photoUrl}
                        alt={c.name}
                        referrerPolicy="no-referrer"
                        className="w-5 h-5 rounded-full object-cover"
                      />
                      <span className="font-medium">{c.name}</span>
                      <span className="text-[10px] text-[#5B6B56] font-semibold capitalize">
                        ({i === 0 ? 'Lead' : c.role})
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-6 border-t border-[#E8E2D6]">
            <button
              onClick={() => setStep(2)}
              disabled={isGenerating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#6E665E] hover:text-[#3A342F] text-xs font-semibold transition-colors border border-[#DFD8CA]"
            >
              <ArrowLeft className="w-4 h-4" /> Back to Genre
            </button>

            <button
              id="weave-chronicle-submit-btn"
              onClick={handleCreateAndWeave}
              disabled={isGenerating}
              className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-[#B45F3C] hover:bg-[#A05333] text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.01] disabled:opacity-50 transition-all"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{generationStepStatus || 'Weaving Chronicle...'}</span>
                </>
              ) : (
                <>
                  <Feather className="w-5 h-5" />
                  <span>Weave Chronicle (Generate Chapter 1)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
