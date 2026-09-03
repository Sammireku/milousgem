import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Bookmark,
  Share2,
  Download,
  Eye,
  RefreshCw,
  Feather,
  CheckCircle2,
  ShieldAlert,
  Gem,
  Sliders,
  Layers,
  ArrowRight,
  Maximize2,
  X,
  Printer,
  FileText,
  BookMarked,
  Check,
  Baby,
  Languages,
  Globe,
  StickyNote,
  Compass,
  Music,
  Moon,
  Sun,
  Palette,
  HelpCircle,
  Heart,
  Smile,
} from 'lucide-react';
import { StoryBook, StoryChapter, StoryChoice, Character } from '../types';
import { ReadingSettings } from '../utils/storage';
import { narrator } from '../utils/speech';
import {
  exportStoryToPDF,
  printStoryToPDF,
  exportStoryToEPUB,
  exportStoryToText,
  shareStory,
} from '../utils/exportStory';
import { MarginNotesSidebar } from './MarginNotesSidebar';
import { StoryJourneyMap } from './StoryJourneyMap';
import { VocabularyModal, VocabularyEntry } from './VocabularyModal';
import { ColoringPageModal } from './ColoringPageModal';
import { ambientSound, SOUNDSCAPE_OPTIONS, SoundscapeType } from '../utils/ambientSound';
import { STORY_VOCABULARY_DATABASE } from '../utils/vocabulary';
import confetti from 'canvas-confetti';

export interface LanguageOption {
  id: string;
  name: string;
  nativeName: string;
  flag: string;
  speechCode: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { id: 'en', name: 'English', nativeName: 'English (Original)', flag: '🇬🇧', speechCode: 'en-US' },
  { id: 'nl', name: 'Dutch', nativeName: 'Nederlands', flag: '🇳🇱', speechCode: 'nl-NL' },
  { id: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', speechCode: 'es-ES' },
  { id: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', speechCode: 'fr-FR' },
  { id: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', speechCode: 'de-DE' },
  { id: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', speechCode: 'ja-JP' },
  { id: 'zh', name: 'Mandarin', nativeName: '中文', flag: '🇨🇳', speechCode: 'zh-CN' },
  { id: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', speechCode: 'it-IT' },
];

interface StoryReaderProps {
  book: StoryBook;
  onUpdateBook: (book: StoryBook) => void;
  readingSettings: ReadingSettings;
  onUpdateSettings: (settings: ReadingSettings) => void;
  onBackToLibrary: () => void;
}

const THEME_STYLES: Record<string, { bg: string; text: string; proseBg: string; border: string; accent: string }> = {
  natural_tones: {
    bg: 'bg-[#F9F7F2]',
    text: 'text-[#4A443F]',
    proseBg: 'bg-white',
    border: 'border-[#DFD8CA]',
    accent: 'text-[#5B6B56]',
  },
  parchment: {
    bg: 'bg-[#F4EBD0]',
    text: 'text-[#3E3832]',
    proseBg: 'bg-[#FCF7E8]',
    border: 'border-[#DFD0A8]',
    accent: 'text-[#8C5D39]',
  },
  forest_sage: {
    bg: 'bg-[#EAEFE9]',
    text: 'text-[#2D3A2B]',
    proseBg: 'bg-[#F6F9F5]',
    border: 'border-[#CAD7C6]',
    accent: 'text-[#4A6344]',
  },
  warm_terracotta: {
    bg: 'bg-[#F7EFEA]',
    text: 'text-[#47332B]',
    proseBg: 'bg-[#FFF9F6]',
    border: 'border-[#EAD5CB]',
    accent: 'text-[#B45F3C]',
  },
  slate_stone: {
    bg: 'bg-[#2E2A27]',
    text: 'text-[#F5EFEB]',
    proseBg: 'bg-[#3A3531]',
    border: 'border-[#4A443F]',
    accent: 'text-[#D0A97E]',
  },
  classic_paper: {
    bg: 'bg-[#FDFBF7]',
    text: 'text-[#3A342F]',
    proseBg: 'bg-[#FAF6EE]',
    border: 'border-[#E2DAC8]',
    accent: 'text-[#8C5D39]',
  },
  midnight_galaxy: {
    bg: 'bg-[#121526]',
    text: 'text-[#EAEFFE]',
    proseBg: 'bg-[#1A1E36]',
    border: 'border-[#2D3559]',
    accent: 'text-[#7AA2F7]',
  },
  forest_dream: {
    bg: 'bg-[#18231C]',
    text: 'text-[#E4EFE7]',
    proseBg: 'bg-[#223127]',
    border: 'border-[#384E3F]',
    accent: 'text-[#9ECE6A]',
  },
  bedtime_amber: {
    bg: 'bg-[#1C1815]',
    text: 'text-[#E8DFC8]',
    proseBg: 'bg-[#26211C]',
    border: 'border-[#3D342C]',
    accent: 'text-[#E0A868]',
  },
};

export const StoryReader: React.FC<StoryReaderProps> = ({
  book,
  onUpdateBook,
  readingSettings,
  onUpdateSettings,
  onBackToLibrary,
}) => {
  const currentChapterIndex = book.currentChapterIndex;
  const currentChapter: StoryChapter = book.chapters[currentChapterIndex] || book.chapters[0];

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [selectedChoiceId, setSelectedChoiceId] = useState<string | null>(null);
  const [customAction, setCustomAction] = useState('');
  const [isAdvancingChapter, setIsAdvancingChapter] = useState(false);
  const [advancingStatus, setAdvancingStatus] = useState('');
  const [advancingError, setAdvancingError] = useState<string | null>(null);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isMarginNotesOpen, setIsMarginNotesOpen] = useState(false);
  const [exportLoading, setExportLoading] = useState<'pdf' | 'print' | 'epub' | 'txt' | 'share' | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  // New Interactive Feature States
  const [isJourneyMapOpen, setIsJourneyMapOpen] = useState(false);
  const [isColoringModalOpen, setIsColoringModalOpen] = useState(false);
  const [isVocabModalOpen, setIsVocabModalOpen] = useState(false);
  const [selectedVocabEntry, setSelectedVocabEntry] = useState<VocabularyEntry | null>(null);
  const [showSoundscapeMenu, setShowSoundscapeMenu] = useState(false);

  // Margin Notes count calculation
  const currentChapterNotesCount = (currentChapter.notes || []).length;
  const totalBookNotesCount = book.chapters.reduce(
    (acc, chap) => acc + (chap.notes ? chap.notes.length : 0),
    0
  );

  // Mobile Navigation & One-Handed Reading State
  const [isMobileToolsDrawerOpen, setIsMobileToolsDrawerOpen] = useState(false);
  const [oneHandTapEnabled, setOneHandTapEnabled] = useState(true);
  const [tapFeedbackSide, setTapFeedbackSide] = useState<'left' | 'right' | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  // Multi-Language & Dutch Translation State
  const [selectedLanguage, setSelectedLanguage] = useState<string>('en');
  const [translationsCache, setTranslationsCache] = useState<
    Record<string, { title: string; summary?: string; content: string; targetLanguage: string }>
  >({});
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [isBilingualMode, setIsBilingualMode] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);

  // Active translation for current chapter
  const currentTranslationKey = `${currentChapter.id}_${selectedLanguage}`;
  const activeTranslation = selectedLanguage !== 'en' ? translationsCache[currentTranslationKey] : null;
  const currentLangOption = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  // Lazy Image Prefetch Engine: Automatically generate artwork for current and upcoming pages (lookahead = 2)
  const pendingLazyPages = useRef<Set<number>>(new Set());
  const [lazyLoadingPages, setLazyLoadingPages] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const lookAheadCount = 2;
    const startIdx = Math.max(0, currentChapterIndex);
    const endIdx = Math.min(book.chapters.length - 1, currentChapterIndex + lookAheadCount);

    for (let idx = startIdx; idx <= endIdx; idx++) {
      const ch = book.chapters[idx];
      if (!ch) continue;

      const isMissingImage = !ch.imageUrl || ch.imageUrl === '';
      if (isMissingImage && !pendingLazyPages.current.has(idx)) {
        pendingLazyPages.current.add(idx);
        setLazyLoadingPages((prev) => ({ ...prev, [idx]: true }));

        const characterAnchorsString = (book.cast || [])
          .map((c) => `${c.name}: ${c.appearanceTags?.join(', ') || c.visualProfile?.artisticStylePrompt || ''}`)
          .join('; ');

        fetch('/api/story/generate-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: ch.illustrationPrompt || `${book.title}, Chapter ${ch.chapterNumber || idx + 1} scene`,
            storyText: ch.content || '',
            artStyle: book.artStyle || 'hyper_articulated_realism',
            aspectRatio: '16:9',
            characterAnchors: characterAnchorsString,
            chapterNumber: ch.chapterNumber || idx + 1,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.imageUrl) {
              const updatedChapters = [...book.chapters];
              if (updatedChapters[idx]) {
                updatedChapters[idx] = { ...updatedChapters[idx], imageUrl: data.imageUrl };
                onUpdateBook({ ...book, chapters: updatedChapters });
              }
            }
          })
          .catch((err) => {
            console.warn(`Lazy image generation failed for chapter ${idx + 1}:`, err);
          })
          .finally(() => {
            pendingLazyPages.current.delete(idx);
            setLazyLoadingPages((prev) => ({ ...prev, [idx]: false }));
          });
      }
    }
  }, [currentChapterIndex, book.chapters, book.id]);

  // Sync ambient soundscape with settings
  useEffect(() => {
    if (readingSettings.ambientSound && readingSettings.soundscapeType && readingSettings.soundscapeType !== 'none') {
      ambientSound.play(readingSettings.soundscapeType, readingSettings.soundscapeVolume ?? 0.35);
    } else {
      ambientSound.stop();
    }
    return () => {
      ambientSound.stop();
    };
  }, [readingSettings.ambientSound, readingSettings.soundscapeType]);

  const handleToggleSoundscape = (type: SoundscapeType) => {
    if (type === 'none') {
      onUpdateSettings({
        ...readingSettings,
        ambientSound: false,
        soundscapeType: 'none',
      });
      ambientSound.stop();
    } else {
      onUpdateSettings({
        ...readingSettings,
        ambientSound: true,
        soundscapeType: type,
      });
      ambientSound.play(type, readingSettings.soundscapeVolume ?? 0.35);
    }
  };

  const handleVolumeChange = (vol: number) => {
    onUpdateSettings({
      ...readingSettings,
      soundscapeVolume: vol,
    });
    ambientSound.setVolume(vol);
  };

  const handleToggleBedtimeMode = () => {
    const nextBedtime = !readingSettings.bedtimeMode;
    onUpdateSettings({
      ...readingSettings,
      bedtimeMode: nextBedtime,
      speechRate: nextBedtime ? 0.9 : 1.0, // gentle slower bedtime pace
    });
  };

  const handleWordClick = (wordText: string) => {
    const cleanWord = wordText.toLowerCase().replace(/[^a-z]/g, '');
    const entry = STORY_VOCABULARY_DATABASE[cleanWord];
    if (entry) {
      setSelectedVocabEntry(entry);
      setIsVocabModalOpen(true);
    } else {
      // General dynamic lookup
      setSelectedVocabEntry({
        word: cleanWord,
        phonetic: cleanWord,
        partOfSpeech: 'story word',
        definition: `A memorable key word appearing in Chapter ${currentChapter.chapterNumber}.`,
        childFriendlyExplanation: `This word was highlighted in ${book.title}. Tap 'Save to Margin Notes' to write a personal study note!`,
        exampleSentence: `"...${wordText}..."`,
        synonyms: [],
      });
      setIsVocabModalOpen(true);
    }
  };

  // Helper to render interactive text with vocabulary words highlighted
  const renderInteractiveParagraph = (text: string, isFirstParagraph: boolean) => {
    const words = text.split(/(\s+)/);
    const elements: React.ReactNode[] = [];

    words.forEach((word, idx) => {
      const clean = word.toLowerCase().replace(/[^a-z]/g, '');
      const isVocab = readingSettings.interactiveVocab !== false && !!STORY_VOCABULARY_DATABASE[clean];

      if (isVocab) {
        elements.push(
          <span
            key={idx}
            onClick={() => handleWordClick(clean)}
            className="cursor-pointer underline decoration-dotted decoration-[#5B6B56] hover:decoration-solid hover:bg-[#EAF0E8] hover:text-[#3B5436] rounded-xs px-0.5 transition-all text-[#3B5436] font-medium"
            title={`Explore word: ${clean}`}
          >
            {word}
          </span>
        );
      } else {
        elements.push(word);
      }
    });

    if (isFirstParagraph && elements.length > 0) {
      return (
        <>
          <span className="float-left text-4xl sm:text-5xl font-bold font-serif leading-none pr-3 pt-1 text-[#5B6B56]">
            {text.charAt(0)}
          </span>
          {elements}
        </>
      );
    }

    return elements;
  };

  const handleSelectLanguage = async (langId: string) => {
    setSelectedLanguage(langId);
    setShowLanguageMenu(false);
    narrator.stop();
    setIsSpeaking(false);

    if (langId === 'en') return;

    const cacheKey = `${currentChapter.id}_${langId}`;
    if (translationsCache[cacheKey]) {
      return;
    }

    const targetOption = SUPPORTED_LANGUAGES.find((l) => l.id === langId);
    if (!targetOption) return;

    setIsTranslating(true);
    setTranslationError(null);

    try {
      const res = await fetch('/api/story/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: currentChapter.title,
          summary: currentChapter.summary,
          content: currentChapter.content,
          targetLanguage: targetOption.name,
          tone: book.tone,
          isKidsMode: book.isKidsMode,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTranslationsCache((prev) => ({
          ...prev,
          [cacheKey]: {
            title: data.translatedTitle || currentChapter.title,
            summary: data.translatedSummary || currentChapter.summary,
            content: data.translatedContent || currentChapter.content,
            targetLanguage: targetOption.name,
          },
        }));
      } else {
        throw new Error(data.error || 'Translation failed');
      }
    } catch (err: any) {
      console.error('Translation error:', err);
      setTranslationError(`Could not translate into ${targetOption.name}. Please try again.`);
    } finally {
      setIsTranslating(false);
    }
  };

  // Re-fetch translation automatically when chapter index changes if a language is selected
  useEffect(() => {
    if (selectedLanguage !== 'en') {
      const cacheKey = `${currentChapter.id}_${selectedLanguage}`;
      if (!translationsCache[cacheKey]) {
        handleSelectLanguage(selectedLanguage);
      }
    }
  }, [currentChapterIndex, selectedLanguage, currentChapter.id]);

  // Bookmark: Resume where left off on initial open
  useEffect(() => {
    const savedPage = readingSettings.bookmarks[book.id];
    if (savedPage !== undefined && savedPage >= 0 && savedPage < book.chapters.length && savedPage !== currentChapterIndex) {
      onUpdateBook({ ...book, currentChapterIndex: savedPage });
    }
  }, [book.id]);

  // Keep bookmarks saved for this book
  useEffect(() => {
    if (readingSettings.bookmarks[book.id] !== currentChapterIndex) {
      onUpdateSettings({
        ...readingSettings,
        bookmarks: { ...readingSettings.bookmarks, [book.id]: currentChapterIndex },
      });
    }
  }, [currentChapterIndex, book.id]);

  const activePaletteKey = readingSettings.colorPalette || readingSettings.theme || 'natural_tones';
  const themeStyle = THEME_STYLES[activePaletteKey] || THEME_STYLES[readingSettings.theme] || THEME_STYLES.natural_tones;

  // Sync speech state
  useEffect(() => {
    narrator.setListener((speaking) => {
      setIsSpeaking(speaking);
    });

    return () => {
      narrator.stop();
    };
  }, []);

  // Stop speech when chapter changes
  useEffect(() => {
    narrator.stop();
    setIsSpeaking(false);
    setSelectedChoiceId(null);
    setCustomAction('');
  }, [currentChapterIndex]);

  // Chapter Navigation with Voice Cleanup & Visual Feedback
  const handlePreviousPage = () => {
    if (currentChapterIndex > 0) {
      narrator.stop();
      setIsSpeaking(false);
      setTapFeedbackSide('left');
      setTimeout(() => setTapFeedbackSide(null), 400);
      onUpdateBook({ ...book, currentChapterIndex: currentChapterIndex - 1 });
    }
  };

  const handleNextPage = () => {
    if (currentChapterIndex < book.chapters.length - 1) {
      narrator.stop();
      setIsSpeaking(false);
      setTapFeedbackSide('right');
      setTimeout(() => setTapFeedbackSide(null), 400);
      onUpdateBook({ ...book, currentChapterIndex: currentChapterIndex + 1 });
    }
  };

  // Keyboard Navigation: Left / Right Arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = (document.activeElement as HTMLElement)?.tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) return;
      if (e.key === 'ArrowLeft') {
        handlePreviousPage();
      } else if (e.key === 'ArrowRight') {
        handleNextPage();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentChapterIndex, book.chapters.length]);

  // Touch Swipe Gesture Handling (Swipe Left -> Next Page, Swipe Right -> Prev Page)
  const handleReaderTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const handleReaderTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const deltaX = touchStartX - touchEndX;
    const deltaY = touchStartY - touchEndY;

    // Trigger only if horizontal swipe dominates and exceeds threshold
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX > 0) {
        // Swiped Left -> Advance to Next Page
        handleNextPage();
      } else {
        // Swiped Right -> Return to Previous Page
        handlePreviousPage();
      }
    }
    setTouchStartX(null);
    setTouchStartY(null);
  };

  const handleToggleNarration = () => {
    if (isSpeaking) {
      narrator.stop();
    } else {
      const activeTitle = activeTranslation?.title || currentChapter.title;
      const activeContent = activeTranslation?.content || currentChapter.content;
      const fullText = `${activeTitle}. ${activeContent}`;
      narrator.speak(fullText, {
        rate: readingSettings.speechRate,
        lang: currentLangOption.speechCode,
        onEnd: () => setIsSpeaking(false),
      });
    }
  };

  const handleRegenerateSceneIllustration = async () => {
    setIsRegeneratingImage(true);
    try {
      const res = await fetch('/api/story/generate-illustration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: currentChapter.illustrationPrompt,
          storyText: currentChapter.content,
          artStyle: book.artStyle,
          aspectRatio: '16:9',
          characterAnchors: book.cast.map((c) => `${c.name}: ${c.appearanceTags?.join(', ')}`).join('; '),
          chapterNumber: currentChapter.chapterNumber,
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        const updatedChapters = [...book.chapters];
        updatedChapters[currentChapterIndex] = {
          ...currentChapter,
          imageUrl: data.imageUrl,
          illustrationPrompt: data.injectedPrompt || currentChapter.illustrationPrompt,
        };
        onUpdateBook({
          ...book,
          chapters: updatedChapters,
          coverImage: currentChapterIndex === 0 ? data.imageUrl : book.coverImage,
        });
      }
    } catch (e) {
      console.error('Error regenerating image:', e);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  const handleAdvanceChapter = async () => {
    const nextChapterNumber = currentChapter.chapterNumber + 1;
    const isNextFinal = nextChapterNumber >= book.targetChapters;

    const chosenChoice = currentChapter.choices.find((c) => c.id === selectedChoiceId);
    const chosenActionText = customAction.trim() || chosenChoice?.actionDescription || chosenChoice?.label || 'Continued the pursuit';

    setIsAdvancingChapter(true);
    setAdvancingStatus(book.isKidsMode ? `Weaving kids adventure Chapter ${nextChapterNumber}...` : `Weaving Chapter ${nextChapterNumber}...`);

    try {
      // Summarize previous chapters for anti-repetition context
      const prevSummary = book.chapters
        .map((ch) => `Chapter ${ch.chapterNumber} (${ch.title}): ${ch.summary}`)
        .join('\n');

      const res = await fetch('/api/story/generate-chapter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          genre: book.genre,
          artStyle: book.artStyle,
          tone: book.tone,
          cast: book.cast,
          bookTitle: book.title,
          synopsis: book.synopsis,
          chapterNumber: nextChapterNumber,
          totalTargetChapters: book.targetChapters,
          targetAudience: book.targetAudience || 'all_ages',
          moralLesson: book.moralLesson || '',
          isKidsMode: book.isKidsMode || false,
          plotMemory: book.plotMemory,
          historyBuffer: book.plotMemory?.historyBuffer,
          previousChaptersSummary: prevSummary,
          chosenChoiceAction: chosenActionText,
          entropyLevel: book.entropyLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to advance chapter');
      }

      const nextChapData = data.chapter;

      setAdvancingStatus(`Painting scene illustration for Chapter ${nextChapterNumber}...`);

      // Generate scene illustration with Page Context Injection
      let nextImageUrl = '';
      try {
        const illuRes = await fetch('/api/story/generate-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: nextChapData.illustrationPrompt,
            storyText: nextChapData.content,
            artStyle: book.artStyle,
            aspectRatio: '16:9',
            characterAnchors: book.cast.map((c) => `${c.name}: ${c.appearanceTags?.join(', ')}`).join('; '),
            chapterNumber: nextChapterNumber,
          }),
        });
        const illuData = await illuRes.json();
        if (illuData.success && illuData.imageUrl) {
          nextImageUrl = illuData.imageUrl;
        }
      } catch (illuErr) {
        console.warn('Next chapter image generation fallback:', illuErr);
      }

      const newChapter: StoryChapter = {
        id: `chap_${nextChapterNumber}_${Date.now()}`,
        chapterNumber: nextChapterNumber,
        title: nextChapData.title || `Chapter ${nextChapterNumber}`,
        summary: nextChapData.summary || 'The narrative deepens...',
        content: nextChapData.content || 'The journey carried forward into the unknown.',
        illustrationPrompt: nextChapData.illustrationPrompt,
        imageUrl: nextImageUrl || book.cast[0]?.visualProfile.photoUrl,
        choices: nextChapData.choices || [],
        memoryUpdate: nextChapData.memoryUpdate,
        createdAt: Date.now(),
      };

      // Mark current chapter's chosen choice
      const updatedExistingChapters = [...book.chapters];
      updatedExistingChapters[currentChapterIndex] = {
        ...currentChapter,
        chosenChoiceId: selectedChoiceId || 'custom_action',
      };

      const updatedPlotMemory = {
        keyDecisions: [...book.plotMemory.keyDecisions, chosenActionText],
        activeInventory: [
          ...book.plotMemory.activeInventory,
          ...(nextChapData.memoryUpdate?.newItems || []),
        ],
        characterTensions: [
          ...book.plotMemory.characterTensions,
          ...(nextChapData.memoryUpdate?.tensionShift ? [nextChapData.memoryUpdate.tensionShift] : []),
        ],
        foreshadowedClues: [
          ...book.plotMemory.foreshadowedClues,
          ...(nextChapData.memoryUpdate?.clueDiscovered ? [nextChapData.memoryUpdate.clueDiscovered] : []),
        ],
        worldStateChanges: [
          ...book.plotMemory.worldStateChanges,
          ...(nextChapData.memoryUpdate?.worldStateChanges || []),
        ],
        historyBuffer: data.historyBuffer || book.plotMemory?.historyBuffer,
      };

      const updatedBook: StoryBook = {
        ...book,
        chapters: [...updatedExistingChapters, newChapter],
        currentChapterIndex: updatedExistingChapters.length,
        plotMemory: updatedPlotMemory,
        isCompleted: isNextFinal,
        updatedAt: Date.now(),
      };

      onUpdateBook(updatedBook);

      if (isNextFinal) {
        try {
          confetti({
            particleCount: 100,
            spread: 90,
            origin: { y: 0.5 },
          });
        } catch (e) {}
      }
    } catch (err: any) {
      console.error('Error advancing chapter:', err);
      setAdvancingError(err.message || 'Failed to generate next chapter. Please try again.');
    } finally {
      setIsAdvancingChapter(false);
      setAdvancingStatus('');
    }
  };

  const handlePrintPDF = () => {
    setExportLoading('print');
    try {
      printStoryToPDF(book);
      setShareFeedback('Opening Print to PDF preview...');
      setTimeout(() => setShareFeedback(null), 3500);
    } catch (e) {
      console.error('Print to PDF failed:', e);
    } finally {
      setExportLoading(null);
      setShowExportMenu(false);
    }
  };

  const handleExportPDF = async () => {
    setExportLoading('pdf');
    try {
      await exportStoryToPDF(book);
    } catch (e) {
      console.error('PDF export failed:', e);
    } finally {
      setExportLoading(null);
      setShowExportMenu(false);
    }
  };

  const handleExportEPUB = async () => {
    setExportLoading('epub');
    try {
      await exportStoryToEPUB(book);
    } catch (e) {
      console.error('EPUB export failed:', e);
    } finally {
      setExportLoading(null);
      setShowExportMenu(false);
    }
  };

  const handleExportTXT = () => {
    setExportLoading('txt');
    try {
      exportStoryToText(book);
    } catch (e) {
      console.error('TXT export failed:', e);
    } finally {
      setExportLoading(null);
      setShowExportMenu(false);
    }
  };

  const handleShare = async () => {
    setExportLoading('share');
    try {
      const result = await shareStory(book, 'txt');
      setShareFeedback(result.message || 'Shared successfully!');
      setTimeout(() => setShareFeedback(null), 3000);
    } catch (e) {
      console.error('Share failed:', e);
    } finally {
      setExportLoading(null);
      setShowExportMenu(false);
    }
  };

  const fontClass =
    readingSettings.fontFamily === 'serif'
      ? 'font-serif'
      : readingSettings.fontFamily === 'display'
      ? 'font-display'
      : readingSettings.fontFamily === 'crimson'
      ? 'font-serif tracking-normal'
      : 'font-sans';

  const textSizeClass =
    readingSettings.fontSize === 'sm'
      ? 'text-sm sm:text-base leading-relaxed'
      : readingSettings.fontSize === 'md'
      ? 'text-base sm:text-lg leading-relaxed'
      : readingSettings.fontSize === 'lg'
      ? 'text-lg sm:text-xl leading-loose'
      : 'text-xl sm:text-2xl leading-loose';

  return (
    <div className={`min-h-screen ${themeStyle.bg} ${themeStyle.text} transition-colors duration-300 pb-20 animate-fade-in`}>
      {/* Top Reading Navigation Bar */}
      <div className={`sticky top-16 z-30 w-full border-b ${themeStyle.border} ${themeStyle.bg}/95 backdrop-blur-md px-3 sm:px-8 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4`}>
        {/* Left: Library Back & Book Title */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1 p-2 sm:p-0 rounded-xl sm:rounded-none bg-white sm:bg-transparent border sm:border-0 border-[#DFD8CA] text-xs font-semibold text-[#5B6B56] hover:text-[#3A342F] transition-colors shrink-0 shadow-xs sm:shadow-none"
            title="Return to Storybook Library"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <span className="text-[#C5BCB0] hidden sm:inline">/</span>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-xs sm:text-base font-bold truncate max-w-[130px] sm:max-w-md text-[#3A342F]">
                {book.title}
              </h2>
              <span className="sm:hidden text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] shrink-0">
                {currentChapter.chapterNumber}/{book.targetChapters}
              </span>
            </div>
          </div>

          {book.isKidsMode ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] border border-[#D0E0CC] font-bold shrink-0 hidden md:flex items-center gap-1">
              <Baby className="w-3 h-3" /> Kids
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] border border-[#D0E0CC] uppercase font-semibold hidden md:inline shrink-0">
              {book.genre}
            </span>
          )}
        </div>

        {/* Mobile Header Quick Actions (Clean, Perfectly Proportioned, No Squished Buttons) */}
        <div className="flex sm:hidden items-center gap-1.5 shrink-0">
          {/* Mobile Narration Play/Pause */}
          <button
            id="mobile-reader-narration-btn"
            onClick={handleToggleNarration}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-xs ${
              isSpeaking
                ? 'bg-[#5B6B56] text-white border-[#5B6B56] shadow-md animate-pulse'
                : 'bg-white text-[#4A443F] hover:bg-[#EAE5DC] border-[#DFD8CA]'
            }`}
            title={`Read Aloud (${currentLangOption.name})`}
          >
            {isSpeaking ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>

          {/* Mobile Bookmark */}
          <button
            id="mobile-reader-bookmark-btn"
            onClick={() => {
              const currentSaved = readingSettings.bookmarks[book.id];
              const isCurrentlySaved = currentSaved === currentChapterIndex;
              const nextBookmarks = { ...readingSettings.bookmarks };
              if (isCurrentlySaved) {
                delete nextBookmarks[book.id];
                setShareFeedback(`Bookmark removed from Chapter ${currentChapterIndex + 1}`);
              } else {
                nextBookmarks[book.id] = currentChapterIndex;
                setShareFeedback(`Bookmark saved at Chapter ${currentChapterIndex + 1}!`);
              }
              onUpdateSettings({ ...readingSettings, bookmarks: nextBookmarks });
              setTimeout(() => setShareFeedback(null), 3000);
            }}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border shadow-xs ${
              readingSettings.bookmarks[book.id] === currentChapterIndex
                ? 'bg-[#B45F3C] text-white border-[#B45F3C] shadow-md'
                : 'bg-white text-[#4A443F] hover:bg-[#EAE5DC] border-[#DFD8CA]'
            }`}
            title="Bookmark Current Page"
          >
            <Bookmark className="w-4 h-4" />
          </button>

          {/* Mobile Reading Tools Drawer Opener */}
          <button
            id="mobile-reader-tools-drawer-btn"
            onClick={() => setIsMobileToolsDrawerOpen(true)}
            className="flex items-center gap-1 px-2.5 h-9 rounded-xl bg-white hover:bg-[#EAE5DC] text-[#3A342F] border border-[#DFD8CA] shadow-xs font-semibold text-xs transition-colors"
            title="Open Story Reading Tools"
          >
            <Sliders className="w-4 h-4 text-[#5B6B56]" />
            <span className="text-[11px] font-bold">Tools</span>
            {(readingSettings.bedtimeMode || (readingSettings.ambientSound && readingSettings.soundscapeType !== 'none') || currentChapterNotesCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-[#B45F3C]" />
            )}
          </button>
        </div>

        {/* Desktop Reader Controls (Spacious, Fully Featured) */}
        <div className="hidden sm:flex items-center gap-1.5 sm:gap-2 shrink-0 relative">
          {/* Illustrated Journey Map Button */}
          <button
            id="reader-journey-map-btn"
            onClick={() => setIsJourneyMapOpen(true)}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold bg-[#EAF0E8] text-[#3B5436] hover:bg-[#D8E6D5] border border-[#CAD7C6] transition-all shadow-xs"
            title="Illustrated Chronicle Cartography & Branch Journey Tracker"
          >
            <Compass className="w-3.5 h-3.5 text-[#5B6B56] animate-spin-slow" />
            <span className="hidden md:inline">Journey Map</span>
          </button>

          {/* Ambient Soundscapes Selector Button */}
          <div className="relative">
            <button
              id="reader-soundscape-btn"
              onClick={() => {
                setShowSoundscapeMenu(!showSoundscapeMenu);
                setShowLanguageMenu(false);
                setShowExportMenu(false);
                setShowSettingsDrawer(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                readingSettings.ambientSound && readingSettings.soundscapeType !== 'none'
                  ? 'bg-[#B45F3C] text-white shadow-sm'
                  : 'bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
              }`}
              title="Ambient Story Mood Soundscapes"
            >
              <Music className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">
                {readingSettings.ambientSound && readingSettings.soundscapeType !== 'none'
                  ? SOUNDSCAPE_OPTIONS.find((s) => s.id === readingSettings.soundscapeType)?.label
                  : 'Audio Mood'}
              </span>
            </button>

            {/* Soundscape Dropdown Menu */}
            {showSoundscapeMenu && (
              <div className="absolute right-0 mt-2 w-72 p-3 rounded-2xl bg-white border border-[#DFD8CA] shadow-2xl z-40 text-xs text-[#4A443F] space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-2 font-serif font-bold text-[#3A342F]">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-[#B45F3C]" />
                    <span>Story Soundscapes</span>
                  </div>
                  <button
                    onClick={() => setShowSoundscapeMenu(false)}
                    className="p-1 rounded-lg text-[#78716A] hover:text-[#3A342F]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Volume Slider */}
                <div className="space-y-1 p-2 rounded-xl bg-[#FAF8F5] border border-[#DFD8CA]">
                  <div className="flex items-center justify-between text-[11px] font-bold text-[#78716A]">
                    <span>Soundscape Volume</span>
                    <span className="text-[#5B6B56]">{Math.round((readingSettings.soundscapeVolume ?? 0.35) * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="1"
                    step="0.05"
                    value={readingSettings.soundscapeVolume ?? 0.35}
                    onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                    className="w-full accent-[#5B6B56] cursor-pointer"
                  />
                </div>

                {/* Soundscape Choices */}
                <div className="space-y-1 max-h-56 overflow-y-auto">
                  {SOUNDSCAPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => {
                        handleToggleSoundscape(opt.id);
                        if (opt.id === 'none') {
                          setShowSoundscapeMenu(false);
                        }
                      }}
                      className={`w-full text-left p-2 rounded-xl flex items-center justify-between transition-colors ${
                        readingSettings.soundscapeType === opt.id
                          ? 'bg-[#EAF0E8] text-[#3B5436] font-bold border border-[#CAD7C6]'
                          : 'hover:bg-[#F5EFEB] text-[#4A443F]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base">{opt.icon}</span>
                        <div>
                          <div className="font-semibold">{opt.label}</div>
                          <div className="text-[10px] text-[#78716A]">{opt.description}</div>
                        </div>
                      </div>
                      {readingSettings.soundscapeType === opt.id && (
                        <Check className="w-3.5 h-3.5 text-[#3B5436] shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bedtime / Wind-Down Reading Mode Toggle */}
          <button
            id="reader-bedtime-toggle-btn"
            onClick={handleToggleBedtimeMode}
            className={`p-2 rounded-full transition-all border shadow-xs ${
              readingSettings.bedtimeMode
                ? 'bg-[#E0A868] text-[#1C1815] border-[#E0A868] shadow-md ring-2 ring-[#E0A868]/30'
                : 'bg-white text-[#78716A] hover:text-[#3A342F] hover:bg-[#EAE5DC] border-[#DFD8CA]'
            }`}
            title={readingSettings.bedtimeMode ? 'Bedtime Mode Active (Gentle Evening Glow)' : 'Turn on Bedtime / Wind-Down Mode'}
          >
            {readingSettings.bedtimeMode ? (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-[#1C1815]" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>

          {/* Bookmark Button */}
          <button
            id="reader-bookmark-btn"
            onClick={() => {
              const currentSaved = readingSettings.bookmarks[book.id];
              const isCurrentlySaved = currentSaved === currentChapterIndex;
              const nextBookmarks = { ...readingSettings.bookmarks };
              if (isCurrentlySaved) {
                delete nextBookmarks[book.id];
                setShareFeedback(`Bookmark removed from Chapter ${currentChapterIndex + 1}`);
              } else {
                nextBookmarks[book.id] = currentChapterIndex;
                setShareFeedback(`Bookmark saved at Chapter ${currentChapterIndex + 1}!`);
              }
              onUpdateSettings({ ...readingSettings, bookmarks: nextBookmarks });
              setTimeout(() => setShareFeedback(null), 3000);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              readingSettings.bookmarks[book.id] === currentChapterIndex
                ? 'bg-[#B45F3C] text-white shadow-md'
                : 'bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
            }`}
            title="Bookmark Current Page"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">
              {readingSettings.bookmarks[book.id] === currentChapterIndex ? 'Bookmarked' : 'Bookmark'}
            </span>
          </button>

          {/* Narration Button */}
          <button
            id="reader-narration-btn"
            onClick={handleToggleNarration}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              isSpeaking
                ? 'bg-[#5B6B56] text-white shadow-md animate-pulse'
                : 'bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
            }`}
            title={`Read Aloud Narration (${currentLangOption.nativeName})`}
          >
            {isSpeaking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span className="hidden lg:inline">{isSpeaking ? 'Pause' : 'Read Aloud'}</span>
          </button>

          {/* Language Selector Dropdown Toggle */}
          <div className="relative">
            <button
              id="reader-language-btn"
              onClick={() => {
                setShowLanguageMenu(!showLanguageMenu);
                setShowSoundscapeMenu(false);
                setShowExportMenu(false);
                setShowSettingsDrawer(false);
              }}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
                selectedLanguage !== 'en'
                  ? 'bg-[#5B6B56] text-white border border-[#5B6B56] shadow-sm'
                  : 'bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
              }`}
              title="Story Translation & Languages"
            >
              <Languages className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">{currentLangOption.flag} {currentLangOption.name}</span>
              <span className="lg:hidden">{currentLangOption.flag}</span>
            </button>

            {showLanguageMenu && (
              <div className="absolute right-0 mt-2 w-64 p-2 rounded-2xl bg-white border border-[#DFD8CA] shadow-2xl z-40 text-xs text-[#4A443F] space-y-1 animate-fade-in">
                <div className="px-3 py-1.5 border-b border-[#E8E2D6] font-serif font-bold text-[#3A342F] flex items-center justify-between">
                  <span>Language & Translation</span>
                  <Globe className="w-3.5 h-3.5 text-[#5B6B56]" />
                </div>

                <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleSelectLanguage(lang.id)}
                      className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between transition-colors ${
                        selectedLanguage === lang.id
                          ? 'bg-[#EAF0E8] text-[#3B5436] font-bold'
                          : 'hover:bg-[#F5EFEB] text-[#4A443F]'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-base leading-none">{lang.flag}</span>
                        <div>
                          <div className="font-medium">{lang.nativeName}</div>
                          <div className="text-[10px] text-[#78716A]">{lang.name}</div>
                        </div>
                      </div>
                      {selectedLanguage === lang.id && <Check className="w-3.5 h-3.5 text-[#3B5436]" />}
                    </button>
                  ))}
                </div>

                {selectedLanguage !== 'en' && (
                  <div className="pt-2 border-t border-[#E8E2D6]">
                    <button
                      onClick={() => setIsBilingualMode(!isBilingualMode)}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                        isBilingualMode
                          ? 'bg-[#5B6B56] text-white'
                          : 'bg-[#F5EFEB] text-[#4A443F] hover:bg-[#EAE5DC]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" />
                        <span>Bilingual Side-by-Side View</span>
                      </span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isBilingualMode ? 'bg-white/20' : 'bg-black/10'}`}>
                        {isBilingualMode ? 'ON' : 'OFF'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Margin Notes Toggle Button */}
          <button
            id="reader-margin-notes-btn"
            onClick={() => {
              setIsMarginNotesOpen(!isMarginNotesOpen);
              setShowSettingsDrawer(false);
              setShowExportMenu(false);
              setShowSoundscapeMenu(false);
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              isMarginNotesOpen
                ? 'bg-[#5B6B56] text-white shadow-md'
                : 'bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
            }`}
            title="Margin Notes & Private Chapter Annotations"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">Margin Notes</span>
            {currentChapterNotesCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isMarginNotesOpen
                    ? 'bg-white/30 text-white'
                    : 'bg-[#EAF0E8] text-[#3B5436]'
                }`}
              >
                {currentChapterNotesCount}
              </span>
            )}
          </button>

          {/* Plot Memory Toggle */}
          <button
            id="reader-memory-btn"
            onClick={() => setIsMemoryOpen(!isMemoryOpen)}
            className={`p-2 rounded-full text-xs transition-colors border shadow-xs ${
              isMemoryOpen
                ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                : 'bg-white text-[#4A443F] hover:bg-[#EAE5DC] border-[#DFD8CA]'
            }`}
            title="Plot Memory & Inventory"
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Appearance & Typography Settings */}
          <button
            id="reader-settings-btn"
            onClick={() => {
              setShowSettingsDrawer(!showSettingsDrawer);
              setShowExportMenu(false);
              setShowSoundscapeMenu(false);
            }}
            className="p-2 rounded-full bg-white text-[#4A443F] hover:bg-[#EAE5DC] border border-[#DFD8CA] shadow-xs transition-colors"
            title="Story Aesthetics & Themes"
          >
            <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          {/* Export & Share Dropdown Toggle */}
          <div className="relative">
            <button
              id="reader-export-menu-btn"
              onClick={() => {
                setShowExportMenu(!showExportMenu);
                setShowSettingsDrawer(false);
                setShowSoundscapeMenu(false);
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white text-[#4A443F] hover:bg-[#EAE5DC] border border-[#DFD8CA] shadow-xs transition-colors text-xs font-semibold"
              title="Export & Share Options"
            >
              <Download className="w-3.5 h-3.5 text-[#5B6B56]" />
              <span className="hidden lg:inline">Export</span>
            </button>

            {/* Export & Share Menu Popup */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-60 p-2 rounded-2xl bg-white border border-[#DFD8CA] shadow-2xl z-40 text-xs text-[#4A443F] space-y-1 animate-fade-in">
                <div className="px-3 py-1.5 border-b border-[#E8E2D6] font-serif font-bold text-[#3A342F]">
                  Export & Keepsakes
                </div>

                {/* Printable Coloring Page & Dedication Studio */}
                <button
                  id="reader-coloring-modal-btn"
                  onClick={() => {
                    setIsColoringModalOpen(true);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#FAF0EB] text-[#B45F3C] hover:bg-[#F6E3DB] flex items-center justify-between font-bold transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Palette className="w-3.5 h-3.5 text-[#B45F3C]" />
                    <div>
                      <div className="font-bold">Coloring & Dedication</div>
                      <div className="text-[10px] text-[#8C5D39] font-normal">Line-art coloring keepsake</div>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase font-bold bg-white/70 px-1.5 py-0.5 rounded text-[#B45F3C]">
                    Art
                  </span>
                </button>

                <button
                  id="reader-print-pdf-btn"
                  onClick={handlePrintPDF}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5EFEB] flex items-center justify-between transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <Printer className="w-3.5 h-3.5 text-[#5B6B56]" />
                    <div>
                      <div className="font-semibold text-[#3A342F]">Print to PDF</div>
                      <div className="text-[10px] text-[#78716A]">Formatted layout & character visuals</div>
                    </div>
                  </div>
                  {exportLoading === 'print' ? (
                    <div className="w-3 h-3 border-2 border-[#5B6B56] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span className="text-[10px] uppercase font-bold text-[#5B6B56] bg-[#EAF0E8] px-1.5 py-0.5 rounded">
                      Print
                    </span>
                  )}
                </button>

                <button
                  id="reader-download-pdf-btn"
                  onClick={handleExportPDF}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5EFEB] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Download className="w-3.5 h-3.5 text-[#B45F3C]" />
                    <div>
                      <div className="font-medium text-[#3A342F]">Download PDF (.pdf)</div>
                      <div className="text-[10px] text-[#78716A]">Offline storybook document</div>
                    </div>
                  </div>
                  {exportLoading === 'pdf' && <div className="w-3 h-3 border-2 border-[#B45F3C] border-t-transparent rounded-full animate-spin" />}
                </button>

                <button
                  id="reader-export-epub-btn"
                  onClick={handleExportEPUB}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5EFEB] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-3.5 h-3.5 text-[#5B6B56]" />
                    <span>Export as ePub E-Reader</span>
                  </div>
                  {exportLoading === 'epub' && <div className="w-3 h-3 border-2 border-[#5B6B56] border-t-transparent rounded-full animate-spin" />}
                </button>

                <button
                  id="reader-export-txt-btn"
                  onClick={handleExportTXT}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#F5EFEB] flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="w-3.5 h-3.5 text-[#78716A]" />
                    <span>Download Clean Text (.txt)</span>
                  </div>
                  {exportLoading === 'txt' && <div className="w-3 h-3 border-2 border-[#78716A] border-t-transparent rounded-full animate-spin" />}
                </button>

                <div className="border-t border-[#E8E2D6] my-1" />

                <button
                  id="reader-share-story-btn"
                  onClick={handleShare}
                  disabled={exportLoading !== null}
                  className="w-full text-left px-3 py-2 rounded-xl bg-[#EAF0E8] text-[#3B5436] hover:bg-[#DFEAD9] font-bold flex items-center justify-between transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Share2 className="w-3.5 h-3.5 text-[#3B5436]" />
                    <span>Share Book</span>
                  </div>
                  {exportLoading === 'share' && <div className="w-3 h-3 border-2 border-[#3B5436] border-t-transparent rounded-full animate-spin" />}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Share Toast Feedback */}
      {shareFeedback && (
        <div className="fixed top-20 right-6 z-50 p-3 rounded-2xl bg-[#EAF0E8] border border-[#D0E0CC] text-[#2C4A25] text-xs font-bold shadow-lg flex items-center gap-2 animate-fade-in">
          <Check className="w-4 h-4 text-[#3B5436]" />
          <span>{shareFeedback}</span>
        </div>
      )}

      {/* Settings Drawer (Popup) */}
      {showSettingsDrawer && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 animate-fade-in">
          <div className="p-5 rounded-3xl bg-white border border-[#DFD8CA] shadow-xl space-y-4 text-xs text-[#4A443F]">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-2.5">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#5B6B56]" />
                <h4 className="font-serif font-bold text-[#3A342F] text-sm">
                  Story Aesthetics & Reading Preferences
                </h4>
              </div>
              <button
                onClick={() => setShowSettingsDrawer(false)}
                className="p-1 rounded-lg text-[#78716A] hover:text-[#3A342F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Color Palette Picker */}
              <div className="space-y-2">
                <label className="font-semibold text-[#5B6B56] uppercase tracking-wider text-[11px] block">
                  Color Palettes
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'classic_paper', label: 'Classic Paper', desc: 'Warm ivory & charcoal' },
                    { id: 'midnight_galaxy', label: 'Midnight Galaxy', desc: 'Deep cosmic indigo & starlight' },
                    { id: 'forest_dream', label: 'Forest Dream', desc: 'Lush moss green & sage' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onUpdateSettings({ ...readingSettings, colorPalette: p.id as any })}
                      className={`w-full py-2 px-3 rounded-xl font-medium border text-left transition-all flex items-center justify-between shadow-xs ${
                        readingSettings.colorPalette === p.id
                          ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                          : 'bg-[#FDFCF9] border-[#DFD8CA] text-[#4A443F] hover:border-[#8C9A86]'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{p.label}</div>
                        <div className={`text-[10px] ${readingSettings.colorPalette === p.id ? 'text-white/80' : 'text-[#78716A]'}`}>
                          {p.desc}
                        </div>
                      </div>
                      {readingSettings.colorPalette === p.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Style Picker */}
              <div className="space-y-2">
                <label className="font-semibold text-[#5B6B56] uppercase tracking-wider text-[11px] block">
                  Font Typography Style
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'serif', label: 'Classic Serif', desc: 'Editorial & literary' },
                    { id: 'display', label: 'Playfair Display', desc: 'Elegantly expressive' },
                    { id: 'sans', label: 'Outfit Modern Sans', desc: 'Clean, legible picturebook' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => onUpdateSettings({ ...readingSettings, fontFamily: f.id as any })}
                      className={`w-full py-2 px-3 rounded-xl font-medium border text-left transition-all flex items-center justify-between shadow-xs ${
                        readingSettings.fontFamily === f.id
                          ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                          : 'bg-[#FDFCF9] border-[#DFD8CA] text-[#4A443F] hover:border-[#8C9A86]'
                      }`}
                    >
                      <div>
                        <div className="font-bold">{f.label}</div>
                        <div className={`text-[10px] ${readingSettings.fontFamily === f.id ? 'text-white/80' : 'text-[#78716A]'}`}>
                          {f.desc}
                        </div>
                      </div>
                      {readingSettings.fontFamily === f.id && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sizing & Audio Speed */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="font-semibold text-[#5B6B56] uppercase tracking-wider text-[11px] block">
                    Font Size
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['sm', 'md', 'lg', 'xl'] as const).map((size) => (
                      <button
                        key={size}
                        onClick={() => onUpdateSettings({ ...readingSettings, fontSize: size })}
                        className={`py-2 rounded-xl font-bold border uppercase shadow-xs transition-all ${
                          readingSettings.fontSize === size
                            ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                            : 'bg-[#FDFCF9] border-[#DFD8CA] text-[#4A443F] hover:border-[#8C9A86]'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between font-semibold text-[#6E665E]">
                    <span>Narration Speed</span>
                    <span className="text-[#5B6B56] font-bold">{readingSettings.speechRate}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.8"
                    max="1.4"
                    step="0.1"
                    value={readingSettings.speechRate}
                    onChange={(e) => onUpdateSettings({ ...readingSettings, speechRate: parseFloat(e.target.value) })}
                    className="w-full accent-[#5B6B56] cursor-pointer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Plot Memory & Clues Sidebar / Drawer */}
      {isMemoryOpen && (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 animate-fade-in">
          <div className="p-5 rounded-3xl bg-white border border-[#DFD8CA] shadow-xl space-y-4 text-[#4A443F]">
            <div className="flex items-center justify-between border-b border-[#E8E2D6] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#5B6B56]" />
                <h4 className="font-serif font-bold text-[#3A342F] text-base">
                  Chronicle Narrative Memory & Tracker
                </h4>
              </div>
              <button
                onClick={() => setIsMemoryOpen(false)}
                className="p-1 rounded-lg text-[#78716A] hover:text-[#3A342F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              {/* Active Inventory */}
              <div className="p-3.5 rounded-2xl bg-[#F5EFEB] border border-[#DFD8CA] space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#5B6B56]">
                  <Gem className="w-3.5 h-3.5" />
                  <span>Active Inventory Items</span>
                </div>
                <ul className="space-y-1 text-[#4A443F]">
                  {book.plotMemory.activeInventory.length > 0 ? (
                    book.plotMemory.activeInventory.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#5B6B56]">•</span>
                        <span>{item}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#9E968D] italic">No artifacts carried yet</li>
                  )}
                </ul>
              </div>

              {/* Character Tensions */}
              <div className="p-3.5 rounded-2xl bg-[#F5EFEB] border border-[#DFD8CA] space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#B45F3C]">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Character Tensions / Flaws</span>
                </div>
                <ul className="space-y-1 text-[#4A443F]">
                  {book.plotMemory.characterTensions.length > 0 ? (
                    book.plotMemory.characterTensions.map((t, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#B45F3C]">•</span>
                        <span>{t}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#9E968D] italic">No internal conflicts recorded</li>
                  )}
                </ul>
              </div>

              {/* Foreshadowed Clues */}
              <div className="p-3.5 rounded-2xl bg-[#F5EFEB] border border-[#DFD8CA] space-y-2">
                <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[#3B5436]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Discovered Clues & World State</span>
                </div>
                <ul className="space-y-1 text-[#4A443F]">
                  {book.plotMemory.foreshadowedClues.length > 0 ? (
                    book.plotMemory.foreshadowedClues.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-[#3B5436]">•</span>
                        <span>{c}</span>
                      </li>
                    ))
                  ) : (
                    <li className="text-[#9E968D] italic">Exploring initial territory</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Storybook Container with Touch Gestures & One-Handed Tap Navigation */}
      <main
        onTouchStart={handleReaderTouchStart}
        onTouchEnd={handleReaderTouchEnd}
        className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8 select-text"
      >
        {/* One-Handed Tap Navigation Zones (Left for Previous, Right for Next) */}
        {oneHandTapEnabled && (
          <>
            {/* Left Page Turn Tap Zone */}
            <div
              id="tap-zone-prev"
              onClick={(e) => {
                // Don't intercept clicks if user clicked an interactive inner element
                const target = e.target as HTMLElement;
                if (target.closest('button, input, textarea, a, [data-interactive="true"]')) return;
                if (currentChapterIndex > 0) {
                  handlePreviousPage();
                }
              }}
              className={`fixed left-0 top-24 bottom-20 w-8 sm:w-16 z-20 flex items-center justify-start pl-1 sm:pl-2 pointer-events-auto cursor-pointer group transition-opacity ${
                currentChapterIndex === 0 ? 'opacity-0 pointer-events-none' : 'opacity-20 hover:opacity-100'
              }`}
              title="Tap left side to return to Previous Chapter"
            >
              <div className="p-2 sm:p-2.5 rounded-r-2xl bg-[#3A342F]/80 text-white backdrop-blur-md shadow-lg transform -translate-x-2 group-hover:translate-x-0 transition-transform">
                <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-[#EAF0E8]" />
              </div>
            </div>

            {/* Right Page Turn Tap Zone */}
            <div
              id="tap-zone-next"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button, input, textarea, a, [data-interactive="true"]')) return;
                if (currentChapterIndex < book.chapters.length - 1) {
                  handleNextPage();
                }
              }}
              className={`fixed right-0 top-24 bottom-20 w-8 sm:w-16 z-20 flex items-center justify-end pr-1 sm:pr-2 pointer-events-auto cursor-pointer group transition-opacity ${
                currentChapterIndex >= book.chapters.length - 1 ? 'opacity-0 pointer-events-none' : 'opacity-20 hover:opacity-100'
              }`}
              title="Tap right side for Next Chapter"
            >
              <div className="p-2 sm:p-2.5 rounded-l-2xl bg-[#3A342F]/80 text-white backdrop-blur-md shadow-lg transform translate-x-2 group-hover:translate-x-0 transition-transform">
                <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-[#EAF0E8]" />
              </div>
            </div>
          </>
        )}

        {/* Transient Tap Feedback Splash */}
        {tapFeedbackSide && (
          <div
            className={`fixed top-1/2 -translate-y-1/2 z-40 pointer-events-none p-4 rounded-3xl bg-[#3A342F]/90 text-white backdrop-blur-md shadow-2xl flex items-center gap-3 animate-fade-in ${
              tapFeedbackSide === 'left' ? 'left-6' : 'right-6'
            }`}
          >
            {tapFeedbackSide === 'left' ? (
              <>
                <ChevronLeft className="w-6 h-6 text-[#E0A868]" />
                <span className="font-serif font-bold text-sm">Previous Chapter</span>
              </>
            ) : (
              <>
                <span className="font-serif font-bold text-sm">Next Chapter</span>
                <ChevronRight className="w-6 h-6 text-[#E0A868]" />
              </>
            )}
          </div>
        )}

        {/* Chapter Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E2D6] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-widest text-[#5B6B56]">
                Chapter {currentChapter.chapterNumber} of {book.targetChapters}
              </span>
              <span className="text-[#C5BCB0]">•</span>
              <button
                id="chapter-margin-notes-badge"
                onClick={() => setIsMarginNotesOpen(true)}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#5B6B56] hover:text-[#3A342F] bg-[#EAF0E8] hover:bg-[#DFEAD9] px-2 py-0.5 rounded-full border border-[#D0E0CC] transition-colors"
                title="Open Margin Notes for this chapter"
              >
                <StickyNote className="w-3 h-3 text-[#3B5436]" />
                <span>
                  {currentChapterNotesCount > 0
                    ? `${currentChapterNotesCount} ${currentChapterNotesCount === 1 ? 'Note' : 'Notes'}`
                    : '+ Margin Note'}
                </span>
              </button>
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-[#3A342F]">
              {currentChapter.title}
            </h1>
          </div>

          {/* Chapter Navigation Dots & Quick Turn Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePreviousPage}
              disabled={currentChapterIndex === 0}
              className="p-2 rounded-xl bg-white hover:bg-[#EAE5DC] disabled:opacity-30 text-[#4A443F] border border-[#DFD8CA] transition-colors shadow-xs"
              title="Previous Chapter (or Tap Left)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {book.chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => onUpdateBook({ ...book, currentChapterIndex: idx })}
                  className={`h-2.5 rounded-full transition-all ${
                    idx === currentChapterIndex
                      ? 'w-7 bg-[#5B6B56]'
                      : 'w-2 bg-[#D5CDBD] hover:bg-[#8C9A86]'
                  }`}
                  title={`Go to Chapter ${ch.chapterNumber}`}
                />
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentChapterIndex >= book.chapters.length - 1}
              className="p-2 rounded-xl bg-white hover:bg-[#EAE5DC] disabled:opacity-30 text-[#4A443F] border border-[#DFD8CA] transition-colors shadow-xs"
              title="Next Chapter (or Tap Right)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notice for placeholder or cover-duplicate images */}
        {(() => {
          const isCoverDuplicate = currentChapterIndex > 0 && currentChapter.imageUrl === book.coverImage;
          const isCastAvatar = book.cast?.some((c) => c.visualProfile?.photoUrl && c.visualProfile.photoUrl === currentChapter.imageUrl);
          const isPlaceholder = !currentChapter.imageUrl || isCoverDuplicate || isCastAvatar;

          if (!isPlaceholder) return null;

          return (
            <div className="p-3.5 rounded-2xl bg-[#EAF0E8]/90 border border-[#D0E0CC] flex flex-wrap items-center justify-between gap-2 text-xs text-[#2D4523] shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5B6B56] shrink-0" />
                <span>This page is displaying a placeholder or cover image. Paint a dedicated illustration matching Chapter {currentChapter.chapterNumber}'s narrative!</span>
              </div>
              <button
                id="paint-specific-scene-btn"
                onClick={handleRegenerateSceneIllustration}
                disabled={isRegeneratingImage}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#5B6B56] hover:bg-[#495745] text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                <span>{isRegeneratingImage ? 'Painting Scene...' : 'Paint Chapter Scene Art'}</span>
              </button>
            </div>
          );
        })()}

        {/* Context-Aware Scene Illustration Card */}
        {currentChapter.imageUrl ? (
          <motion.div
            key={`img-${currentChapterIndex}`}
            initial={{ opacity: 0, rotateY: 90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className="relative rounded-3xl overflow-hidden border border-[#DFD8CA] shadow-lg group"
          >
            <div className="relative aspect-[16/9] w-full bg-[#EAE5DC]">
              <img
                src={currentChapter.imageUrl}
                alt={currentChapter.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-101 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

              {/* Floating controls on illustration */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  id="illustration-zoom-btn"
                  onClick={() => setIsImageModalOpen(true)}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white border border-white/20 transition-all shadow-xs"
                  title="Expand Scene Illustration"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  id="illustration-regen-btn"
                  onClick={handleRegenerateSceneIllustration}
                  disabled={isRegeneratingImage}
                  className="p-2 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-[#EAF0E8] border border-white/20 transition-all shadow-xs"
                  title="Regenerate Context Scene Art"
                >
                  <RefreshCw className={`w-4 h-4 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {/* Bottom Caption Overlay */}
              <div className="absolute bottom-4 left-4 right-4 text-xs text-white/95 backdrop-blur-md bg-black/50 p-3 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 truncate">
                  <Sparkles className="w-4 h-4 text-[#8C9A86] shrink-0" />
                  <span className="truncate italic">"{currentChapter.summary}"</span>
                </div>
                <span className="text-[10px] uppercase font-bold text-[#D0E0CC] ml-2 shrink-0">
                  {book.artStyle.replace('_', ' ')}
                </span>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`img-lazy-${currentChapterIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative rounded-3xl overflow-hidden border border-[#D0E0CC] bg-gradient-to-br from-[#EAF0E8] via-[#F4F8F3] to-[#E5EFE3] p-8 text-center space-y-4 shadow-xs"
          >
            <div className="w-12 h-12 mx-auto rounded-2xl bg-[#5B6B56]/10 flex items-center justify-center text-[#3B5436]">
              <Sparkles className="w-6 h-6 animate-spin text-[#3B5436]" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-bold text-[#3A342F]">
                Painting Chapter {currentChapter.chapterNumber} Artwork...
              </h3>
              <p className="text-xs text-[#5B6B56] max-w-md mx-auto">
                Lazy-loading 3D Pixar illustration in the background. It will automatically update as soon as it's ready!
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/90 border border-[#D0E0CC] text-[11px] font-semibold text-[#3B5436] shadow-2xs">
                <div className="w-2 h-2 rounded-full bg-[#5B6B56] animate-ping" />
                <span>Generating Scene Illustration...</span>
              </div>
              <button
                onClick={handleRegenerateSceneIllustration}
                disabled={isRegeneratingImage}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#5B6B56] hover:bg-[#485744] text-white text-[11px] font-semibold transition-colors shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingImage ? 'animate-spin' : ''}`} />
                <span>Force Generate Now</span>
              </button>
            </div>
          </motion.div>
        )}

        {/* Translation Banner / Shimmer Indicator */}
        {isTranslating && (
          <div className="p-4 rounded-2xl bg-[#EAF0E8] border border-[#D0E0CC] text-[#2D4523] text-xs font-semibold flex items-center justify-center gap-3 shadow-xs animate-pulse">
            <RefreshCw className="w-4 h-4 animate-spin text-[#5B6B56]" />
            <span>Translating Chapter {currentChapter.chapterNumber} into {currentLangOption.nativeName} ({currentLangOption.name})...</span>
          </div>
        )}

        {translationError && (
          <div className="p-4 rounded-2xl bg-[#FAEDE8] border border-[#F2D0C4] text-[#933D22] text-xs flex items-center justify-between gap-3 shadow-xs">
            <span>{translationError}</span>
            <button
              onClick={() => handleSelectLanguage(selectedLanguage)}
              className="px-3 py-1 rounded-xl bg-[#933D22] text-white font-bold hover:bg-[#7A321B]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Story Prose Text Block */}
        {selectedLanguage !== 'en' && isBilingualMode && activeTranslation ? (
          /* Bilingual Side-by-Side Dual Column View */
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-[#78716A]">
              <span className="flex items-center gap-1.5">
                <span>🇬🇧</span>
                <span>Original English</span>
              </span>
              <span className="flex items-center gap-1.5 text-[#5B6B56]">
                <span>{currentLangOption.flag}</span>
                <span>{currentLangOption.nativeName} ({currentLangOption.name})</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left: Original English */}
              <motion.article
                key={`text-orig-${currentChapterIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 sm:p-8 rounded-3xl ${themeStyle.proseBg} border ${themeStyle.border} shadow-sm space-y-4 ${fontClass}`}
              >
                <div className="border-b border-[#E8E2D6] pb-2 font-serif font-bold text-sm text-[#3A342F]">
                  {currentChapter.title}
                </div>
                {currentChapter.content.split('\n\n').map((paragraph, pIdx) => {
                  if (!paragraph.trim()) return null;
                  return (
                    <p key={pIdx} className={`${textSizeClass} tracking-wide text-justify text-[#4A443F]`}>
                      {pIdx === 0 ? (
                        <>
                          <span className="float-left text-3xl font-bold font-serif leading-none pr-2 pt-1 text-[#5B6B56]">
                            {paragraph.charAt(0)}
                          </span>
                          {paragraph.slice(1)}
                        </>
                      ) : (
                        paragraph
                      )}
                    </p>
                  );
                })}
              </motion.article>

              {/* Right: Translated Target Language */}
              <motion.article
                key={`text-trans-${currentChapterIndex}-${selectedLanguage}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-6 sm:p-8 rounded-3xl ${themeStyle.proseBg} border border-[#70826C]/40 shadow-sm space-y-4 ${fontClass} bg-[#FCFBF8]`}
              >
                <div className="border-b border-[#D0E0CC] pb-2 font-serif font-bold text-sm text-[#3B5436] flex items-center justify-between">
                  <span>{activeTranslation.title}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436]">
                    {currentLangOption.name}
                  </span>
                </div>
                {activeTranslation.content.split('\n\n').map((paragraph, pIdx) => {
                  if (!paragraph.trim()) return null;
                  return (
                    <p key={pIdx} className={`${textSizeClass} tracking-wide text-justify text-[#3A342F]`}>
                      {pIdx === 0 ? (
                        <>
                          <span className="float-left text-3xl font-bold font-serif leading-none pr-2 pt-1 text-[#3B5436]">
                            {paragraph.charAt(0)}
                          </span>
                          {paragraph.slice(1)}
                        </>
                      ) : (
                        paragraph
                      )}
                    </p>
                  );
                })}
              </motion.article>
            </div>
          </div>
        ) : (
          /* Standard Single Prose Layout (Original or Translated) */
          <motion.article
            key={`text-${currentChapterIndex}-${selectedLanguage}`}
            initial={{ opacity: 0, rotateY: -90 }}
            animate={{ opacity: 1, rotateY: 0 }}
            transition={{ duration: 0.6, type: 'spring' }}
            className={`p-6 sm:p-10 rounded-3xl ${themeStyle.proseBg} border ${themeStyle.border} shadow-sm space-y-6 ${fontClass}`}
          >
            {selectedLanguage !== 'en' && activeTranslation && (
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E2D6] text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF0E8] text-[#3B5436] font-bold border border-[#D0E0CC]">
                  <span>{currentLangOption.flag}</span>
                  <span>Translated into {currentLangOption.nativeName} ({currentLangOption.name})</span>
                </span>
                <button
                  onClick={() => setIsBilingualMode(true)}
                  className="text-[#5B6B56] hover:underline text-[11px] font-semibold"
                >
                  Switch to Bilingual Side-by-Side
                </button>
              </div>
            )}

            {(activeTranslation?.content || currentChapter.content).split('\n\n').map((paragraph, pIdx) => {
              if (!paragraph.trim()) return null;
              return (
                <p
                  key={pIdx}
                  className={`${textSizeClass} tracking-wide text-justify text-[#4A443F]`}
                >
                  {pIdx === 0 ? (
                    <>
                      <span className="float-left text-4xl sm:text-5xl font-bold font-serif leading-none pr-3 pt-1 text-[#5B6B56]">
                        {paragraph.charAt(0)}
                      </span>
                      {paragraph.slice(1)}
                    </>
                  ) : (
                    paragraph
                  )}
                </p>
              );
            })}
          </motion.article>
        )}

        {/* Interactive Non-Repetitive Choice Selector / Branching */}
        {currentChapterIndex === book.chapters.length - 1 && !book.isCompleted && (
          <section className="space-y-6 pt-4 animate-fade-in">
            {advancingError && (
              <div className="p-4 rounded-2xl bg-[#FAEDE8] border border-[#F2D0C4] text-[#933D22] text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs">
                <span>{advancingError}</span>
                <button
                  onClick={() => setAdvancingError(null)}
                  className="p-1 text-[#933D22] hover:text-[#3A342F]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="text-center space-y-1">
              <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-[#5B6B56]">
                <Feather className="w-4 h-4" />
                <span>Shape the Next Chapter</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#3A342F]">
                How does the cast resolve this threshold?
              </h3>
            </div>

            {/* Branching choice cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {currentChapter.choices.map((choice) => {
                const isSelected = selectedChoiceId === choice.id;
                const riskBadge =
                  choice.riskLevel === 'perilous'
                    ? { bg: 'bg-[#FAEDE8]', text: 'text-[#933D22]', border: 'border-[#F2D0C4]' }
                    : choice.riskLevel === 'safe'
                    ? { bg: 'bg-[#EAF0E8]', text: 'text-[#3B5436]', border: 'border-[#D0E0CC]' }
                    : { bg: 'bg-[#FAF0EB]', text: 'text-[#B45F3C]', border: 'border-[#F0D5C7]' };

                return (
                  <div
                    key={choice.id}
                    id={`choice-card-${choice.id}`}
                    onClick={() => {
                      setSelectedChoiceId(choice.id);
                      setCustomAction('');
                    }}
                    className={`p-5 rounded-2xl cursor-pointer border transition-all duration-300 flex flex-col justify-between space-y-3 ${
                      isSelected
                        ? 'bg-white border-[#5B6B56] ring-2 ring-[#5B6B56]/20 shadow-md'
                        : 'bg-white border-[#DFD8CA] hover:border-[#8C9A86] shadow-xs'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}>
                          {choice.riskLevel}
                        </span>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-[#5B6B56]" />}
                      </div>

                      <h4 className="font-serif font-bold text-[#3A342F] text-sm sm:text-base">
                        {choice.label}
                      </h4>
                      <p className="text-xs text-[#6E665E] leading-relaxed">
                        {choice.actionDescription}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-[#E8E2D6] text-[11px] text-[#78716A] italic">
                      Consequence: {choice.consequenceHint}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Custom protagonist action input */}
            <div className="p-4 rounded-2xl bg-white border border-[#DFD8CA] space-y-2 shadow-xs">
              <label className="block text-xs font-semibold text-[#4A443F]">
                Or Write Your Own Custom Protagonist Action:
              </label>
              <div className="flex gap-2">
                <input
                  id="custom-action-input"
                  type="text"
                  value={customAction}
                  onChange={(e) => {
                    setCustomAction(e.target.value);
                    if (e.target.value) setSelectedChoiceId(null);
                  }}
                  placeholder="e.g. Milou uses the brass astrolabe to reflect starlight into the guardian's optical core..."
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#FDFCF9] border border-[#DCD5C9] text-[#3A342F] placeholder-[#9E968D] text-xs sm:text-sm focus:outline-none focus:border-[#5B6B56] shadow-xs"
                />
              </div>
            </div>

            {/* Advance Chapter Submit Button */}
            <div className="flex justify-center pt-2">
              <button
                id="reader-advance-chapter-btn"
                onClick={handleAdvanceChapter}
                disabled={isAdvancingChapter || (!selectedChoiceId && !customAction.trim())}
                className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-[#B45F3C] hover:bg-[#A05333] disabled:opacity-50 text-white font-bold text-sm sm:text-base shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
              >
                {isAdvancingChapter ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{advancingStatus || 'Generating Next Chapter & Scene Art...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Weave Chapter {currentChapter.chapterNumber + 1} & Illustration</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        {/* Book Completed Banner */}
        {book.isCompleted && currentChapterIndex === book.chapters.length - 1 && (
          <div className="p-8 rounded-3xl bg-[#EAF0E8] border border-[#D0E0CC] text-center space-y-4 shadow-sm animate-fade-in">
            <Sparkles className="w-10 h-10 mx-auto text-[#5B6B56]" />
            <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#3A342F]">
              Chronicle Completed
            </h3>
            <p className="text-sm text-[#6E665E] max-w-md mx-auto">
              You have completed all {book.targetChapters} chapters of "{book.title}". Your choices shaped a unique, non-repeating journey.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <button
                id="reader-finish-print-btn"
                onClick={handlePrintPDF}
                disabled={exportLoading !== null}
                className="px-5 py-2.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                <Printer className="w-4 h-4" /> Print to PDF
              </button>
              <button
                id="reader-finish-download-pdf-btn"
                onClick={handleExportPDF}
                disabled={exportLoading !== null}
                className="px-5 py-2.5 rounded-xl bg-white text-[#4A443F] hover:bg-[#EAE5DC] border border-[#DFD8CA] font-bold text-xs sm:text-sm flex items-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4 text-[#B45F3C]" /> Download .PDF
              </button>
              <button
                id="reader-finish-epub-btn"
                onClick={handleExportEPUB}
                disabled={exportLoading !== null}
                className="px-5 py-2.5 rounded-xl bg-[#B45F3C] hover:bg-[#A05333] text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-sm transition-colors"
              >
                <BookMarked className="w-4 h-4" /> Export ePub
              </button>
              <button
                onClick={handleShare}
                disabled={exportLoading !== null}
                className="px-5 py-2.5 rounded-xl bg-white text-[#3B5436] hover:bg-[#EAE5DC] border border-[#D0E0CC] font-bold text-xs sm:text-sm shadow-xs transition-colors flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" /> Share Story
              </button>
              <button
                onClick={onBackToLibrary}
                className="px-5 py-2.5 rounded-xl bg-white text-[#4A443F] hover:bg-[#EAE5DC] border border-[#DFD8CA] font-semibold text-xs sm:text-sm shadow-xs transition-colors"
              >
                Return to Library
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Fullscreen Illustration Modal */}
      {isImageModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative max-w-5xl w-full bg-[#F9F7F2] rounded-3xl overflow-hidden border border-[#DFD8CA] shadow-2xl text-[#4A443F]">
            <div className="flex items-center justify-between p-4 bg-[#F5EFEB] border-b border-[#DFD8CA]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#5B6B56]" />
                <h4 className="font-serif font-bold text-[#3A342F] text-sm">
                  Scene Illustration Prompt & Visual Details
                </h4>
              </div>
              <button
                onClick={() => setIsImageModalOpen(false)}
                className="p-1.5 rounded-lg text-[#78716A] hover:text-[#3A342F] hover:bg-[#EAE5DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <img
                src={currentChapter.imageUrl}
                alt="Fullscreen Scene"
                referrerPolicy="no-referrer"
                className="w-full max-h-[60vh] object-contain rounded-2xl bg-black"
              />
              <div className="p-3.5 rounded-xl bg-white border border-[#DFD8CA] space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#5B6B56]">
                  Context-Aware Image Prompt:
                </span>
                <p className="text-xs text-[#4A443F] font-mono leading-relaxed">
                  {currentChapter.illustrationPrompt}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Quick-Access Margin Notes Tab */}
      <motion.button
        id="floating-margin-notes-tab-btn"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsMarginNotesOpen(!isMarginNotesOpen)}
        className={`fixed right-4 sm:right-6 bottom-6 z-30 flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-2xl shadow-xl transition-all border ${
          isMarginNotesOpen
            ? 'bg-[#3A342F] text-white border-[#3A342F]'
            : 'bg-[#5B6B56] hover:bg-[#4D5C47] text-white border-[#4D5C47]'
        }`}
        title="Open Floating Margin Notes"
      >
        <StickyNote className="w-4 h-4" />
        <span className="text-xs font-bold hidden sm:inline">Margin Notes</span>
        {currentChapterNotesCount > 0 && (
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/25 text-white">
            {currentChapterNotesCount}
          </span>
        )}
      </motion.button>

      {/* Mobile Reading Tools Drawer / Bottom Sheet */}
      {isMobileToolsDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#FAF8F5] sm:rounded-3xl rounded-t-3xl border border-[#DFD8CA] shadow-2xl overflow-hidden max-h-[88vh] flex flex-col text-[#4A443F]">
            {/* Drawer Header */}
            <div className="p-4 bg-[#F5EFEB] border-b border-[#DFD8CA] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#5B6B56]" />
                <h3 className="font-serif font-bold text-[#3A342F] text-base">
                  Story Reading Tools & Controls
                </h3>
              </div>
              <button
                id="close-mobile-tools-btn"
                onClick={() => setIsMobileToolsDrawerOpen(false)}
                className="p-1.5 rounded-full text-[#78716A] hover:text-[#3A342F] hover:bg-[#EAE5DC]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Action Grid */}
            <div className="p-4 overflow-y-auto space-y-4 text-xs">
              {/* One-Hand Navigation Quick Setting */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DFD8CA] flex items-center justify-between shadow-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-[#3A342F] flex items-center gap-1.5">
                    <span>👆</span>
                    <span>One-Hand Tap Navigation</span>
                  </div>
                  <div className="text-[11px] text-[#78716A]">
                    Tap left edge for prev, tap right edge for next
                  </div>
                </div>
                <button
                  id="toggle-one-hand-tap-btn"
                  onClick={() => setOneHandTapEnabled(!oneHandTapEnabled)}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
                    oneHandTapEnabled
                      ? 'bg-[#5B6B56] text-white'
                      : 'bg-[#EAE5DC] text-[#78716A]'
                  }`}
                >
                  {oneHandTapEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Main Reading Utilities Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                {/* Journey Map */}
                <button
                  id="mobile-journey-map-btn"
                  onClick={() => {
                    setIsMobileToolsDrawerOpen(false);
                    setIsJourneyMapOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-[#EAF0E8] border border-[#CAD7C6] text-left space-y-1 hover:bg-[#DFEAD9] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Compass className="w-4 h-4 text-[#5B6B56]" />
                    <span className="text-[10px] uppercase font-bold text-[#3B5436]">Map</span>
                  </div>
                  <div className="font-bold text-[#3A342F]">Journey Map</div>
                  <div className="text-[10px] text-[#5B6B56]">Interactive chronicle cartography</div>
                </button>

                {/* Bedtime Mode */}
                <button
                  id="mobile-bedtime-btn"
                  onClick={() => {
                    handleToggleBedtimeMode();
                  }}
                  className={`p-3 rounded-2xl border text-left space-y-1 transition-colors ${
                    readingSettings.bedtimeMode
                      ? 'bg-[#E0A868]/20 border-[#E0A868] text-[#1C1815]'
                      : 'bg-white border-[#DFD8CA] hover:bg-[#F5EFEB]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Moon className={`w-4 h-4 ${readingSettings.bedtimeMode ? 'fill-[#E0A868] text-[#E0A868]' : 'text-[#78716A]'}`} />
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${readingSettings.bedtimeMode ? 'bg-[#E0A868] text-white' : 'bg-black/5 text-[#78716A]'}`}>
                      {readingSettings.bedtimeMode ? 'Active' : 'Off'}
                    </span>
                  </div>
                  <div className="font-bold text-[#3A342F]">Bedtime Mode</div>
                  <div className="text-[10px] text-[#78716A]">Warm evening glow & soft tone</div>
                </button>

                {/* Margin Notes */}
                <button
                  id="mobile-margin-notes-btn"
                  onClick={() => {
                    setIsMobileToolsDrawerOpen(false);
                    setIsMarginNotesOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-white border border-[#DFD8CA] text-left space-y-1 hover:bg-[#F5EFEB] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <StickyNote className="w-4 h-4 text-[#5B6B56]" />
                    {currentChapterNotesCount > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-[#EAF0E8] text-[#3B5436]">
                        {currentChapterNotesCount}
                      </span>
                    )}
                  </div>
                  <div className="font-bold text-[#3A342F]">Margin Notes</div>
                  <div className="text-[10px] text-[#78716A]">Private chapter annotations</div>
                </button>

                {/* Plot Memory */}
                <button
                  id="mobile-memory-btn"
                  onClick={() => {
                    setIsMobileToolsDrawerOpen(false);
                    setIsMemoryOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-white border border-[#DFD8CA] text-left space-y-1 hover:bg-[#F5EFEB] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Layers className="w-4 h-4 text-[#B45F3C]" />
                    <span className="text-[10px] uppercase font-bold text-[#B45F3C]">Lore</span>
                  </div>
                  <div className="font-bold text-[#3A342F]">Plot Memory</div>
                  <div className="text-[10px] text-[#78716A]">Inventory & clues tracker</div>
                </button>

                {/* Coloring Studio Keepsake */}
                <button
                  id="mobile-coloring-btn"
                  onClick={() => {
                    setIsMobileToolsDrawerOpen(false);
                    setIsColoringModalOpen(true);
                  }}
                  className="p-3 rounded-2xl bg-[#FAF0EB] border border-[#F0D5C7] text-left space-y-1 hover:bg-[#F6E3DB] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Palette className="w-4 h-4 text-[#B45F3C]" />
                    <span className="text-[10px] uppercase font-bold text-[#B45F3C]">Art</span>
                  </div>
                  <div className="font-bold text-[#3A342F]">Coloring Keepsake</div>
                  <div className="text-[10px] text-[#8C5D39]">Printable line-art & dedication</div>
                </button>

                {/* Typography & Themes */}
                <button
                  id="mobile-settings-btn"
                  onClick={() => {
                    setIsMobileToolsDrawerOpen(false);
                    setShowSettingsDrawer(true);
                  }}
                  className="p-3 rounded-2xl bg-white border border-[#DFD8CA] text-left space-y-1 hover:bg-[#F5EFEB] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <Sliders className="w-4 h-4 text-[#5B6B56]" />
                    <span className="text-[10px] uppercase font-bold text-[#5B6B56]">Style</span>
                  </div>
                  <div className="font-bold text-[#3A342F]">Font & Theme</div>
                  <div className="text-[10px] text-[#78716A]">Aesthetics, colors & sizes</div>
                </button>
              </div>

              {/* Ambient Soundscapes Section */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DFD8CA] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between font-bold text-[#3A342F]">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-4 h-4 text-[#B45F3C]" />
                    <span>Story Soundscape Ambience</span>
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#5B6B56]">
                    {readingSettings.ambientSound && readingSettings.soundscapeType !== 'none'
                      ? SOUNDSCAPE_OPTIONS.find((s) => s.id === readingSettings.soundscapeType)?.label
                      : 'Muted'}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {SOUNDSCAPE_OPTIONS.slice(0, 6).map((opt) => (
                    <button
                      key={opt.id}
                      onClick={() => handleToggleSoundscape(opt.id)}
                      className={`p-2 rounded-xl text-center transition-colors ${
                        readingSettings.soundscapeType === opt.id
                          ? 'bg-[#EAF0E8] text-[#3B5436] font-bold border border-[#CAD7C6]'
                          : 'bg-[#FAF8F5] text-[#4A443F] hover:bg-[#F5EFEB] border border-[#DFD8CA]'
                      }`}
                    >
                      <div className="text-sm">{opt.icon}</div>
                      <div className="text-[10px] truncate">{opt.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Language & Translation */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DFD8CA] space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between font-bold text-[#3A342F]">
                  <div className="flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-[#5B6B56]" />
                    <span>Translation & Language</span>
                  </div>
                  <span className="text-[11px] font-bold text-[#5B6B56]">
                    {currentLangOption.flag} {currentLangOption.nativeName}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <button
                      key={lang.id}
                      onClick={() => handleSelectLanguage(lang.id)}
                      className={`p-2 rounded-xl text-left flex items-center gap-1.5 transition-colors ${
                        selectedLanguage === lang.id
                          ? 'bg-[#EAF0E8] text-[#3B5436] font-bold border border-[#CAD7C6]'
                          : 'bg-[#FAF8F5] text-[#4A443F] hover:bg-[#F5EFEB] border border-[#DFD8CA]'
                      }`}
                    >
                      <span className="text-sm">{lang.flag}</span>
                      <span className="text-[11px] truncate">{lang.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Export & Sharing Actions */}
              <div className="p-3.5 rounded-2xl bg-white border border-[#DFD8CA] space-y-2 shadow-xs">
                <div className="font-bold text-[#3A342F] flex items-center gap-1.5">
                  <Download className="w-4 h-4 text-[#B45F3C]" />
                  <span>Download & Keepsakes</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={() => {
                      setIsMobileToolsDrawerOpen(false);
                      handlePrintPDF();
                    }}
                    className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DFD8CA] hover:bg-[#EAE5DC] text-center font-bold text-[#3A342F]"
                  >
                    🖨️ Print PDF
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileToolsDrawerOpen(false);
                      handleExportPDF();
                    }}
                    className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DFD8CA] hover:bg-[#EAE5DC] text-center font-bold text-[#B45F3C]"
                  >
                    📥 PDF File
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileToolsDrawerOpen(false);
                      handleExportEPUB();
                    }}
                    className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DFD8CA] hover:bg-[#EAE5DC] text-center font-bold text-[#5B6B56]"
                  >
                    📖 ePub
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Margin Notes Sidebar Component */}
      <MarginNotesSidebar
        isOpen={isMarginNotesOpen}
        onClose={() => setIsMarginNotesOpen(false)}
        book={book}
        currentChapter={currentChapter}
        onUpdateBook={onUpdateBook}
        onJumpToChapter={(idx) => {
          onUpdateBook({ ...book, currentChapterIndex: idx });
        }}
      />
    </div>
  );
};
