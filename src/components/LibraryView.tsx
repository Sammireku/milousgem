import React, { useState } from 'react';
import {
  BookOpen,
  PlusCircle,
  Search,
  Sparkles,
  Bookmark,
  Star,
  Trash2,
  Layers,
  CheckCircle2,
  Clock,
  Compass,
  ArrowRight,
  Filter,
} from 'lucide-react';
import { StoryBook, StoryGenre } from '../types';
import { GENRE_PRESETS } from '../utils/presets';

interface LibraryViewProps {
  books: StoryBook[];
  onSelectBook: (book: StoryBook) => void;
  onCreateNewStory: () => void;
  onToggleFavorite: (id: string) => void;
  onDeleteBook: (id: string) => void;
  onOpenCharacterStudio: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  books,
  onSelectBook,
  onCreateNewStory,
  onToggleFavorite,
  onDeleteBook,
  onOpenCharacterStudio,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>('all');
  const [filterFavoriteOnly, setFilterFavoriteOnly] = useState(false);

  const filteredBooks = books.filter((b) => {
    const matchesSearch =
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.synopsis.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.cast.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesGenre = selectedGenreFilter === 'all' || b.genre === selectedGenreFilter;
    const matchesFav = !filterFavoriteOnly || b.isFavorite;
    return matchesSearch && matchesGenre && matchesFav;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Hero Banner in Natural Tones */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#EFEAE1] via-[#F5EFEB] to-[#EAE2D7] border border-[#DFD8CA] p-6 sm:p-10 shadow-sm text-[#4A443F]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF0E8] border border-[#D0E0CC] text-[#3F5439] text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#5B6B56]" /> MilousGem Infinite Chronicle Library
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#3A342F]">
            Your Living Sanctuary of Character Stories
          </h1>
          <p className="text-sm sm:text-base text-[#6E665E] leading-relaxed">
            Every storybook is forged with personalized camera characters, non-repetitive narrative arcs, and contextual scene illustrations. Select a chronicle to immerse or weave a new tale.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              id="library-create-story-btn"
              onClick={onCreateNewStory}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-bold text-sm shadow-md hover:shadow-lg hover:scale-[1.01] transition-all"
            >
              <PlusCircle className="w-5 h-5" />
              <span>Weave New Storybook</span>
            </button>

            <button
              onClick={onOpenCharacterStudio}
              className="flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-[#FFFFFF] hover:bg-[#F5EFEB] text-[#4A443F] font-semibold text-sm border border-[#DFD8CA] transition-colors shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-[#8C6D38]" />
              <span>Character Studio</span>
            </button>
          </div>
        </div>

        {/* Ambient decorative tint */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-gradient-to-br from-[#8C9A86]/20 to-[#C47C5D]/15 blur-3xl pointer-events-none" />
      </div>

      {/* Library Controls & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-[#8C827A] absolute left-3 top-3" />
            <input
              id="library-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search books, synopses, cast..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white border border-[#DFD8CA] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#70826C] focus:ring-1 focus:ring-[#70826C]/20 text-xs sm:text-sm shadow-xs"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1">
            <button
              onClick={() => setFilterFavoriteOnly(!filterFavoriteOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterFavoriteOnly
                  ? 'bg-[#5B6B56] text-white shadow-xs'
                  : 'bg-white text-[#6E665E] hover:text-[#3A342F] border border-[#DFD8CA]'
              }`}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Favorites Only</span>
            </button>

            <select
              id="library-genre-filter"
              value={selectedGenreFilter}
              onChange={(e) => setSelectedGenreFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-[#DFD8CA] text-[#4A443F] text-xs font-semibold focus:outline-none focus:border-[#70826C] capitalize shadow-xs"
            >
              <option value="all">All Genres</option>
              {GENRE_PRESETS.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bookshelf Grid */}
        {filteredBooks.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#F5EFEB]/70 border border-[#DFD8CA] space-y-4">
            <BookOpen className="w-10 h-10 mx-auto text-[#A0988F]" />
            <h3 className="font-serif text-xl font-bold text-[#3A342F]">No Storybooks Match Your Query</h3>
            <p className="text-xs text-[#78716A] max-w-sm mx-auto">
              Start crafting an enchanted chronicle with your custom cast!
            </p>
            <button
              onClick={onCreateNewStory}
              className="px-5 py-2.5 rounded-xl bg-[#5B6B56] text-white font-bold text-xs shadow-sm hover:bg-[#4D5C47]"
            >
              Weave First Story
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map((book) => {
              const completedChapters = book.chapters.length;
              const progressPct = Math.round((completedChapters / book.targetChapters) * 100);

              return (
                <div
                  key={book.id}
                  id={`book-card-${book.id}`}
                  className="group relative rounded-3xl bg-white border border-[#E8E2D6] hover:border-[#70826C]/50 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-[0_2px_12px_rgba(74,68,63,0.04)]"
                >
                  {/* Cover Image & Badges */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#ECE7DE]">
                    <img
                      src={book.coverImage || book.chapters[0]?.imageUrl || 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=500&q=80'}
                      alt={book.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

                    {/* Top badging */}
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider bg-[#F9F7F2]/90 backdrop-blur-md text-[#3F5439] border border-[#D0E0CC] shadow-xs">
                        {book.genre}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(book.id);
                        }}
                        className={`p-1.5 rounded-full backdrop-blur-md transition-colors ${
                          book.isFavorite
                            ? 'bg-[#B45F3C] text-white shadow-sm'
                            : 'bg-black/40 text-white/80 hover:text-white'
                        }`}
                        title="Toggle Favorite"
                      >
                        <Star className="w-3.5 h-3.5 fill-current" />
                      </button>
                    </div>

                    {/* Title overlay */}
                    <div className="absolute bottom-3 left-4 right-4">
                      <h3 className="font-serif text-xl font-bold text-white leading-tight drop-shadow-xs">
                        {book.title}
                      </h3>
                      <span className="text-xs text-[#E8E2D6] font-serif italic">
                        {book.artStyle.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  {/* Body details */}
                  <div className="p-5 space-y-4 flex-1 flex flex-col justify-between text-xs">
                    <div className="space-y-3">
                      <p className="text-[#6E665E] leading-relaxed line-clamp-2">
                        {book.synopsis}
                      </p>

                      {/* Cast avatars row */}
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] uppercase font-bold text-[#8C827A] tracking-wider">
                          Cast Ensemble ({book.cast.length})
                        </span>
                        <div className="flex items-center gap-2">
                          {book.cast.map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-[#F5EFEB] border border-[#DFD8CA]"
                              title={`${c.name} (${c.role})`}
                            >
                              <img
                                src={c.visualProfile.photoUrl}
                                alt={c.name}
                                referrerPolicy="no-referrer"
                                className="w-4 h-4 rounded-full object-cover"
                              />
                              <span className="text-[11px] font-medium text-[#4A443F] truncate max-w-[90px]">
                                {c.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Chapter Progress */}
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[11px] text-[#78716A]">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#5B6B56]" />
                            <span>
                              {book.isCompleted
                                ? 'Completed'
                                : `Chapter ${completedChapters} of ${book.targetChapters}`}
                            </span>
                          </span>
                          <span className="font-mono text-[#4A443F] font-semibold">{progressPct}%</span>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-[#EFEAE1] overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              book.isCompleted
                                ? 'bg-[#5B6B56]'
                                : 'bg-gradient-to-r from-[#5B6B56] to-[#B45F3C]'
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-4 border-t border-[#E8E2D6] flex items-center justify-between gap-2">
                      <button
                        id={`read-book-${book.id}`}
                        onClick={() => onSelectBook(book)}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs hover:shadow-sm"
                      >
                        <BookOpen className="w-4 h-4" />
                        <span>{book.isCompleted ? 'Read Chronicle' : 'Continue Journey'}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>

                      <button
                        id={`delete-book-${book.id}`}
                        onClick={() => onDeleteBook(book.id)}
                        className="p-2.5 rounded-xl bg-[#F5EFEB] hover:bg-[#FAEDE8] text-[#78716A] hover:text-[#933D22] transition-colors border border-[#DFD8CA]"
                        title="Delete Storybook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

