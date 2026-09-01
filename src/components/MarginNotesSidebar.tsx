import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  StickyNote,
  X,
  Plus,
  Trash2,
  Edit3,
  Check,
  Sparkles,
  Bookmark,
  Quote,
  Copy,
  ChevronRight,
  Filter,
  Layers,
  Clock,
  BookOpen,
} from 'lucide-react';
import { MarginNote, StoryBook, StoryChapter } from '../types';

interface MarginNotesSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  book: StoryBook;
  currentChapter: StoryChapter;
  onUpdateBook: (updatedBook: StoryBook) => void;
  onJumpToChapter?: (chapterIndex: number) => void;
}

const CATEGORY_CONFIG: Record<
  NonNullable<MarginNote['category']>,
  { label: string; icon: string; badgeClass: string }
> = {
  reflection: {
    label: 'Reflection',
    icon: '💭',
    badgeClass: 'bg-[#EAF0E8] text-[#3B5436] border-[#D0E0CC]',
  },
  reminder: {
    label: 'Reminder',
    icon: '📌',
    badgeClass: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  },
  plot_idea: {
    label: 'Plot Idea',
    icon: '✨',
    badgeClass: 'bg-[#EDE9FE] text-[#5B21B6] border-[#DDD6FE]',
  },
  character_note: {
    label: 'Character Note',
    icon: '👤',
    badgeClass: 'bg-[#FDF0EB] text-[#B45F3C] border-[#FAD6C8]',
  },
};

const COLOR_CONFIG: Record<
  NonNullable<MarginNote['colorTag']>,
  { label: string; border: string; bg: string; dot: string }
> = {
  sage: {
    label: 'Sage',
    border: 'border-[#5B6B56]',
    bg: 'bg-[#F4F7F3]',
    dot: 'bg-[#5B6B56]',
  },
  amber: {
    label: 'Amber',
    border: 'border-[#D97706]',
    bg: 'bg-[#FFFBEB]',
    dot: 'bg-[#D97706]',
  },
  terracotta: {
    label: 'Terracotta',
    border: 'border-[#B45F3C]',
    bg: 'bg-[#FFF7F4]',
    dot: 'bg-[#B45F3C]',
  },
  slate: {
    label: 'Slate',
    border: 'border-[#64748B]',
    bg: 'bg-[#F8FAFC]',
    dot: 'bg-[#64748B]',
  },
};

export const MarginNotesSidebar: React.FC<MarginNotesSidebarProps> = ({
  isOpen,
  onClose,
  book,
  currentChapter,
  onUpdateBook,
  onJumpToChapter,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'all'>('current');
  const [isComposing, setIsComposing] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [newQuote, setNewQuote] = useState('');
  const [newCategory, setNewCategory] = useState<NonNullable<MarginNote['category']>>('reflection');
  const [newColorTag, setNewColorTag] = useState<NonNullable<MarginNote['colorTag']>>('sage');
  const [showQuoteInput, setShowQuoteInput] = useState(false);

  // Edit note state
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<NonNullable<MarginNote['category']>>('reflection');
  const [editColorTag, setEditColorTag] = useState<NonNullable<MarginNote['colorTag']>>('sage');

  // Search filter
  const [searchFilter, setSearchFilter] = useState('');
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Collect notes across chapters
  const allNotes: { note: MarginNote; chapterIdx: number; chapterTitle: string }[] = [];
  book.chapters.forEach((chap, idx) => {
    if (chap.notes && Array.isArray(chap.notes)) {
      chap.notes.forEach((n) => {
        allNotes.push({ note: n, chapterIdx: idx, chapterTitle: chap.title });
      });
    }
  });

  const currentChapterNotes = currentChapter.notes || [];

  const handleCreateNote = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: MarginNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      chapterId: currentChapter.id,
      chapterNumber: currentChapter.chapterNumber,
      text: newNoteText.trim(),
      selectedQuote: newQuote.trim() || undefined,
      category: newCategory,
      colorTag: newColorTag,
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

    // Reset composer
    setNewNoteText('');
    setNewQuote('');
    setShowQuoteInput(false);
    setIsComposing(false);
  };

  const handleSaveEdit = (noteId: string) => {
    if (!editText.trim()) return;

    const updatedChapters = book.chapters.map((chap) => {
      if (chap.notes && chap.notes.some((n) => n.id === noteId)) {
        return {
          ...chap,
          notes: chap.notes.map((n) =>
            n.id === noteId
              ? {
                  ...n,
                  text: editText.trim(),
                  category: editCategory,
                  colorTag: editColorTag,
                  updatedAt: Date.now(),
                }
              : n
          ),
        };
      }
      return chap;
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: Date.now(),
    });

    setEditingNoteId(null);
  };

  const handleDeleteNote = (noteId: string) => {
    const updatedChapters = book.chapters.map((chap) => {
      if (chap.notes && chap.notes.some((n) => n.id === noteId)) {
        return {
          ...chap,
          notes: chap.notes.filter((n) => n.id !== noteId),
        };
      }
      return chap;
    });

    onUpdateBook({
      ...book,
      chapters: updatedChapters,
      updatedAt: Date.now(),
    });
  };

  const handleStartEdit = (note: MarginNote) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
    setEditCategory(note.category || 'reflection');
    setEditColorTag(note.colorTag || 'sage');
  };

  const handleCopyAllNotes = () => {
    const lines = [
      `📖 Margin Notes for "${book.title}"`,
      `Exported: ${new Date().toLocaleDateString()}`,
      '',
    ];

    book.chapters.forEach((chap) => {
      if (chap.notes && chap.notes.length > 0) {
        lines.push(`--- Chapter ${chap.chapterNumber}: ${chap.title} ---`);
        chap.notes.forEach((n) => {
          const cat = n.category ? `[${CATEGORY_CONFIG[n.category].label}] ` : '';
          lines.push(`• ${cat}${n.text}`);
          if (n.selectedQuote) {
            lines.push(`  Excerpt: "${n.selectedQuote}"`);
          }
          lines.push(`  Date: ${new Date(n.createdAt).toLocaleString()}`);
          lines.push('');
        });
      }
    });

    navigator.clipboard.writeText(lines.join('\n'));
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  const formatTimestamp = (time: number) => {
    const now = Date.now();
    const diffSec = Math.floor((now - time) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    return new Date(time).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  // Filter notes based on active tab and search
  const displayedNotes = (
    activeTab === 'current'
      ? currentChapterNotes.map((n) => ({
          note: n,
          chapterIdx: book.currentChapterIndex,
          chapterTitle: currentChapter.title,
        }))
      : allNotes
  ).filter((item) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      item.note.text.toLowerCase().includes(q) ||
      (item.note.selectedQuote && item.note.selectedQuote.toLowerCase().includes(q)) ||
      (item.note.category && item.note.category.toLowerCase().includes(q)) ||
      item.chapterTitle.toLowerCase().includes(q)
    );
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop on mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-40 lg:hidden"
          />

          {/* Sliding Sidebar Drawer */}
          <motion.aside
            id="margin-notes-sidebar"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 26, stiffness: 280 }}
            className="fixed top-16 right-0 bottom-0 w-full sm:w-96 max-w-full bg-[#FDFCF9] border-l border-[#DFD8CA] shadow-2xl z-50 flex flex-col overflow-hidden text-[#4A443F]"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-[#E8E2D6] bg-white/90 backdrop-blur-sm flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-2 rounded-xl bg-[#EAF0E8] text-[#3B5436] border border-[#D0E0CC] shrink-0">
                  <StickyNote className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-serif font-bold text-sm text-[#3A342F] truncate">
                    Margin Notes
                  </h3>
                  <p className="text-[11px] text-[#78716A] truncate">
                    Private reader annotations & reminders
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  id="copy-all-notes-btn"
                  onClick={handleCopyAllNotes}
                  className="p-1.5 rounded-lg text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors"
                  title="Copy notes to clipboard"
                >
                  {copyFeedback ? (
                    <Check className="w-4 h-4 text-[#3B5436]" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  id="close-margin-notes-btn"
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors"
                  title="Close sidebar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Scope Navigation Tabs */}
            <div className="px-4 pt-3 pb-2 border-b border-[#E8E2D6] bg-[#FAF8F5] flex items-center justify-between gap-2 shrink-0">
              <div className="flex bg-[#EAE5DC] p-0.5 rounded-xl text-xs font-semibold">
                <button
                  id="tab-current-chapter-notes"
                  onClick={() => setActiveTab('current')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'current'
                      ? 'bg-white text-[#3A342F] shadow-xs font-bold'
                      : 'text-[#78716A] hover:text-[#3A342F]'
                  }`}
                >
                  <span>Ch. {currentChapter.chapterNumber}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === 'current'
                        ? 'bg-[#5B6B56] text-white'
                        : 'bg-[#DFD8CA] text-[#4A443F]'
                    }`}
                  >
                    {currentChapterNotes.length}
                  </span>
                </button>
                <button
                  id="tab-all-chapters-notes"
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
                    activeTab === 'all'
                      ? 'bg-white text-[#3A342F] shadow-xs font-bold'
                      : 'text-[#78716A] hover:text-[#3A342F]'
                  }`}
                >
                  <span>All Book</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeTab === 'all'
                        ? 'bg-[#5B6B56] text-white'
                        : 'bg-[#DFD8CA] text-[#4A443F]'
                    }`}
                  >
                    {allNotes.length}
                  </span>
                </button>
              </div>

              {!isComposing && (
                <button
                  id="open-compose-note-btn"
                  onClick={() => {
                    setIsComposing(true);
                    setActiveTab('current');
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Write</span>
                </button>
              )}
            </div>

            {/* Note Composer Panel */}
            {isComposing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 border-b border-[#DFD8CA] bg-white space-y-3 shrink-0"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-[#5B6B56] flex items-center gap-1">
                    <BookOpen className="w-3 h-3" />
                    <span>Annotating Chapter {currentChapter.chapterNumber}</span>
                  </div>
                  <button
                    onClick={() => {
                      setIsComposing(false);
                      setNewNoteText('');
                      setNewQuote('');
                      setShowQuoteInput(false);
                    }}
                    className="text-[#78716A] hover:text-[#3A342F] text-xs"
                  >
                    Cancel
                  </button>
                </div>

                {/* Category Selector */}
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CATEGORY_CONFIG) as Array<NonNullable<MarginNote['category']>>).map(
                    (catKey) => {
                      const cfg = CATEGORY_CONFIG[catKey];
                      const isSelected = newCategory === catKey;
                      return (
                        <button
                          key={catKey}
                          type="button"
                          onClick={() => setNewCategory(catKey)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                            isSelected
                              ? `${cfg.badgeClass} ring-1 ring-black/10 font-bold shadow-2xs`
                              : 'bg-[#FDFCF9] border-[#DFD8CA] text-[#6E665E] hover:border-[#8C9A86]'
                          }`}
                        >
                          <span>{cfg.icon}</span>
                          <span>{cfg.label}</span>
                        </button>
                      );
                    }
                  )}
                </div>

                {/* Main Note Textarea */}
                <textarea
                  id="new-margin-note-textarea"
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  placeholder={`Write your ${CATEGORY_CONFIG[newCategory].label.toLowerCase()} or note here...`}
                  rows={3}
                  autoFocus
                  className="w-full p-2.5 rounded-xl bg-[#FAF8F5] border border-[#DCD5C9] text-xs text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56] resize-none leading-relaxed shadow-inner"
                />

                {/* Optional Quote Excerpt Input */}
                {showQuoteInput ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-[#78716A]">
                      <span className="flex items-center gap-1 font-semibold">
                        <Quote className="w-3 h-3 text-[#B45F3C]" />
                        <span>Referenced Story Quote / Passage:</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewQuote('');
                          setShowQuoteInput(false);
                        }}
                        className="text-[#9E968D] hover:text-[#3A342F]"
                      >
                        Remove
                      </button>
                    </div>
                    <input
                      type="text"
                      value={newQuote}
                      onChange={(e) => setNewQuote(e.target.value)}
                      placeholder="e.g. 'The clockwork key turned with a soft chime...'"
                      className="w-full px-2.5 py-1.5 rounded-lg bg-[#FAF8F5] border border-[#DCD5C9] text-xs italic text-[#4A443F] focus:outline-none focus:border-[#5B6B56]"
                    />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowQuoteInput(true)}
                    className="text-[11px] text-[#5B6B56] hover:underline flex items-center gap-1 font-semibold"
                  >
                    <Quote className="w-3 h-3" />
                    <span>+ Attach story quote excerpt</span>
                  </button>
                )}

                {/* Color and Submit row */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5">
                    {(Object.keys(COLOR_CONFIG) as Array<NonNullable<MarginNote['colorTag']>>).map(
                      (colorKey) => {
                        const cfg = COLOR_CONFIG[colorKey];
                        const isSelected = newColorTag === colorKey;
                        return (
                          <button
                            key={colorKey}
                            type="button"
                            onClick={() => setNewColorTag(colorKey)}
                            className={`w-5 h-5 rounded-full ${cfg.dot} transition-transform ${
                              isSelected
                                ? 'ring-2 ring-offset-2 ring-[#5B6B56] scale-110'
                                : 'opacity-70 hover:opacity-100'
                            }`}
                            title={cfg.label}
                          />
                        );
                      }
                    )}
                  </div>

                  <button
                    id="save-margin-note-btn"
                    type="button"
                    onClick={() => handleCreateNote()}
                    disabled={!newNoteText.trim()}
                    className="px-3.5 py-1.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Note</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Search Filter when notes exist */}
            {allNotes.length > 3 && (
              <div className="px-4 py-2 border-b border-[#E8E2D6] bg-white">
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Search in margin notes..."
                  className="w-full px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#DCD5C9] text-xs text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#5B6B56]"
                />
              </div>
            )}

            {/* Scrollable Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {displayedNotes.length === 0 ? (
                <div className="text-center py-10 px-4 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#EAF0E8] border border-[#D0E0CC] flex items-center justify-center mx-auto text-[#5B6B56]">
                    <StickyNote className="w-6 h-6 opacity-70" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-serif font-bold text-sm text-[#3A342F]">
                      {searchFilter
                        ? 'No matching notes found'
                        : activeTab === 'current'
                        ? `No notes for Chapter ${currentChapter.chapterNumber} yet`
                        : 'No margin notes written yet'}
                    </h4>
                    <p className="text-xs text-[#78716A] leading-relaxed max-w-xs mx-auto">
                      {searchFilter
                        ? 'Try modifying your search terms.'
                        : 'Jot down personal observations, clues to remember, or reflections as you read.'}
                    </p>
                  </div>
                  {!isComposing && (
                    <button
                      onClick={() => setIsComposing(true)}
                      className="px-4 py-2 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add First Annotation</span>
                    </button>
                  )}
                </div>
              ) : (
                displayedNotes.map(({ note, chapterIdx, chapterTitle }) => {
                  const catCfg = CATEGORY_CONFIG[note.category || 'reflection'];
                  const colorCfg = COLOR_CONFIG[note.colorTag || 'sage'];
                  const isEditing = editingNoteId === note.id;

                  return (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-2xl border shadow-xs transition-all space-y-2.5 ${colorCfg.bg} ${colorCfg.border}/50 hover:${colorCfg.border}`}
                    >
                      {isEditing ? (
                        /* In-line Note Editor */
                        <div className="space-y-2 text-xs">
                          <div className="flex flex-wrap gap-1">
                            {(
                              Object.keys(CATEGORY_CONFIG) as Array<
                                NonNullable<MarginNote['category']>
                              >
                            ).map((catKey) => (
                              <button
                                key={catKey}
                                type="button"
                                onClick={() => setEditCategory(catKey)}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                                  editCategory === catKey
                                    ? CATEGORY_CONFIG[catKey].badgeClass
                                    : 'bg-white border-[#DFD8CA] text-[#78716A]'
                                }`}
                              >
                                {CATEGORY_CONFIG[catKey].icon} {CATEGORY_CONFIG[catKey].label}
                              </button>
                            ))}
                          </div>

                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full p-2 rounded-xl bg-white border border-[#DCD5C9] text-xs text-[#3A342F] focus:outline-none focus:border-[#5B6B56] resize-none"
                          />

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-1">
                              {(
                                Object.keys(COLOR_CONFIG) as Array<
                                  NonNullable<MarginNote['colorTag']>
                                >
                              ).map((cKey) => (
                                <button
                                  key={cKey}
                                  type="button"
                                  onClick={() => setEditColorTag(cKey)}
                                  className={`w-4 h-4 rounded-full ${COLOR_CONFIG[cKey].dot} ${
                                    editColorTag === cKey
                                      ? 'ring-2 ring-offset-1 ring-[#5B6B56]'
                                      : 'opacity-60'
                                  }`}
                                />
                              ))}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => setEditingNoteId(null)}
                                className="px-2.5 py-1 rounded-lg text-[#78716A] hover:text-[#3A342F] text-xs"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveEdit(note.id)}
                                className="px-3 py-1 rounded-lg bg-[#5B6B56] text-white text-xs font-bold hover:bg-[#4D5C47]"
                              >
                                Update
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Normal Note View */
                        <>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${catCfg.badgeClass}`}
                              >
                                <span>{catCfg.icon}</span>
                                <span>{catCfg.label}</span>
                              </span>

                              {activeTab === 'all' && (
                                <button
                                  onClick={() => onJumpToChapter && onJumpToChapter(chapterIdx)}
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white border border-[#DFD8CA] text-[#5B6B56] hover:border-[#5B6B56] flex items-center gap-0.5"
                                  title="Jump to this chapter"
                                >
                                  <span>Ch. {note.chapterNumber}</span>
                                  <ChevronRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>

                            {/* Note Action Buttons */}
                            <div className="flex items-center gap-0.5">
                              <button
                                onClick={() => handleStartEdit(note)}
                                className="p-1 rounded-md text-[#8C847B] hover:text-[#3A342F] hover:bg-black/5 transition-colors"
                                title="Edit note"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="p-1 rounded-md text-[#8C847B] hover:text-[#933D22] hover:bg-[#FAEDE8] transition-colors"
                                title="Delete note"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Quoted passage if present */}
                          {note.selectedQuote && (
                            <div className="px-2.5 py-1.5 rounded-lg bg-white/80 border-l-2 border-[#5B6B56] text-[11px] italic text-[#554E46] leading-relaxed">
                              "{note.selectedQuote}"
                            </div>
                          )}

                          {/* Note text content */}
                          <p className="text-xs text-[#3A342F] leading-relaxed whitespace-pre-wrap">
                            {note.text}
                          </p>

                          {/* Footer / timestamp */}
                          <div className="flex items-center justify-between text-[10px] text-[#8C847B] pt-1 border-t border-black/5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />
                              <span>{formatTimestamp(note.createdAt)}</span>
                            </span>
                            {note.updatedAt && <span className="italic">Edited</span>}
                          </div>
                        </>
                      )}
                    </motion.div>
                  );
                })
              )}
            </div>

            {/* Sidebar Bottom Footer Info */}
            <div className="p-3 border-t border-[#E8E2D6] bg-white text-[11px] text-[#78716A] flex items-center justify-between shrink-0">
              <span className="flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-[#5B6B56]" />
                <span>
                  {allNotes.length} {allNotes.length === 1 ? 'annotation' : 'annotations'} in book
                </span>
              </span>
              <span className="text-[10px] text-[#9E968D]">Auto-saved to cloud</span>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};
