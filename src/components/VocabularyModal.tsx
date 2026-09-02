import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BookOpen,
  Volume2,
  X,
  Plus,
  Sparkles,
  Bookmark,
  Check,
  Languages,
} from 'lucide-react';
import { MarginNote, StoryBook, StoryChapter } from '../types';
import { speakText, stopSpeaking } from '../utils/speech';

export interface VocabularyEntry {
  word: string;
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  childFriendlyExplanation: string;
  exampleSentence: string;
  synonyms: string[];
}

interface VocabularyModalProps {
  isOpen: boolean;
  onClose: () => void;
  wordEntry: VocabularyEntry | null;
  book: StoryBook;
  currentChapter: StoryChapter;
  onUpdateBook: (updatedBook: StoryBook) => void;
}

export const VocabularyModal: React.FC<VocabularyModalProps> = ({
  isOpen,
  onClose,
  wordEntry,
  book,
  currentChapter,
  onUpdateBook,
}) => {
  const [savedToNotes, setSavedToNotes] = React.useState(false);

  if (!isOpen || !wordEntry) return null;

  const handlePronounce = () => {
    stopSpeaking();
    speakText(wordEntry.word, { rate: 0.85, pitch: 1.05 });
  };

  const handleSaveToMarginNotes = () => {
    const newNote: MarginNote = {
      id: `vocab_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      chapterId: currentChapter.id,
      chapterNumber: currentChapter.chapterNumber,
      text: `📚 Vocabulary Word: "${wordEntry.word}" (${wordEntry.phonetic}) - ${wordEntry.definition}. Child note: ${wordEntry.childFriendlyExplanation}`,
      selectedQuote: wordEntry.exampleSentence,
      category: 'reflection',
      colorTag: 'sage',
      createdAt: Date.now(),
    };

    const updatedChapters = book.chapters.map((chap) => {
      if (chap.id === currentChapter.id) {
        return {
          ...chap,
          notes: [...(chap.notes || []), newNote],
        };
      }
      return chap;
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: Date.now(),
    });

    setSavedToNotes(true);
    setTimeout(() => setSavedToNotes(false), 2500);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg bg-[#FAF8F5] border border-[#DFD8CA] rounded-3xl shadow-2xl overflow-hidden text-[#4A443F]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#E8E2D6] bg-white flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF0E8] border border-[#CAD7C6] flex items-center justify-center text-[#5B6B56]">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#5B6B56]">
                  Word Explorer & Lexicon
                </span>
                <h3 className="font-serif text-2xl font-bold text-[#3A342F] capitalize">
                  {wordEntry.word}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-6 space-y-4">
            {/* Pronunciation & Part of Speech Bar */}
            <div className="flex items-center justify-between gap-2 p-3.5 rounded-2xl bg-[#F4EFE6] border border-[#E2DACB]">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-[#5B6B56] font-bold">
                  /{wordEntry.phonetic}/
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-white border border-[#DFD8CA] text-[#78716A] italic">
                  {wordEntry.partOfSpeech}
                </span>
              </div>

              <button
                onClick={handlePronounce}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EAE5DC] text-[#3A342F] text-xs font-bold border border-[#DFD8CA] shadow-2xs transition-colors"
              >
                <Volume2 className="w-4 h-4 text-[#5B6B56]" />
                <span>Hear</span>
              </button>
            </div>

            {/* Definition */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716A]">
                Definition
              </span>
              <p className="text-sm text-[#3A342F] leading-relaxed font-serif">
                {wordEntry.definition}
              </p>
            </div>

            {/* Child-friendly explanation */}
            <div className="p-3.5 rounded-2xl bg-[#EAF0E8] border border-[#CAD7C6] space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#3B5436]">
                <Sparkles className="w-3.5 h-3.5" />
                <span>What it means in simple terms:</span>
              </div>
              <p className="text-xs text-[#2F442A] leading-relaxed">
                {wordEntry.childFriendlyExplanation}
              </p>
            </div>

            {/* Story Example Sentence */}
            <div className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716A]">
                Example from the Story
              </span>
              <div className="p-3 rounded-xl bg-white border border-[#DFD8CA] text-xs italic text-[#554E46] leading-relaxed border-l-3 border-l-[#5B6B56]">
                "{wordEntry.exampleSentence}"
              </div>
            </div>

            {/* Synonyms */}
            {wordEntry.synonyms && wordEntry.synonyms.length > 0 && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716A]">
                  Similar Words
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {wordEntry.synonyms.map((syn, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white border border-[#DFD8CA] text-xs text-[#4A443F]"
                    >
                      {syn}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer Action */}
          <div className="p-4 border-t border-[#E8E2D6] bg-white flex items-center justify-between gap-3">
            <span className="text-xs text-[#78716A]">
              Chapter {currentChapter.chapterNumber} Lexicon
            </span>

            <button
              onClick={handleSaveToMarginNotes}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all ${
                savedToNotes
                  ? 'bg-[#3B5436] text-white'
                  : 'bg-[#5B6B56] hover:bg-[#4D5C47] text-white'
              }`}
            >
              {savedToNotes ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Saved to Margin Notes!</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Save to Margin Notes</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
