import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { StoryBook, StoryChapter, StoryChoice } from '../types';
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

  // Margin Notes count calculation
  const currentChapterNotesCount = (currentChapter.notes || []).length;
  const totalBookNotesCount = book.chapters.reduce(
    (acc, chap) => acc + (chap.notes ? chap.notes.length : 0),
    0
  );

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
          artStyle: book.artStyle,
          aspectRatio: '16:9',
        }),
      });
      const data = await res.json();
      if (data.success && data.imageUrl) {
        const updatedChapters = [...book.chapters];
        updatedChapters[currentChapterIndex] = {
          ...currentChapter,
          imageUrl: data.imageUrl,
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

      // Generate scene illustration
      let nextImageUrl = '';
      try {
        const illuRes = await fetch('/api/story/generate-illustration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: nextChapData.illustrationPrompt,
            artStyle: book.artStyle,
            aspectRatio: '16:9',
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
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            onClick={onBackToLibrary}
            className="flex items-center gap-1 text-xs font-semibold text-[#5B6B56] hover:text-[#3A342F] transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Library</span>
          </button>

          <span className="text-[#C5BCB0] hidden sm:inline">/</span>

          <h2 className="font-serif text-xs sm:text-base font-bold truncate max-w-[150px] sm:max-w-md text-[#3A342F]">
            {book.title}
          </h2>

          {book.isKidsMode ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] border border-[#D0E0CC] font-bold shrink-0 flex items-center gap-1">
              <Baby className="w-3 h-3" /> Kids
            </span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] border border-[#D0E0CC] uppercase font-semibold hidden md:inline shrink-0">
              {book.genre}
            </span>
          )}
        </div>

        {/* Reader Controls */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0 relative">
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
            <span className="hidden sm:inline">
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
            <span className="hidden sm:inline">{isSpeaking ? 'Pause' : 'Read Aloud'}</span>
          </button>

          {/* Language Selector Dropdown Toggle */}
          <div className="relative">
            <button
              id="reader-language-btn"
              onClick={() => {
                setShowLanguageMenu(!showLanguageMenu);
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
              <span className="hidden sm:inline">{currentLangOption.flag} {currentLangOption.name}</span>
              <span className="sm:hidden">{currentLangOption.flag}</span>
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
            }}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-xs font-semibold transition-all shadow-xs ${
              isMarginNotesOpen
                ? 'bg-[#5B6B56] text-white shadow-md'
                : 'bg-white hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
            }`}
            title="Margin Notes & Private Chapter Annotations"
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Margin Notes</span>
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
              }}
              className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-full bg-white text-[#4A443F] hover:bg-[#EAE5DC] border border-[#DFD8CA] shadow-xs transition-colors text-xs font-semibold"
              title="Export & Share Options"
            >
              <Download className="w-3.5 h-3.5 text-[#5B6B56]" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Export & Share Menu Popup */}
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 p-2 rounded-2xl bg-white border border-[#DFD8CA] shadow-2xl z-40 text-xs text-[#4A443F] space-y-1 animate-fade-in">
                <div className="px-3 py-1.5 border-b border-[#E8E2D6] font-serif font-bold text-[#3A342F]">
                  Export & Share Book
                </div>

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

      {/* Main Storybook Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-8">
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

          {/* Chapter Navigation Dots */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onUpdateBook({ ...book, currentChapterIndex: Math.max(0, currentChapterIndex - 1) })}
              disabled={currentChapterIndex === 0}
              className="p-1.5 rounded-lg bg-white hover:bg-[#EAE5DC] disabled:opacity-40 text-[#4A443F] border border-[#DFD8CA] transition-colors shadow-xs"
              title="Previous Chapter"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {book.chapters.map((ch, idx) => (
                <button
                  key={ch.id}
                  onClick={() => onUpdateBook({ ...book, currentChapterIndex: idx })}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentChapterIndex
                      ? 'w-6 bg-[#5B6B56]'
                      : 'w-2 bg-[#D5CDBD] hover:bg-[#8C9A86]'
                  }`}
                  title={`Go to Chapter ${ch.chapterNumber}`}
                />
              ))}
            </div>

            <button
              onClick={() =>
                onUpdateBook({
                  ...book,
                  currentChapterIndex: Math.min(book.chapters.length - 1, currentChapterIndex + 1),
                })
              }
              disabled={currentChapterIndex >= book.chapters.length - 1}
              className="p-1.5 rounded-lg bg-white hover:bg-[#EAE5DC] disabled:opacity-40 text-[#4A443F] border border-[#DFD8CA] transition-colors shadow-xs"
              title="Next Chapter"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Context-Aware Scene Illustration Card */}
        {currentChapter.imageUrl && (
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
