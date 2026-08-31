import React, { useState, useEffect } from 'react';
import {
  Character,
  StoryBook,
  UserAccount,
  AppView,
} from './types';
import {
  loadCharacters,
  saveCharacters,
  loadBooks,
  saveBooks,
  loadCurrentUser,
  saveCurrentUser,
  loadReadingSettings,
  saveReadingSettings,
  ReadingSettings,
} from './utils/storage';
import {
  subscribeToAuthChanges,
  syncUserCharactersFromCloud,
  syncUserStoriesFromCloud,
  saveCharacterToFirestore,
  deleteCharacterFromFirestore,
  saveStoryToFirestore,
  deleteStoryFromFirestore,
} from './utils/firebase';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { ConfirmModal } from './components/ConfirmModal';
import { LibraryView } from './components/LibraryView';
import { CharacterStudio } from './components/CharacterStudio';
import { StoryCreator } from './components/StoryCreator';
import { StoryReader } from './components/StoryReader';
import { LiveVoiceStudio } from './components/LiveVoiceStudio';
import { VeoMotionStudio } from './components/VeoMotionStudio';
import { ImageStudio } from './components/ImageStudio';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('library');
  const [user, setUser] = useState<UserAccount>(loadCurrentUser);
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  const [characters, setCharacters] = useState<Character[]>(loadCharacters);
  const [books, setBooks] = useState<StoryBook[]>(loadBooks);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [preselectedCastCharacter, setPreselectedCastCharacter] = useState<Character | null>(null);

  const [readingSettings, setReadingSettings] = useState<ReadingSettings>(loadReadingSettings);

  // In-app deletion confirmation dialog state
  const [confirmModalState, setConfirmModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // In-app toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Subscribe to Firebase Authentication
  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges(async (fbUser) => {
      if (fbUser) {
        setUser(fbUser);
        // Load cloud documents from Firestore
        try {
          const cloudChars = await syncUserCharactersFromCloud(fbUser.id);
          if (cloudChars.length > 0) {
            setCharacters(cloudChars);
          }
          const cloudBooks = await syncUserStoriesFromCloud(fbUser.id);
          if (cloudBooks.length > 0) {
            setBooks(cloudBooks);
          }
        } catch (e) {
          console.warn('Cloud sync note:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Local storage persistence fallbacks
  useEffect(() => {
    saveCharacters(characters);
  }, [characters]);

  useEffect(() => {
    saveBooks(books);
  }, [books]);

  useEffect(() => {
    saveCurrentUser(user);
  }, [user]);

  useEffect(() => {
    saveReadingSettings(readingSettings);
  }, [readingSettings]);

  // Character handlers (with Firebase Firestore Sync)
  const handleSaveCharacter = async (character: Character) => {
    setCharacters((prev) => {
      const exists = prev.some((c) => c.id === character.id);
      if (exists) {
        return prev.map((c) => (c.id === character.id ? character : c));
      }
      return [character, ...prev];
    });

    showToast(`Character "${character.name}" saved to roster!`, 'success');

    // Cloud persist
    if (user.id && user.authProvider !== 'guest') {
      await saveCharacterToFirestore(user.id, character);
    }
  };

  const handleDeleteCharacter = (id: string) => {
    const charToDelete = characters.find((c) => c.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Remove Character Portrait',
      message: `Are you sure you want to delete "${charToDelete?.name || 'this character'}" from your universe roster? This action cannot be undone.`,
      onConfirm: async () => {
        setCharacters((prev) => prev.filter((c) => c.id !== id));
        showToast(`Character removed from roster`, 'success');
        if (user.id && user.authProvider !== 'guest') {
          try {
            await deleteCharacterFromFirestore(user.id, id);
          } catch (err) {
            console.error('Error deleting from Firestore:', err);
          }
        }
      },
    });
  };

  const handleCastCharacter = (character: Character) => {
    setPreselectedCastCharacter(character);
    setCurrentView('create_story');
  };

  // StoryBook handlers (with Firebase Firestore Sync)
  const handleCreateBook = async (newBook: StoryBook) => {
    setBooks((prev) => [newBook, ...prev]);
    setSelectedBookId(newBook.id);
    setCurrentView('reader');

    // Cloud persist
    if (user.id && user.authProvider !== 'guest') {
      await saveStoryToFirestore(user.id, newBook);
    }
  };

  const handleUpdateBook = async (updatedBook: StoryBook) => {
    setBooks((prev) => prev.map((b) => (b.id === updatedBook.id ? updatedBook : b)));
    if (user.id && user.authProvider !== 'guest') {
      await saveStoryToFirestore(user.id, updatedBook);
    }
  };

  const handleDeleteBook = (id: string) => {
    const bookToDelete = books.find((b) => b.id === id);
    setConfirmModalState({
      isOpen: true,
      title: 'Delete Storybook Chronicle',
      message: `Are you sure you want to permanently delete "${bookToDelete?.title || 'this storybook'}" and all its chapters?`,
      onConfirm: async () => {
        setBooks((prev) => prev.filter((b) => b.id !== id));
        if (selectedBookId === id) {
          setSelectedBookId(null);
          setCurrentView('library');
        }
        showToast('Storybook deleted from library', 'success');
        if (user.id && user.authProvider !== 'guest') {
          try {
            await deleteStoryFromFirestore(user.id, id);
          } catch (err) {
            console.error('Error deleting story from Firestore:', err);
          }
        }
      },
    });
  };

  const handleToggleFavorite = async (id: string) => {
    setBooks((prev) =>
      prev.map((b) => {
        if (b.id === id) {
          const updated = { ...b, isFavorite: !b.isFavorite };
          if (user.id && user.authProvider !== 'guest') {
            saveStoryToFirestore(user.id, updated);
          }
          return updated;
        }
        return b;
      })
    );
  };

  const handleSelectBook = (book: StoryBook) => {
    setSelectedBookId(book.id);
    setCurrentView('reader');
  };

  // Export Library JSON
  const handleExportLibrary = () => {
    const data = {
      exportDate: new Date().toISOString(),
      version: '2.0',
      user,
      characters,
      books,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `milousgem-library-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Library exported successfully!', 'success');
  };

  // Import Library JSON
  const handleImportLibrary = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (Array.isArray(parsed.characters)) {
          setCharacters(parsed.characters);
        }
        if (Array.isArray(parsed.books)) {
          setBooks(parsed.books);
        }
        showToast('Library imported successfully!', 'success');
      } catch (err) {
        showToast('Failed to parse library JSON file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const activeBook = books.find((b) => b.id === selectedBookId) || books[0];

  return (
    <div className="min-h-screen bg-[#F9F7F2] text-[#4A443F] flex flex-col font-serif selection:bg-[#5B6B56] selection:text-white">
      {/* Top Navigation */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => {
          if (view === 'create_story') setPreselectedCastCharacter(null);
          setCurrentView(view);
        }}
        user={user}
        onOpenAuth={() => setIsAuthOpen(true)}
        activeBook={activeBook}
        characterCount={characters.length}
        bookCount={books.length}
      />

      {/* Main Viewport */}
      <main className="flex-1">
        {currentView === 'library' && (
          <LibraryView
            books={books}
            onSelectBook={handleSelectBook}
            onCreateNewStory={() => {
              setPreselectedCastCharacter(null);
              setCurrentView('create_story');
            }}
            onToggleFavorite={handleToggleFavorite}
            onDeleteBook={handleDeleteBook}
            onOpenCharacterStudio={() => setCurrentView('characters')}
          />
        )}

        {currentView === 'characters' && (
          <CharacterStudio
            characters={characters}
            onSaveCharacter={handleSaveCharacter}
            onDeleteCharacter={handleDeleteCharacter}
            onCastCharacter={handleCastCharacter}
          />
        )}

        {currentView === 'create_story' && (
          <StoryCreator
            characters={characters}
            onCreateBook={handleCreateBook}
            onOpenCharacterStudio={() => setCurrentView('characters')}
            preselectedCharacter={preselectedCastCharacter}
          />
        )}

        {currentView === 'reader' && activeBook && (
          <StoryReader
            book={activeBook}
            onUpdateBook={handleUpdateBook}
            readingSettings={readingSettings}
            onUpdateSettings={setReadingSettings}
            onBackToLibrary={() => setCurrentView('library')}
          />
        )}

        {currentView === 'voice_studio' && (
          <LiveVoiceStudio
            characters={characters}
            books={books}
            onCreateStoryFromVoice={(prompt, characterIds) => {
              const char = characters.find((c) => characterIds.includes(c.id));
              if (char) setPreselectedCastCharacter(char);
              setCurrentView('create_story');
            }}
          />
        )}

        {currentView === 'veo_motion' && (
          <VeoMotionStudio
            characters={characters}
            books={books}
            onOpenCharacterStudio={() => setCurrentView('characters')}
          />
        )}

        {currentView === 'image_studio' && (
          <ImageStudio
            characters={characters}
            books={books}
            onSaveAsCharacterPortrait={(imgUrl, name) => {
              const newChar: Character = {
                id: `char_${Date.now()}`,
                userId: user.id || 'default',
                name: name || 'Visual Character',
                titleOrRole: 'The Illustrated Vision',
                role: 'protagonist',
                visualProfile: {
                  photoUrl: imgUrl,
                  speciesOrArchetype: 'Celestial Dreamer',
                  appearanceTags: ['Artistic Portrait', 'High Definition', 'Luminous'],
                  artisticStylePrompt: 'Masterpiece character illustration',
                  keyColors: ['#5B6B56', '#B45F3C', '#EAE5DC'],
                },
                backstory: 'Created directly within the visual arts studio.',
                personality: ['Mysterious', 'Vibrant', 'Adaptable'],
                flawOrSecret: 'Bound by the frame of forgotten realities.',
                signatureItem: 'An illuminated crystal lens',
                speechPattern: 'Eloquent and contemplative',
                genreAffinities: ['fantasy', 'cyberpunk', 'mythological'],
                createdAt: Date.now(),
              };
              handleSaveCharacter(newChar);
              showToast('Saved to your character roster!', 'success');
            }}
            onSendToVeoAnimator={(imgUrl) => {
              setCurrentView('veo_motion');
            }}
          />
        )}
      </main>

      {/* App Global Footer */}
      <footer className="w-full border-t border-[#DFD8CA] bg-[#F3EDE2]/80 backdrop-blur-sm py-6 px-4 text-center">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#78716A]">
          <div className="flex items-center gap-1.5 font-medium text-[#4A443F]">
            <span>MilousGem Story Studio</span>
            <span className="text-[#C5BCB0]">•</span>
            <span>Kids & Interactive Chronicles</span>
          </div>

          <div className="flex items-center gap-1 font-serif text-[#5B6B56] font-semibold">
            <span>Created and designed by Sam</span>
            <span>&copy;</span>
            <span>2026</span>
          </div>
        </div>
      </footer>

      {/* Confirmation Dialog for Deletions */}
      <ConfirmModal
        isOpen={confirmModalState.isOpen}
        onClose={() => setConfirmModalState((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModalState.onConfirm}
        title={confirmModalState.title}
        message={confirmModalState.message}
        confirmLabel="Confirm Delete"
        isDestructive={true}
      />

      {/* Floating Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in flex items-center gap-2.5 px-4 py-3 rounded-2xl bg-[#3A342F] text-white text-xs sm:text-sm font-sans shadow-xl border border-[#554D46]">
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#8C9A86] shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-[#C47C5D] shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onUpdateUser={setUser}
        booksCount={books.length}
        charactersCount={characters.length}
        onExportLibrary={handleExportLibrary}
        onImportLibrary={handleImportLibrary}
      />
    </div>
  );
}
