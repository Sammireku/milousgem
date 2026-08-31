import React, { useState } from 'react';
import {
  Camera,
  Upload,
  Sparkles,
  UserPlus,
  Search,
  Check,
  RefreshCw,
  Sliders,
  ShieldAlert,
  Gem,
  MessageSquare,
  Wand2,
  Tag,
  Palette,
  X,
  Plus,
} from 'lucide-react';
import { Character, CharacterRole, CharacterVisualProfile, StoryGenre } from '../types';
import { CharacterCard } from './CharacterCard';
import { CameraCaptureModal } from './CameraCaptureModal';
import { GENRE_PRESETS } from '../utils/presets';

interface CharacterStudioProps {
  characters: Character[];
  onSaveCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onCastCharacter: (character: Character) => void;
}

const SAMPLE_PORTRAIT_PRESETS = [
  {
    name: 'Astrid Starling',
    role: 'protagonist',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80',
    archetype: 'Celestial Navigator',
  },
  {
    name: 'Darius Vance',
    role: 'companion',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80',
    archetype: 'Cyber-Rogue Courier',
  },
  {
    name: 'Elowen Thistle',
    role: 'mentor',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&q=80',
    archetype: 'Bramble Herbalist',
  },
  {
    name: 'Baron Kincaid',
    role: 'antagonist',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&q=80',
    archetype: 'Iron Baron Industrialist',
  },
];

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  characters,
  onSaveCharacter,
  onDeleteCharacter,
  onCastCharacter,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>(SAMPLE_PORTRAIT_PRESETS[0].url);
  const [name, setName] = useState('');
  const [titleOrRole, setTitleOrRole] = useState('');
  const [role, setRole] = useState<CharacterRole>('protagonist');
  const [speciesOrArchetype, setSpeciesOrArchetype] = useState('Human Storyteller');
  const [backstory, setBackstory] = useState('');
  const [personalities, setPersonalities] = useState<string[]>(['Observant', 'Resolute']);
  const [traitInput, setTraitInput] = useState('');
  const [flawOrSecret, setFlawOrSecret] = useState('');
  const [signatureItem, setSignatureItem] = useState('');
  const [speechPattern, setSpeechPattern] = useState('');
  const [artisticPrompt, setArtisticPrompt] = useState('');
  const [keyColors, setKeyColors] = useState<string[]>(['#f59e0b', '#06b6d4', '#10b981']);
  const [genreAffinities, setGenreAffinities] = useState<StoryGenre[]>(['fantasy', 'steampunk']);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const startNewCharacter = () => {
    setEditingId(null);
    setPhotoUrl(SAMPLE_PORTRAIT_PRESETS[0].url);
    setName('');
    setTitleOrRole('');
    setRole('protagonist');
    setSpeciesOrArchetype('');
    setBackstory('');
    setPersonalities(['Curious', 'Uncompromising']);
    setFlawOrSecret('');
    setSignatureItem('');
    setSpeechPattern('');
    setArtisticPrompt('');
    setKeyColors(['#f59e0b', '#8b5cf6', '#ec4899']);
    setGenreAffinities(['fantasy', 'cyberpunk']);
    setAnalysisError(null);
    setIsCreating(true);
  };

  const handleEditCharacter = (char: Character) => {
    setEditingId(char.id);
    setPhotoUrl(char.visualProfile.photoUrl);
    setName(char.name);
    setTitleOrRole(char.titleOrRole);
    setRole(char.role);
    setSpeciesOrArchetype(char.visualProfile.speciesOrArchetype);
    setBackstory(char.backstory);
    setPersonalities(char.personality);
    setFlawOrSecret(char.flawOrSecret);
    setSignatureItem(char.signatureItem);
    setSpeechPattern(char.speechPattern);
    setArtisticPrompt(char.visualProfile.artisticStylePrompt);
    setKeyColors(char.visualProfile.keyColors || ['#f59e0b']);
    setGenreAffinities(char.genreAffinities || ['fantasy']);
    setAnalysisError(null);
    setIsCreating(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const base64 = event.target.result;
        setPhotoUrl(base64);
        analyzeImage(base64);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCameraCapture = (base64: string) => {
    setPhotoUrl(base64);
    analyzeImage(base64);
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    try {
      const res = await fetch('/api/character/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageBase64,
          suggestedName: name || undefined,
          preferredGenre: genreAffinities[0] || 'fantasy',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to extract character traits');
      }

      const c = data.character;
      setName(c.name || 'Mysterious Wanderer');
      setTitleOrRole(c.titleOrRole || 'The Arcane Infiltrator');
      if (c.role) setRole(c.role);
      if (c.speciesOrArchetype) setSpeciesOrArchetype(c.speciesOrArchetype);
      if (c.backstory) setBackstory(c.backstory);
      if (Array.isArray(c.personality)) setPersonalities(c.personality);
      if (c.flawOrSecret) setFlawOrSecret(c.flawOrSecret);
      if (c.signatureItem) setSignatureItem(c.signatureItem);
      if (c.speechPattern) setSpeechPattern(c.speechPattern);
      if (c.artisticStylePrompt) setArtisticPrompt(c.artisticStylePrompt);
      if (Array.isArray(c.keyColors)) setKeyColors(c.keyColors);
      if (Array.isArray(c.genreAffinities)) {
        const matched = c.genreAffinities.filter((g: any) =>
          GENRE_PRESETS.some((gp) => gp.id === g)
        );
        if (matched.length > 0) setGenreAffinities(matched);
      }
    } catch (err: any) {
      console.warn('Vision extraction fallback:', err);
      setAnalysisError(err.message || 'Vision model unavailable. You can manually customize traits.');
      // Populate creative default archetype
      if (!name) setName('Valen of the Emberveil');
      if (!titleOrRole) setTitleOrRole('The Chrono-Cartographer');
      if (!speciesOrArchetype) setSpeciesOrArchetype('Arcane Aeronaut');
      if (!flawOrSecret) setFlawOrSecret('Their mechanical chronometer counts down their fading memories.');
      if (!backstory) setBackstory('Exiled from the High Spires after discovering a rift in the royal clockwork engine.');
      if (!signatureItem) setSignatureItem('Astrolabe of Bottled Starlight');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddTrait = () => {
    if (traitInput.trim() && !personalities.includes(traitInput.trim())) {
      setPersonalities([...personalities, traitInput.trim()]);
      setTraitInput('');
    }
  };

  const handleRemoveTrait = (index: number) => {
    setPersonalities(personalities.filter((_, i) => i !== index));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const char: Character = {
      id: editingId || `char_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      userId: 'default',
      name: name.trim(),
      titleOrRole: titleOrRole.trim() || 'The Wanderer',
      role: role,
      backstory: backstory.trim() || 'A traveler between uncharted horizons.',
      personality: personalities.length > 0 ? personalities : ['Adventurous'],
      flawOrSecret: flawOrSecret.trim() || 'Harbors an unpayable blood debt to an ancient guild.',
      signatureItem: signatureItem.trim() || 'A glowing silver token',
      speechPattern: speechPattern.trim() || 'Speaks with rhythmic cadence and quiet conviction.',
      genreAffinities: genreAffinities.length > 0 ? genreAffinities : ['fantasy'],
      visualProfile: {
        photoUrl: photoUrl,
        appearanceTags: personalities,
        speciesOrArchetype: speciesOrArchetype || 'Human Archetype',
        artisticStylePrompt: artisticPrompt || `${name}, ${titleOrRole}, striking features, highly detailed`,
        keyColors: keyColors,
      },
      createdAt: editingId ? (characters.find((c) => c.id === editingId)?.createdAt || Date.now()) : Date.now(),
    };

    onSaveCharacter(char);
    setIsCreating(false);
  };

  const filteredCharacters = characters.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.titleOrRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.visualProfile.speciesOrArchetype.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || c.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Studio Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#EFEAE1] via-[#F5EFEB] to-[#EAE2D8] border border-[#DFD8CA] shadow-sm text-[#4A443F]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#B45F3C]">
            <Sparkles className="w-4 h-4" />
            <span>Character Studio & Vision Forge</span>
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#3A342F]">
            Cast & Forge Unique Story Personas
          </h2>
          <p className="text-sm text-[#6E665E] max-w-2xl leading-relaxed">
            Snap photos with your camera or upload portraits. Our multimodal AI extracts physical traits, secret flaws, signature artifacts, and distinct dialogue quirks for non-repetitive storytelling.
          </p>
        </div>

        {!isCreating && (
          <button
            id="char-studio-new-btn"
            onClick={startNewCharacter}
            className="flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#B45F3C] hover:bg-[#A05333] text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] transition-all shrink-0"
          >
            <UserPlus className="w-5 h-5" />
            <span>Create New Character</span>
          </button>
        )}
      </div>

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
      />

      {/* Creation / Edit Form Workspace */}
      {isCreating && (
        <div className="rounded-3xl bg-white border border-[#DFD8CA] p-6 sm:p-8 space-y-8 shadow-lg animate-fade-in text-[#4A443F]">
          <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-5">
            <div>
              <h3 className="font-serif text-xl font-bold text-[#3A342F]">
                {editingId ? 'Edit Character Persona' : 'Forge Character from Camera or Upload'}
              </h3>
              <p className="text-xs text-[#78716A]">
                AI Vision analyzes images to craft deep, psychologically consistent characters.
              </p>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="p-2 rounded-xl text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors border border-transparent hover:border-[#DFD8CA]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Portrait & Image Extraction Inputs */}
            <div className="lg:col-span-5 space-y-5">
              <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#ECE7DE] border border-[#DFD8CA] shadow-inner group">
                <img
                  src={photoUrl}
                  alt="Character Portrait"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />

                {isAnalyzing && (
                  <div className="absolute inset-0 bg-[#F9F7F2]/90 backdrop-blur-sm flex flex-col items-center justify-center p-4 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full border-2 border-[#5B6B56] border-t-transparent animate-spin" />
                    <p className="font-serif text-sm font-semibold text-[#3A342F]">
                      Gemini Vision Analyzing Face & Archetype...
                    </p>
                    <p className="text-xs text-[#78716A] max-w-xs">
                      Extracting visual palette, personality quirks, and anti-cliché flaw hooks
                    </p>
                  </div>
                )}
              </div>

              {analysisError && (
                <div className="p-3 rounded-xl bg-[#FAF0EB] border border-[#F0D5C7] text-[#7C3F28] text-xs flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B45F3C] shrink-0" />
                  <span>{analysisError}</span>
                </div>
              )}

              {/* Photo Input Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="char-capture-camera-btn"
                  onClick={() => setIsCameraOpen(true)}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#4A443F] text-xs font-semibold transition-all border border-[#DFD8CA] hover:border-[#5B6B56]/50 shadow-xs"
                >
                  <Camera className="w-4 h-4 text-[#5B6B56]" />
                  <span>Use Camera</span>
                </button>

                <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#4A443F] text-xs font-semibold cursor-pointer transition-all border border-[#DFD8CA] hover:border-[#B45F3C]/50 shadow-xs">
                  <Upload className="w-4 h-4 text-[#B45F3C]" />
                  <span>Upload Image</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>

              {/* Preset Portait Pickers */}
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716A]">
                  Or Pick a Portrait Preset
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SAMPLE_PORTRAIT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPhotoUrl(preset.url);
                        analyzeImage(preset.url);
                      }}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                        photoUrl === preset.url
                          ? 'border-[#5B6B56] ring-2 ring-[#5B6B56]/30'
                          : 'border-[#DFD8CA] hover:border-[#8C9A86]'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Column: Character Details Form */}
            <form onSubmit={handleSave} className="lg:col-span-7 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">
                    Character Name *
                  </label>
                  <input
                    id="char-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Milou Valen"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">
                    Title or Epithet
                  </label>
                  <input
                    id="char-title-input"
                    type="text"
                    value={titleOrRole}
                    onChange={(e) => setTitleOrRole(e.target.value)}
                    placeholder="e.g. The Chrono-Cartographer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">
                    Narrative Role
                  </label>
                  <select
                    id="char-role-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as CharacterRole)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] focus:outline-none focus:border-[#5B6B56] text-sm capitalize shadow-xs"
                  >
                    <option value="protagonist">Protagonist (Hero / Lead)</option>
                    <option value="antagonist">Antagonist (Rival / Nemesis)</option>
                    <option value="companion">Companion (Loyal Ally / Foil)</option>
                    <option value="mentor">Mentor (Wise Guide / Sage)</option>
                    <option value="deceiver">Deceiver (Unreliable Informant)</option>
                    <option value="wildcard">Wildcard (Chaotic Element)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">
                    Species / Archetype
                  </label>
                  <input
                    id="char-archetype-input"
                    type="text"
                    value={speciesOrArchetype}
                    onChange={(e) => setSpeciesOrArchetype(e.target.value)}
                    placeholder="e.g. Elven Chronomancer, Cyber-Courier"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm shadow-xs"
                  />
                </div>
              </div>

              {/* Backstory */}
              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">
                  Origin & Backstory Lore
                </label>
                <textarea
                  id="char-backstory-input"
                  rows={3}
                  value={backstory}
                  onChange={(e) => setBackstory(e.target.value)}
                  placeholder="Where do they come from? What event shattered their ordinary world?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm leading-relaxed shadow-xs"
                />
              </div>

              {/* Flaw / Secret (Crucial for anti-repetitive tension) */}
              <div className="p-3.5 rounded-2xl bg-[#FAF0EB] border border-[#F0D5C7] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7C3F28] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#B45F3C]" /> Internal Flaw / Secret Tension (Anti-Cliché Hook)
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleFlaws = [
                        'Their pocket watch does not tick for hours—it counts down until their own memory begins to unravel.',
                        'Carries an encrypted biometric lockbox containing the final message of the ruler they were framed for killing.',
                        'Cannot tell a lie when standing in moonlight without suffering physical fever.',
                        'Believes every friend they make is an illusion crafted by a subterranean sorcerer.',
                        'Secretly sold their shadow to an eclipse cult in exchange for seven days of precognition.',
                      ];
                      setFlawOrSecret(sampleFlaws[Math.floor(Math.random() * sampleFlaws.length)]);
                    }}
                    className="text-[11px] text-[#B45F3C] hover:text-[#7C3F28] underline flex items-center gap-1 font-medium"
                  >
                    <Wand2 className="w-3 h-3" /> Reroll Flaw
                  </button>
                </div>
                <input
                  id="char-flaw-input"
                  type="text"
                  value={flawOrSecret}
                  onChange={(e) => setFlawOrSecret(e.target.value)}
                  placeholder="What secret vulnerability makes their story unpredictable?"
                  className="w-full px-3 py-2 rounded-xl bg-white border border-[#E0D8CB] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#B45F3C] text-xs sm:text-sm shadow-xs"
                />
              </div>

              {/* Signature Item & Speech Pattern */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1 flex items-center gap-1">
                    <Gem className="w-3.5 h-3.5 text-[#B45F3C]" /> Signature Item / Artifact
                  </label>
                  <input
                    id="char-item-input"
                    type="text"
                    value={signatureItem}
                    onChange={(e) => setSignatureItem(e.target.value)}
                    placeholder="e.g. Luminescent Brass Chrono-Astrolabe"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] text-xs sm:text-sm shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#5B6B56]" /> Speech Pattern / Voice
                  </label>
                  <input
                    id="char-speech-input"
                    type="text"
                    value={speechPattern}
                    onChange={(e) => setSpeechPattern(e.target.value)}
                    placeholder="e.g. Speaks in measured whispers with archaic metaphors"
                    className="w-full px-3.5 py-2 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] text-xs sm:text-sm shadow-xs"
                  />
                </div>
              </div>

              {/* Personality Tags */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#4A443F]">
                  Personality Tags
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {personalities.map((trait, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#F5EFEB] text-[#4A443F] text-xs border border-[#DFD8CA]"
                    >
                      {trait}
                      <button
                        type="button"
                        onClick={() => handleRemoveTrait(idx)}
                        className="text-[#78716A] hover:text-[#933D22]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    id="char-trait-input"
                    type="text"
                    value={traitInput}
                    onChange={(e) => setTraitInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTrait();
                      }
                    }}
                    placeholder="Add trait (e.g. Razor-witted, Sentimental)"
                    className="flex-1 px-3 py-1.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] text-xs shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddTrait}
                    className="px-3.5 py-1.5 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#4A443F] text-xs font-semibold flex items-center gap-1 border border-[#DFD8CA]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#E8E2D6] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-5 py-2.5 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#6E665E] hover:text-[#3A342F] text-xs sm:text-sm font-semibold transition-colors border border-[#DFD8CA]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  id="char-save-submit-btn"
                  className="px-6 py-2.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all"
                >
                  {editingId ? 'Update Character' : 'Save to Character Roster'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Controls & Grid */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#8C827A] absolute left-3 top-3" />
            <input
              id="char-roster-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search characters by name or archetype..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-[#DFD8CA] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-xs sm:text-sm shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
            {['all', 'protagonist', 'companion', 'mentor', 'antagonist', 'wildcard'].map((r) => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  filterRole === r
                    ? 'bg-[#5B6B56] text-white shadow-xs'
                    : 'text-[#6E665E] hover:text-[#3A342F] bg-white border border-[#DFD8CA]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Character Grid */}
        {filteredCharacters.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#F5EFEB]/70 border border-[#DFD8CA] space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-[#A0988F]" />
            <h4 className="font-serif text-lg font-bold text-[#3A342F]">No Characters Found</h4>
            <p className="text-xs text-[#78716A] max-w-sm mx-auto">
              Snap a portrait with your camera or upload an image to start populating your universe!
            </p>
            <button
              onClick={startNewCharacter}
              className="px-4 py-2 rounded-xl bg-[#5B6B56] text-white font-bold text-xs shadow-xs hover:bg-[#4D5C47]"
            >
              Create Character Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCharacters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onEdit={handleEditCharacter}
                onDelete={onDeleteCharacter}
                onSelectForStory={onCastCharacter}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
