export type AuthProvider = 'google' | 'apple' | 'email' | 'guest';

export type AppView = 'library' | 'characters' | 'create_story' | 'reader' | 'voice_studio' | 'veo_motion' | 'image_studio';

export type VeoMotionType =
  | 'dynamic_video_ad'
  | 'living_portrait'
  | 'cinematic_parallax'
  | 'action_zoom'
  | 'orbit_3d';

export interface VeoAnimationProject {
  id: string;
  sourceImageUrl: string;
  motionType: VeoMotionType;
  headline: string;
  slogan: string;
  durationSec: number;
  fps: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  createdAt: number;
}

export interface ImageStudioItem {
  id: string;
  url: string;
  prompt: string;
  style: string;
  aspectRatio: string;
  createdAt: number;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  avatar: string;
  authProvider: AuthProvider;
  createdAt: number;
  genrePreferences: StoryGenre[];
  bio?: string;
}

export type CharacterRole = 'protagonist' | 'antagonist' | 'companion' | 'mentor' | 'deceiver' | 'wildcard';

export interface CharacterVisualProfile {
  photoUrl: string; // Base64 data URL or preset URL
  appearanceTags: string[]; // e.g. ["silver bob hair", "amber cybernetic eye", "trenchcoat"]
  speciesOrArchetype: string; // e.g. "Elven Chronomancer", "Cyborg Detective"
  artisticStylePrompt: string; // Prompt snippet for visual consistency in scene illustrations
  keyColors: string[];
}

export interface Character {
  id: string;
  userId: string;
  name: string;
  titleOrRole: string; // e.g. "The Reluctant Timekeeper", "Shadow Courier"
  role: CharacterRole;
  backstory: string;
  personality: string[];
  flawOrSecret: string; // Crucial for anti-repetitive, dramatic tension
  signatureItem: string;
  speechPattern: string; // e.g. "Speaks in measured whispers with archaic metaphors"
  genreAffinities: StoryGenre[];
  visualProfile: CharacterVisualProfile;
  createdAt: number;
}

export type TargetAudience = 'kids_early' | 'kids_middle' | 'young_reader' | 'all_ages' | 'general_ya';

export type StoryGenre =
  | 'fantasy'
  | 'cyberpunk'
  | 'cozy_mystery'
  | 'cosmic_horror'
  | 'steampunk'
  | 'noir'
  | 'solarpunk'
  | 'fairytale'
  | 'post_apocalyptic'
  | 'gothic_romance'
  | 'space_opera'
  | 'mythological'
  | 'magical_animals'
  | 'bedtime_lullaby'
  | 'kid_detective'
  | 'enchanted_forest';

export type StoryArtStyle =
  | 'watercolor_storybook'
  | 'kids_3d_cartoon'
  | 'cozy_picturebook'
  | 'crayon_papercraft'
  | 'gothic_oil'
  | 'cyber_concept'
  | 'vintage_ink'
  | 'studio_anime'
  | 'cinematic_realism'
  | 'dreamy_pastel';

export type StoryTone =
  | 'whimsical'
  | 'epic_heroic'
  | 'gritty_noir'
  | 'psychological_suspense'
  | 'poetic_lyrical'
  | 'dark_satirical'
  | 'heartwarming'
  | 'playful_funny'
  | 'gentle_bedtime'
  | 'curious_educational';

export interface StoryChoice {
  id: string;
  label: string;
  actionDescription: string;
  consequenceHint: string;
  riskLevel: 'safe' | 'balanced' | 'perilous' | 'unpredictable';
}

export interface PlotMemory {
  keyDecisions: string[];
  activeInventory: string[];
  characterTensions: string[];
  foreshadowedClues: string[];
  worldStateChanges: string[];
}

export interface StoryChapter {
  id: string;
  chapterNumber: number;
  title: string;
  summary: string;
  content: string; // 3-5 rich narrative paragraphs with dialogue
  illustrationPrompt: string;
  imageUrl?: string;
  imageLoading?: boolean;
  choices: StoryChoice[];
  chosenChoiceId?: string;
  memoryUpdate?: {
    newItems?: string[];
    tensionShift?: string;
    clueDiscovered?: string;
  };
  createdAt: number;
}

export interface StoryBook {
  id: string;
  userId: string;
  title: string;
  synopsis: string;
  genre: StoryGenre;
  artStyle: StoryArtStyle;
  tone: StoryTone;
  cast: Character[];
  entropyLevel: number; // 0.1 to 1.0 (anti-repetition factor)
  targetChapters: number;
  plotMemory: PlotMemory;
  chapters: StoryChapter[];
  currentChapterIndex: number;
  isCompleted: boolean;
  isFavorite: boolean;
  coverImage?: string;
  targetAudience?: TargetAudience;
  moralLesson?: string;
  isKidsMode?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface GenreDefinition {
  id: StoryGenre;
  name: string;
  tagline: string;
  description: string;
  iconName: string;
  themeColor: string; // Tailwind accent
  defaultTone: StoryTone;
  samplePromptSeed: string;
  isKidsFriendly?: boolean;
}

export interface ArtStyleDefinition {
  id: StoryArtStyle;
  name: string;
  description: string;
  sampleThumbnail: string;
  promptModifier: string;
}
