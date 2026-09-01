import { Character, StoryBook, UserAccount } from '../types';
import { INITIAL_PRESET_CHARACTERS, SAMPLE_INITIAL_BOOKS } from './presets';

const STORAGE_KEYS = {
  USER: 'milousgem_user_v1',
  CHARACTERS: 'milousgem_characters_v2',
  BOOKS: 'milousgem_books_v2',
  ACTIVE_BOOK_ID: 'milousgem_active_book_id_v2',
  READING_SETTINGS: 'milousgem_reading_settings',
  DATA_INITIALIZED: 'milousgem_clean_slate_init',
  STORY_DRAFT: 'milousgem_story_creator_draft_v2',
};

export interface StoryDraft {
  step: 1 | 2 | 3;
  title: string;
  synopsis: string;
  selectedGenre: string;
  selectedArtStyle: string;
  tone: string;
  targetChapters: number;
  entropyLevel: number;
  isKidsMode: boolean;
  targetAudience: string;
  moralLesson: string;
  generationMode: 'full_book' | 'interactive_branching';
  selectedCastIds: string[];
  lastSavedAt: number;
}

export interface ReadingSettings {
  fontSize: 'sm' | 'md' | 'lg' | 'xl';
  fontFamily: 'serif' | 'display' | 'sans' | 'crimson';
  theme: 'natural_tones' | 'parchment' | 'forest_sage' | 'warm_terracotta' | 'slate_stone';
  colorPalette: 'classic_paper' | 'midnight_galaxy' | 'forest_dream';
  ambientSound: boolean;
  autoNarration: boolean;
  speechRate: number; // 0.8 to 1.3
  bookmarks: Record<string, number>;
}

export const DEFAULT_USER: UserAccount = {
  id: 'usr_storyteller',
  name: 'Milou Storyteller',
  email: 'miloumireku@gmail.com',
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
  authProvider: 'google',
  createdAt: Date.now() - 3600 * 24 * 1000 * 5,
  genrePreferences: ['fantasy', 'magical_animals', 'bedtime_lullaby'],
  bio: 'Storyteller crafting non-repeating tales and children’s adventures.',
};

export const DEFAULT_READING_SETTINGS: ReadingSettings = {
  fontSize: 'lg',
  fontFamily: 'crimson',
  theme: 'natural_tones',
  colorPalette: 'classic_paper',
  ambientSound: false,
  autoNarration: false,
  speechRate: 1.0,
  bookmarks: {},
};

export function loadCurrentUser(): UserAccount {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading user from storage', e);
  }
  saveCurrentUser(DEFAULT_USER);
  return DEFAULT_USER;
}

export function saveCurrentUser(user: UserAccount): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  } catch (e) {
    console.error('Error saving user to storage', e);
  }
}

export function loadCharacters(): Character[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CHARACTERS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading characters from storage', e);
  }
  return [];
}

export function saveCharacters(characters: Character[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.CHARACTERS, JSON.stringify(characters));
  } catch (e) {
    console.error('Error saving characters to storage', e);
  }
}

export function loadBooks(): StoryBook[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKS);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.error('Error reading books from storage', e);
  }
  return [];
}

export function saveBooks(books: StoryBook[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.BOOKS, JSON.stringify(books));
  } catch (e) {
    console.error('Error saving books to storage', e);
  }
}

export function loadActiveBookId(): string | null {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_BOOK_ID) || null;
}

export function saveActiveBookId(id: string | null): void {
  if (id) {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BOOK_ID, id);
  } else {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_BOOK_ID);
  }
}

export function clearAllStoryData(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.BOOKS);
    localStorage.removeItem(STORAGE_KEYS.CHARACTERS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_BOOK_ID);
    localStorage.removeItem('milousgem_books_v1');
    localStorage.removeItem('milousgem_characters_v1');
  } catch (e) {
    console.error('Error clearing storage', e);
  }
}

export function loadReadingSettings(): ReadingSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.READING_SETTINGS);
    if (raw) return { ...DEFAULT_READING_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.error('Error reading settings', e);
  }
  return DEFAULT_READING_SETTINGS;
}

export function saveReadingSettings(settings: ReadingSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.READING_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Error saving settings', e);
  }
}

export function loadStoryDraft(): StoryDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STORY_DRAFT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed as StoryDraft;
    }
  } catch (e) {
    console.error('Error reading story draft from storage', e);
  }
  return null;
}

export function saveStoryDraft(draft: StoryDraft): void {
  try {
    localStorage.setItem(STORAGE_KEYS.STORY_DRAFT, JSON.stringify(draft));
  } catch (e) {
    console.error('Error saving story draft to storage', e);
  }
}

export function clearStoryDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.STORY_DRAFT);
  } catch (e) {
    console.error('Error clearing story draft from storage', e);
  }
}

