import React, { useState, useMemo } from 'react';
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
  X,
  User,
  Tag,
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

  // Extract all unique characters across all saved books for quick-filter chips
  const collectionCharacters = useMemo(() => {
    const charMap = new Map<string, { id: string; name: string; photoUrl?: string; role?: string; count: number }>();
    books.forEach((b) => {
      (b.cast || []).forEach((c) => {
        if (!c?.name) return;
        const key = c.name.toLowerCase().trim();
        const existing = charMap.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          charMap.set(key, {
            id: c.id,
            name: c.name,
            photoUrl: c.visualProfile?.photoUrl,
            role: c.titleOrRole || c.role,
            count: 1,
          });
        }
      });
    });
    return Array.from(charMap.values());
  }, [books]);

  // Helper to extract a small snippet around matching text
  const extractSnippet = (fullText: string, query: string, maxLength = 55) => {
    const idx = fullText.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return '';
    const start = Math.max(0, idx - 12);
    const end = Math.min(fullText.length, idx + query.length + maxLength - 12);
    const prefix = start > 0 ? '…' : '';
    const suffix = end < fullText.length ? '…' : '';
    return `${prefix}${fullText.substring(start, end).trim()}${suffix}`;
  };

  // Find match details for a book across title, cast, synopsis, chapter text, items, notes
  const getBookMatch = (book: StoryBook, query: string): { label: string; detail: string } | null => {
    if (!query.trim()) return null;
    const q = query.toLowerCase().trim();

    // 1. Character matches (name, role, species/archetype, signature item, personality)
    for (const c of book.cast || []) {
      if (c.name?.toLowerCase().includes(q)) {
        return { label: 'Character', detail: c.name };
      }
      if (c.titleOrRole?.toLowerCase().includes(q)) {
        return { label: 'Role', detail: `${c.name} (${c.titleOrRole})` };
      }
      if (c.visualProfile?.speciesOrArchetype?.toLowerCase().includes(q)) {
        return { label: 'Archetype', detail: `${c.name}: ${c.visualProfile.speciesOrArchetype}` };
      }
      if (c.signatureItem?.toLowerCase().includes(q)) {
        return { label: 'Item', detail: `${c.name}'s ${c.signatureItem}` };
      }
      if (Array.isArray(c.personality) && c.personality.some((p) => p.toLowerCase().includes(q))) {
        const matchedTrait = c.personality.find((p) => p.toLowerCase().includes(q));
        return { label: 'Trait', detail: `${c.name}: ${matchedTrait}` };
      }
    }

    // 2. Title match
    if (book.title?.toLowerCase().includes(q)) {
      return { label: 'Title', detail: book.title };
    }

    // 3. Synopsis match
    if (book.synopsis?.toLowerCase().includes(q)) {
      return { label: 'Synopsis', detail: extractSnippet(book.synopsis, q) };
    }

    // 4. Chapter content, summaries and titles
    for (const ch of book.chapters || []) {
      if (ch.title?.toLowerCase().includes(q)) {
        return { label: `Chapter ${ch.chapterNumber}`, detail: ch.title };
      }
      if (ch.summary?.toLowerCase().includes(q)) {
        return { label: `Chapter ${ch.chapterNumber}`, detail: extractSnippet(ch.summary, q) };
      }
      if (ch.content?.toLowerCase().includes(q)) {
        return { label: `Chapter ${ch.chapterNumber} Story`, detail: extractSnippet(ch.content, q) };
      }
    }

    // 5. Moral Lesson
    if (book.moralLesson?.toLowerCase().includes(q)) {
      return { label: 'Theme', detail: book.moralLesson };
    }

    // 6. Genre & Tone
    if (book.genre?.toLowerCase().includes(q)) {
      return { label: 'Genre', detail: book.genre.replace(/_/g, ' ') };
    }

    return null;
  };

  const filteredBooks = useMemo(() => {
    return books
      .map((b) => ({
        book: b,
        match: searchQuery.trim() ? getBookMatch(b, searchQuery) : null,
      }))
      .filter(({ book, match }) => {
        const matchesSearch = !searchQuery.trim() || match !== null;
        const matchesGenre = selectedGenreFilter === 'all' || book.genre === selectedGenreFilter;
        const matchesFav = !filterFavoriteOnly || book.isFavorite;
        return matchesSearch && matchesGenre && matchesFav;
      });
  }, [books, searchQuery, selectedGenreFilter, filterFavoriteOnly]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Hero Banner in Natural Tones */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#EFEAE1] via-[#F5EFEB] to-[#EAE2D7] border border-[#DFD8CA] p-6 sm:p-10 shadow-sm text-[#4A443F]">
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#EAF0E8] border border-[#D0E0CC] text-[#3F5439] text-xs font-semibold uppercase tracking-wider">
            <img
              src="/logo.png"
              alt="Logo"
              referrerPolicy="no-referrer"
              className="w-4 h-4 rounded-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/icon.png';
              }}
            />
            <span>MilousGem Infinite Chronicle Library</span>
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

      {/* Library Controls & Word Search Tool */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          {/* Word Search Input */}
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-[#8C827A] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="library-search-input"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search characters, keywords, chapters, items..."
              className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-[#DFD8CA] text-[#3A342F] placeholder-[#9E968D] focus:outline-none focus:border-[#70826C] focus:ring-1 focus:ring-[#70826C]/20 text-xs sm:text-sm shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C827A] hover:text-[#3A342F] p-0.5 rounded-full hover:bg-[#F5EFEB] transition-colors"
                title="Clear Search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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

        {/* Character Quick-Filter Pills */}
        {collectionCharacters.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 text-xs pt-0.5">
            <span className="text-[11px] font-bold text-[#8C827A] whitespace-nowrap flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-[#70826C]" />
              <span>Find Character:</span>
            </span>
            {collectionCharacters.map((char) => {
              const isSelected = searchQuery.toLowerCase().trim() === char.name.toLowerCase().trim();
              return (
                <button
                  key={char.id}
                  onClick={() => setSearchQuery(isSelected ? '' : char.name)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all whitespace-nowrap border shadow-2xs ${
                    isSelected
                      ? 'bg-[#5B6B56] text-white border-[#5B6B56]'
                      : 'bg-white text-[#4A443F] border-[#DFD8CA] hover:border-[#70826C] hover:bg-[#F5EFEB]'
                  }`}
                  title={`Find books featuring ${char.name}`}
                >
                  {char.photoUrl ? (
                    <img
                      src={char.photoUrl}
                      alt={char.name}
                      referrerPolicy="no-referrer"
                      className="w-4 h-4 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-[#EFEAE1] text-[#70826C] flex items-center justify-center text-[9px] font-bold">
                      {char.name[0]}
                    </span>
                  )}
                  <span>{char.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#EFEAE1] text-[#6E665E]'
                    }`}
                  >
                    {char.count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Search Results Summary Banner */}
        {searchQuery.trim() && (
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-2xl bg-[#EAF0E8] border border-[#D0E0CC] text-[#3F5439] text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#5B6B56]" />
              <span>
                Found <strong>{filteredBooks.length}</strong> {filteredBooks.length === 1 ? 'storybook' : 'storybooks'} matching "<strong>{searchQuery}</strong>"
              </span>
            </div>
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs font-bold text-[#3F5439] hover:underline flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear search</span>
            </button>
          </div>
        )}

        {/* Bookshelf Grid */}
        {filteredBooks.length === 0 ? (
          <div className="p-16 text-center rounded-3xl bg-[#F5EFEB]/70 border border-[#DFD8CA] space-y-4">
            <BookOpen className="w-10 h-10 mx-auto text-[#A0988F]" />
            <h3 className="font-serif text-xl font-bold text-[#3A342F]">
              {searchQuery ? `No Storybooks Match "${searchQuery}"` : 'No Storybooks In Library'}
            </h3>
            <p className="text-xs text-[#78716A] max-w-sm mx-auto">
              {searchQuery
                ? 'Try searching for another character name, magical item, setting, or keyword.'
                : 'Start crafting an enchanted chronicle with your custom cast!'}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="px-5 py-2.5 rounded-xl bg-[#5B6B56] text-white font-bold text-xs shadow-sm hover:bg-[#4D5C47]"
              >
                Clear Word Search
              </button>
            ) : (
              <button
                onClick={onCreateNewStory}
                className="px-5 py-2.5 rounded-xl bg-[#5B6B56] text-white font-bold text-xs shadow-sm hover:bg-[#4D5C47]"
              >
                Weave First Story
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBooks.map(({ book, match }) => {
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

                      {/* Word Search Match Highlight */}
                      {match && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#EAF0E8] border border-[#D0E0CC] text-[#2F442A] text-[11px]">
                          <Tag className="w-3.5 h-3.5 text-[#5B6B56] shrink-0" />
                          <span className="font-bold text-[#2E4228] shrink-0">
                            Found in {match.label}:
                          </span>
                          <span className="truncate italic text-[#3F5439]">
                            "{match.detail}"
                          </span>
                        </div>
                      )}

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

