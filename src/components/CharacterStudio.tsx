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
  Users,
  UserCheck,
} from 'lucide-react';
import { Character, CharacterGender, CharacterRole, CharacterVisualProfile, StoryGenre } from '../types';
import { CharacterCard } from './CharacterCard';
import { CameraCaptureModal } from './CameraCaptureModal';
import { GENRE_PRESETS, INITIAL_PRESET_CHARACTERS } from '../utils/presets';
import { compressImageFile, compressImageDataUrl, formatBytes, CompressionResult } from '../utils/imageCompression';

interface CharacterStudioProps {
  characters: Character[];
  onSaveCharacter: (character: Character) => void;
  onDeleteCharacter: (id: string) => void;
  onCastCharacter: (character: Character) => void;
}

const SAMPLE_PORTRAIT_PRESETS = [
  {
    name: 'Maya',
    role: 'protagonist' as CharacterRole,
    gender: 'girl' as CharacterGender,
    url: '/presets/preset_maya.jpg',
    archetype: 'Pixar 3D Little Explorer',
  },
  {
    name: 'Zara',
    role: 'companion' as CharacterRole,
    gender: 'girl' as CharacterGender,
    url: '/presets/preset_zara.jpg',
    archetype: 'Pixar 3D Butterfly Dreamer',
  },
  {
    name: 'Kofi',
    role: 'companion' as CharacterRole,
    gender: 'boy' as CharacterGender,
    url: '/presets/preset_kofi.jpg',
    archetype: 'Pixar 3D Cheerful Big Brother',
  },
  {
    name: 'Ms. Elena',
    role: 'mentor' as CharacterRole,
    gender: 'woman' as CharacterGender,
    url: '/presets/preset_elena.jpg',
    archetype: 'Pixar 3D Mentor & Teacher',
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
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState<CompressionResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string>(SAMPLE_PORTRAIT_PRESETS[0].url);
  const [name, setName] = useState('');
  const [titleOrRole, setTitleOrRole] = useState('');
  const [role, setRole] = useState<CharacterRole>('protagonist');
  const [gender, setGender] = useState<CharacterGender>('girl');
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

  // Multiple Detected Characters from Photo
  const [detectedMultipleChars, setDetectedMultipleChars] = useState<any[] | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const startNewCharacter = () => {
    setEditingId(null);
    setPhotoUrl(SAMPLE_PORTRAIT_PRESETS[0].url);
    setName('');
    setTitleOrRole('');
    setRole('protagonist');
    setGender('girl');
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
    setCompressionStats(null);
    setDetectedMultipleChars(null);
    setIsCreating(true);
  };

  const handleEditCharacter = (char: Character) => {
    setEditingId(char.id);
    setPhotoUrl(char.visualProfile.photoUrl);
    setName(char.name);
    setTitleOrRole(char.titleOrRole);
    setRole(char.role);
    setGender(char.gender || 'other');
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
    setCompressionStats(null);
    setDetectedMultipleChars(null);
    setIsCreating(true);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);
    setAnalysisError(null);
    try {
      // Compress and resize client-side to ensure fast transfer and low storage
      const result = await compressImageFile(file, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85,
        mimeType: 'image/webp',
      });
      setCompressionStats(result);
      setPhotoUrl(result.dataUrl);
      await analyzeImage(result.dataUrl);
    } catch (err: any) {
      console.error('Image compression/upload failed:', err);
      setAnalysisError('Image compression failed. Using original file format.');
      const reader = new FileReader();
      reader.onload = (event) => {
        if (typeof event.target?.result === 'string') {
          const base64 = event.target.result;
          setPhotoUrl(base64);
          analyzeImage(base64);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsCompressing(false);
      e.target.value = '';
    }
  };

  const handleCameraCapture = async (base64: string) => {
    setIsCompressing(true);
    setAnalysisError(null);
    try {
      const result = await compressImageDataUrl(base64, {
        maxWidth: 1024,
        maxHeight: 1024,
        quality: 0.85,
        mimeType: 'image/webp',
      });
      setCompressionStats(result);
      setPhotoUrl(result.dataUrl);
      await analyzeImage(result.dataUrl);
    } catch (err: any) {
      console.error('Camera capture compression failed:', err);
      setPhotoUrl(base64);
      analyzeImage(base64);
    } finally {
      setIsCompressing(false);
    }
  };

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setDetectedMultipleChars(null);
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

      // Check if multiple characters were extracted
      if (Array.isArray(data.characters) && data.characters.length > 1) {
        setDetectedMultipleChars(data.characters);
        const first = data.characters[0];
        applyCharacterData(first);
      } else {
        const c = data.character || (Array.isArray(data.characters) ? data.characters[0] : null);
        if (c) {
          applyCharacterData(c);
        }
      }
    } catch (err: any) {
      console.warn('Vision extraction fallback:', err);
      setAnalysisError(err.message || 'Vision model unavailable. You can manually customize traits.');
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

  const applyCharacterData = (c: any) => {
    setName(c.name || 'Mysterious Wanderer');
    setTitleOrRole(c.titleOrRole || 'The Arcane Infiltrator');
    if (c.role) setRole(c.role);
    if (c.gender) setGender(c.gender);
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
  };

  const handleSaveAllDetectedCharacters = () => {
    if (!detectedMultipleChars || detectedMultipleChars.length === 0) return;
    detectedMultipleChars.forEach((c, idx) => {
      const newChar: Character = {
        id: `char_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
        userId: 'default',
        name: c.name || `Hero ${idx + 1}`,
        titleOrRole: c.titleOrRole || 'Companion',
        role: c.role || (idx === 0 ? 'protagonist' : 'companion'),
        gender: c.gender || 'other',
        backstory: c.backstory || 'A loyal companion in the adventure.',
        personality: Array.isArray(c.personality) ? c.personality : ['Brave', 'Kind'],
        flawOrSecret: c.flawOrSecret || 'Secretly yearns for home.',
        signatureItem: c.signatureItem || 'A lucky charm',
        speechPattern: c.speechPattern || 'Speaks clearly with warmth.',
        genreAffinities: genreAffinities.length > 0 ? genreAffinities : ['fantasy'],
        visualProfile: {
          photoUrl: photoUrl,
          appearanceTags: Array.isArray(c.personality) ? c.personality : [],
          speciesOrArchetype: c.speciesOrArchetype || 'Pixar 3D Persona',
          artisticStylePrompt: c.artisticStylePrompt || `${c.name}, 3D animated character, soft lighting`,
          keyColors: c.keyColors || keyColors,
        },
        createdAt: Date.now() + idx,
      };
      onSaveCharacter(newChar);
    });
    setDetectedMultipleChars(null);
    setIsCreating(false);
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
      gender: gender,
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
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query ||
      c.name.toLowerCase().includes(query) ||
      c.titleOrRole.toLowerCase().includes(query) ||
      (c.visualProfile?.speciesOrArchetype || '').toLowerCase().includes(query) ||
      (c.visualProfile?.appearanceTags || []).some((t) => t.toLowerCase().includes(query)) ||
      (c.personality || []).some((p) => p.toLowerCase().includes(query)) ||
      (c.backstory || '').toLowerCase().includes(query);

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
            Cast & Forge 3D Animated Story Personas
          </h2>
          <p className="text-sm text-[#6E665E] max-w-2xl leading-relaxed">
            Snap photos with your camera or upload portraits. Our multimodal AI extracts physical traits, maintains facial features, and transforms photos into Pixar-style 3D characters for non-repetitive storytelling.
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
                AI Vision analyzes faces to craft 3D Pixar-style animated characters with deep lore.
              </p>
            </div>
            <button
              onClick={() => setIsCreating(false)}
              className="p-2 rounded-xl text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors border border-transparent hover:border-[#DFD8CA]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Multiple Detected Characters Banner */}
          {detectedMultipleChars && detectedMultipleChars.length > 1 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[#EAF0E8] border border-[#D0E0CC] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#3B5436]" />
                  <span className="font-serif font-bold text-[#2C4A25] text-sm sm:text-base">
                    Detected {detectedMultipleChars.length} Characters in Photo!
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveAllDetectedCharacters}
                  className="px-4 py-2 rounded-xl bg-[#3B5436] hover:bg-[#2C4A25] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Save All {detectedMultipleChars.length} to Roster</span>
                </button>
              </div>
              <p className="text-xs text-[#3B5436]/90">
                Click any character below to inspect and customize their details before saving:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                {detectedMultipleChars.map((mc, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyCharacterData(mc)}
                    className="p-2.5 rounded-xl bg-white border border-[#D0E0CC] hover:border-[#3B5436] text-left transition-all shadow-xs"
                  >
                    <div className="text-xs font-bold text-[#2C4A25] truncate">{mc.name || `Person ${idx + 1}`}</div>
                    <div className="text-[10px] text-[#78716A] capitalize">{mc.gender || 'Character'} • {mc.role || 'Companion'}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

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
                      Gemini Vision Transforming to 3D Pixar Style...
                    </p>
                    <p className="text-xs text-[#78716A] max-w-xs">
                      Preserving hair, facial features, and styling in soft magical lighting
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

              {/* Compression feedback badge */}
              {compressionStats && (
                <div className="p-2.5 rounded-xl bg-[#EAF0E8] border border-[#CAD7C6] text-[#2D3A2B] text-xs flex items-center justify-between shadow-xs animate-fade-in">
                  <div className="flex items-center gap-1.5 font-medium">
                    <Check className="w-3.5 h-3.5 text-[#5B6B56]" />
                    <span>Image Compressed & Optimized</span>
                  </div>
                  <div className="text-[11px] text-[#4A5D44] font-mono font-semibold">
                    {formatBytes(compressionStats.originalSize)} → {formatBytes(compressionStats.compressedSize)} (-{compressionStats.reductionPercentage}%)
                  </div>
                </div>
              )}

              {isCompressing && (
                <div className="p-2.5 rounded-xl bg-[#F5EFEB] border border-[#DFD8CA] text-[#4A443F] text-xs flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 text-[#5B6B56] animate-spin" />
                  <span>Compressing & optimizing image fidelity...</span>
                </div>
              )}

              {/* Photo Input Buttons (Upload & Camera only) */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  id="char-capture-camera-btn"
                  onClick={() => setIsCameraOpen(true)}
                  disabled={isCompressing || isAnalyzing}
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] disabled:opacity-50 text-[#4A443F] text-xs font-semibold transition-all border border-[#DFD8CA] hover:border-[#5B6B56]/50 shadow-xs"
                >
                  <Camera className="w-4 h-4 text-[#5B6B56]" />
                  <span>Use Camera</span>
                </button>

                <label className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#4A443F] text-xs font-semibold cursor-pointer transition-all border border-[#DFD8CA] hover:border-[#B45F3C]/50 shadow-xs">
                  <Upload className="w-4 h-4 text-[#B45F3C]" />
                  <span>Upload Photo</span>
                  <input type="file" accept="image/*" onChange={handleFileUpload} disabled={isCompressing || isAnalyzing} className="hidden" />
                </label>
              </div>

              {/* Preset Portait Pickers */}
              <div className="space-y-2 pt-2">
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#78716A]">
                  Or Pick a Preset Avatar
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {SAMPLE_PORTRAIT_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setPhotoUrl(preset.url);
                        const matched = INITIAL_PRESET_CHARACTERS.find(
                          (c) =>
                            c.name.toLowerCase() === preset.name.toLowerCase() ||
                            c.visualProfile.photoUrl === preset.url
                        );
                        if (matched) {
                          applyCharacterData({
                            name: matched.name,
                            titleOrRole: matched.titleOrRole,
                            role: matched.role,
                            gender: matched.gender,
                            speciesOrArchetype: matched.visualProfile?.speciesOrArchetype,
                            backstory: matched.backstory,
                            personality: matched.personality,
                            flawOrSecret: matched.flawOrSecret,
                            signatureItem: matched.signatureItem,
                            speechPattern: matched.speechPattern,
                            artisticStylePrompt: matched.visualProfile?.artisticStylePrompt,
                            keyColors: matched.visualProfile?.keyColors,
                            genreAffinities: matched.genreAffinities,
                          });
                        } else {
                          analyzeImage(preset.url);
                        }
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
                    placeholder="e.g. The Brave Explorer"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm shadow-xs"
                  />
                </div>
              </div>

              {/* Gender & Role Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">
                    Gender Identity
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'girl', label: 'Girl' },
                      { id: 'boy', label: 'Boy' },
                      { id: 'woman', label: 'Woman' },
                      { id: 'man', label: 'Man' },
                      { id: 'non_binary', label: 'Non-Binary' },
                      { id: 'other', label: 'Other' },
                    ].map((g) => (
                      <button
                        key={g.id}
                        type="button"
                        onClick={() => setGender(g.id as CharacterGender)}
                        className={`py-1.5 px-2 rounded-xl text-xs font-semibold border transition-all text-center ${
                          gender === g.id
                            ? 'bg-[#5B6B56] text-white border-[#5B6B56] shadow-xs'
                            : 'bg-[#FDFCF9] text-[#4A443F] border-[#DCD5C9] hover:bg-[#F5EFEB]'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

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
                    <option value="companion">Companion (Loyal Ally / Foil)</option>
                    <option value="mentor">Mentor (Wise Guide / Sage)</option>
                    <option value="antagonist">Antagonist (Rival / Nemesis)</option>
                    <option value="deceiver">Deceiver (Unreliable Informant)</option>
                    <option value="wildcard">Wildcard (Chaotic Element)</option>
                  </select>
                </div>
              </div>

              {/* Species / Archetype */}
              <div>
                <label className="block text-xs font-medium text-[#4A443F] mb-1">
                  Species / Archetype
                </label>
                <input
                  id="char-archetype-input"
                  type="text"
                  value={speciesOrArchetype}
                  onChange={(e) => setSpeciesOrArchetype(e.target.value)}
                  placeholder="e.g. Pixar 3D Star-Gazer, Woodland Explorer"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm shadow-xs"
                />
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
                  placeholder="Where do they come from? What event sets their journey into motion?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-sm leading-relaxed shadow-xs"
                />
              </div>

              {/* Flaw / Secret */}
              <div className="p-3.5 rounded-2xl bg-[#FAF0EB] border border-[#F0D5C7] space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7C3F28] flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-[#B45F3C]" /> Internal Flaw / Secret Tension
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const sampleFlaws = [
                        'Always hesitates to ask for help when solving difficult puzzles.',
                        'Secretly worries they are not as brave as their friends think.',
                        'Cannot resist exploring mysterious glowing trails even after bedtime.',
                        'Their pocket watch does not tick for hours—it counts down memories.',
                        'Believes every friend they make is crafted from starlight.',
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
                  placeholder="What secret vulnerability makes their story unique?"
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
                    placeholder="e.g. Luminescent Starlight Compass"
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
                    placeholder="e.g. Speaks with cheerful enthusiasm and wonder"
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
                    placeholder="Add trait (e.g. Brave, Playful, Curious)"
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
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Search Bar with Clear Button */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-[#8C827A] absolute left-3.5 top-3 pointer-events-none" />
              <input
                id="char-roster-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, archetype, trait..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#DFD8CA] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] focus:ring-1 focus:ring-[#5B6B56]/20 text-xs sm:text-sm shadow-xs"
              />
              {searchQuery && (
                <button
                  type="button"
                  id="char-roster-search-clear"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 p-0.5 rounded-md text-[#8C827A] hover:text-[#3A342F] hover:bg-[#F5EFEB]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role Filter Buttons */}
            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
              {['all', 'protagonist', 'companion', 'mentor', 'antagonist', 'wildcard'].map((r) => (
                <button
                  key={r}
                  id={`char-filter-role-${r}`}
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

          {/* Quick Archetype & Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#78716A] pt-1">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <span className="font-medium text-[#4A443F] shrink-0">Popular Archetypes:</span>
              {['Pixar 3D', 'Explorer', 'Dreamer', 'Mentor', 'Wanderer', 'Aeronaut'].map((archetype) => (
                <button
                  key={archetype}
                  type="button"
                  onClick={() => setSearchQuery(archetype)}
                  className="px-2 py-0.5 rounded-lg bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#5B554F] border border-[#DFD8CA] text-[11px] whitespace-nowrap transition-colors"
                >
                  {archetype}
                </button>
              ))}
            </div>

            <span className="font-medium text-[#5B6B56] shrink-0">
              Showing {filteredCharacters.length} of {characters.length} characters
            </span>
          </div>
        </div>

        {/* Character Grid */}
        {filteredCharacters.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-[#F5EFEB]/70 border border-[#DFD8CA] space-y-3">
            <Sparkles className="w-8 h-8 mx-auto text-[#A0988F]" />
            <h4 className="font-serif text-lg font-bold text-[#3A342F]">No Characters Match Your Search</h4>
            <p className="text-xs text-[#78716A] max-w-sm mx-auto">
              {searchQuery || filterRole !== 'all'
                ? `No character found matching "${searchQuery || filterRole}". Try clearing your filters or create a new persona.`
                : 'Snap a portrait with your camera or upload an image to start populating your universe!'}
            </p>
            <div className="flex items-center justify-center gap-3 pt-1">
              {(searchQuery || filterRole !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterRole('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-white border border-[#DFD8CA] text-[#4A443F] font-semibold text-xs shadow-xs hover:bg-[#F5EFEB]"
                >
                  Clear Filters
                </button>
              )}
              <button
                onClick={startNewCharacter}
                className="px-4 py-2 rounded-xl bg-[#5B6B56] text-white font-bold text-xs shadow-xs hover:bg-[#4D5C47]"
              >
                Create Character Now
              </button>
            </div>
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
