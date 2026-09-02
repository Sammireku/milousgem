import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MapPin,
  X,
  Compass,
  Sparkles,
  Award,
  ChevronRight,
  Bookmark,
  CheckCircle2,
  Lock,
  Route,
  Backpack,
  Printer,
  Eye,
  ArrowRight,
  Shield,
  Zap,
} from 'lucide-react';
import { StoryBook, StoryChapter } from '../types';

interface StoryJourneyMapProps {
  isOpen: boolean;
  onClose: () => void;
  book: StoryBook;
  currentChapterIndex: number;
  onSelectChapter: (chapterIndex: number) => void;
}

const REGION_THEMES = [
  { name: 'The Origin Vale', icon: '🏡', color: 'from-[#607D5A] to-[#455E40]' },
  { name: 'The Whispering Wilds', icon: '🌲', color: 'from-[#3B6E59] to-[#244E3D]' },
  { name: 'The Clockwork Citadel', icon: '⚙️', color: 'from-[#8C6D38] to-[#5F4820]' },
  { name: 'The Sunken Labyrinth', icon: '🌊', color: 'from-[#3A7D8C] to-[#1E525E]' },
  { name: 'The Celestial Summit', icon: '✨', color: 'from-[#6E4B8C] to-[#45275E]' },
  { name: 'The Eternal Sanctuary', icon: '🏰', color: 'from-[#B45F3C] to-[#80381C]' },
];

export const StoryJourneyMap: React.FC<StoryJourneyMapProps> = ({
  isOpen,
  onClose,
  book,
  currentChapterIndex,
  onSelectChapter,
}) => {
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState<number>(currentChapterIndex);

  if (!isOpen) return null;

  const totalWaypoints = Math.max(book.targetChapters, book.chapters.length);
  const selectedChapter = book.chapters[selectedWaypointIndex];

  const handlePrintMap = () => {
    window.print();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/60 backdrop-blur-sm overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 15 }}
          className="relative w-full max-w-5xl bg-[#FDFBF7] border border-[#DFD8CA] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-[#4A443F]"
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-[#E8E2D6] bg-white/90 backdrop-blur-md flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#EAF0E8] border border-[#CAD7C6] flex items-center justify-center text-[#4A6344] shadow-xs">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-[#5B6B56]">
                    Illustrated Chronicle Cartography
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#EAF0E8] text-[10px] font-bold text-[#3B5436] border border-[#CAD7C6]">
                    Branch Tracker
                  </span>
                </div>
                <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#3A342F]">
                  The Journey of {book.title}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="print-journey-map-btn"
                onClick={handlePrintMap}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF8F5] border border-[#DFD8CA] text-xs font-bold text-[#4A443F] hover:bg-[#EAE5DC] transition-colors"
                title="Print Map"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Map</span>
              </button>

              <button
                id="close-journey-map-btn"
                onClick={onClose}
                className="p-2 rounded-xl bg-[#FAF8F5] border border-[#DFD8CA] text-[#78716A] hover:text-[#3A342F] hover:bg-[#EAE5DC] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Main Map Body Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 overflow-y-auto">
            {/* Left: Illustrated Map Canvas & Route */}
            <div className="lg:col-span-7 p-5 sm:p-7 bg-[#F6F2EA] border-r border-[#E8E2D6] relative flex flex-col justify-between overflow-hidden min-h-[420px]">
              {/* Parchment decorative compass rose background */}
              <div className="absolute top-4 right-4 opacity-10 pointer-events-none">
                <Compass className="w-48 h-48 text-[#5B6B56]" />
              </div>

              {/* Waypoint Nodes Line */}
              <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between text-xs text-[#78716A] font-semibold border-b border-[#E0D8C8] pb-3">
                  <span className="flex items-center gap-1.5">
                    <Route className="w-4 h-4 text-[#5B6B56]" />
                    <span>Storyline Path & Waypoints</span>
                  </span>
                  <span>
                    Progress:{' '}
                    <strong className="text-[#3A342F]">
                      {book.chapters.length} / {totalWaypoints}
                    </strong>{' '}
                    Chapters
                  </span>
                </div>

                {/* Vertical Interactive Waypoint Timeline */}
                <div className="space-y-4 relative pl-4 sm:pl-6 before:absolute before:left-7 sm:before:left-9 before:top-4 before:bottom-4 before:w-1 before:bg-gradient-to-b before:from-[#5B6B56] before:via-[#B45F3C] before:to-[#C2B7A3] before:rounded-full">
                  {Array.from({ length: totalWaypoints }).map((_, index) => {
                    const chapter = book.chapters[index];
                    const isUnlocked = !!chapter;
                    const isCurrent = index === currentChapterIndex;
                    const isSelected = index === selectedWaypointIndex;
                    const region = REGION_THEMES[index % REGION_THEMES.length];

                    return (
                      <motion.div
                        key={index}
                        whileHover={isUnlocked ? { scale: 1.01, x: 2 } : {}}
                        onClick={() => {
                          if (isUnlocked) {
                            setSelectedWaypointIndex(index);
                          }
                        }}
                        className={`relative flex items-start gap-4 p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white border-[#5B6B56] shadow-md ring-2 ring-[#5B6B56]/20'
                            : isCurrent
                            ? 'bg-[#FDF6E2] border-[#D97706] shadow-xs'
                            : isUnlocked
                            ? 'bg-white/80 border-[#DFD8CA] hover:bg-white hover:border-[#8C9A86]'
                            : 'bg-[#EDE7DB]/50 border-dashed border-[#D2C8B8] opacity-60 cursor-not-allowed'
                        }`}
                      >
                        {/* Waypoint Icon Node */}
                        <div
                          className={`relative z-10 w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shadow-xs shrink-0 ${
                            isCurrent
                              ? 'bg-[#D97706] text-white ring-4 ring-[#FEF3C7]'
                              : isUnlocked
                              ? 'bg-[#5B6B56] text-white'
                              : 'bg-[#D6CDBF] text-[#8C8476]'
                          }`}
                        >
                          {isUnlocked ? (
                            isCurrent ? (
                              <MapPin className="w-4 h-4 animate-bounce" />
                            ) : (
                              <CheckCircle2 className="w-4 h-4" />
                            )
                          ) : (
                            <Lock className="w-4 h-4" />
                          )}
                        </div>

                        {/* Node Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716A]">
                                Chapter {index + 1}
                              </span>
                              <span className="text-xs">{region.icon}</span>
                              <span className="text-[11px] font-semibold text-[#8C7A68]">
                                {region.name}
                              </span>
                            </div>
                            {isCurrent && (
                              <span className="px-2 py-0.5 rounded-full bg-[#FEF3C7] text-[#92400E] text-[10px] font-bold animate-pulse">
                                Reading Now
                              </span>
                            )}
                          </div>

                          <h4 className="font-serif font-bold text-sm sm:text-base text-[#3A342F] truncate mt-0.5">
                            {isUnlocked ? chapter.title : `Uncharted Milestone ${index + 1}`}
                          </h4>

                          {isUnlocked && chapter.chosenChoiceId && (
                            <p className="text-xs text-[#5B6B56] line-clamp-1 mt-1 flex items-center gap-1">
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span>
                                Chosen Branch:{' '}
                                {
                                  chapter.choices.find((c) => c.id === chapter.chosenChoiceId)
                                    ?.actionDescription
                                }
                              </span>
                            </p>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Map Footer Key */}
              <div className="pt-4 border-t border-[#E0D8C8] flex items-center justify-between text-xs text-[#78716A]">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#5B6B56]" /> Visited
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" /> Current
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#C2B7A3]" /> Uncharted
                  </span>
                </div>
                <span>Woven with Anti-Repetition Arc</span>
              </div>
            </div>

            {/* Right: Selected Waypoint Detail & Relic Dossier */}
            <div className="lg:col-span-5 p-5 sm:p-7 bg-white flex flex-col justify-between overflow-y-auto space-y-6">
              {selectedChapter ? (
                <div className="space-y-5">
                  {/* Waypoint Header */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-[#EAF0E8] text-[#3B5436] text-xs font-bold border border-[#CAD7C6]">
                        Waypoint {selectedChapter.chapterNumber} Dossier
                      </span>
                      <span className="text-xs text-[#78716A]">
                        {new Date(selectedChapter.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl font-bold text-[#3A342F]">
                      {selectedChapter.title}
                    </h3>
                  </div>

                  {/* Illustration Thumbnail */}
                  {selectedChapter.imageUrl && (
                    <div className="rounded-2xl overflow-hidden border border-[#E0D8CA] shadow-sm aspect-video bg-[#F5EFEB]">
                      <img
                        src={selectedChapter.imageUrl}
                        alt={selectedChapter.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Summary */}
                  <div className="p-3.5 rounded-2xl bg-[#FAF8F5] border border-[#DFD8CA] space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716A] flex items-center gap-1">
                      <Bookmark className="w-3 h-3 text-[#5B6B56]" />
                      <span>Chapter Summary</span>
                    </span>
                    <p className="text-xs text-[#4A443F] leading-relaxed">
                      {selectedChapter.summary}
                    </p>
                  </div>

                  {/* Branch Decision Taken */}
                  {selectedChapter.chosenChoiceId && (
                    <div className="p-3.5 rounded-2xl bg-[#FDF0EB] border border-[#FAD6C8] space-y-1.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#B45F3C] flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        <span>Branch Selected Here</span>
                      </span>
                      {(() => {
                        const choice = selectedChapter.choices.find(
                          (c) => c.id === selectedChapter.chosenChoiceId
                        );
                        return (
                          <div className="space-y-1 text-xs">
                            <p className="font-semibold text-[#3A342F]">
                              "{choice?.actionDescription}"
                            </p>
                            <p className="text-[11px] text-[#78716A]">
                              Consequence: {choice?.consequenceHint}
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Relics & Memory Updates Discovered */}
                  {selectedChapter.memoryUpdate && (
                    <div className="p-3.5 rounded-2xl bg-[#EAF0E8] border border-[#CAD7C6] space-y-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#3B5436] flex items-center gap-1">
                        <Backpack className="w-3.5 h-3.5" />
                        <span>Discoveries & Relics Earned</span>
                      </span>
                      <div className="space-y-1 text-xs text-[#3A342F]">
                        {selectedChapter.memoryUpdate.newItems &&
                          selectedChapter.memoryUpdate.newItems.length > 0 && (
                            <p className="flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5 text-[#B45F3C]" />
                              <span>
                                New Items:{' '}
                                <strong>{selectedChapter.memoryUpdate.newItems.join(', ')}</strong>
                              </span>
                            </p>
                          )}
                        {selectedChapter.memoryUpdate.clueDiscovered && (
                          <p className="text-[11px] text-[#4A443F] italic">
                            Clue: "{selectedChapter.memoryUpdate.clueDiscovered}"
                          </p>
                        )}
                        {selectedChapter.memoryUpdate.tensionShift && (
                          <p className="text-[11px] text-[#554E46]">
                            Tension: {selectedChapter.memoryUpdate.tensionShift}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#FAF8F5] border border-[#DFD8CA] flex items-center justify-center mx-auto text-[#78716A]">
                    <Lock className="w-6 h-6" />
                  </div>
                  <h4 className="font-serif font-bold text-base text-[#3A342F]">
                    Uncharted Frontier
                  </h4>
                  <p className="text-xs text-[#78716A] max-w-xs mx-auto">
                    This waypoint has not yet been unlocked. Continue making story choices to forge this path!
                  </p>
                </div>
              )}

              {/* Jump to Chapter Action Button */}
              {selectedChapter && (
                <div className="pt-4 border-t border-[#E8E2D6]">
                  <button
                    id="jump-to-waypoint-btn"
                    onClick={() => {
                      onSelectChapter(selectedWaypointIndex);
                      onClose();
                    }}
                    className="w-full py-3 px-4 rounded-2xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    <span>Jump to Chapter {selectedChapter.chapterNumber}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
