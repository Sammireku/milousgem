import React from 'react';
import {
  BookOpen,
  Users,
  PlusCircle,
  Sparkles,
  BookMarked,
  Radio,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { UserAccount, StoryBook, AppView } from '../types';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  user: UserAccount;
  onOpenAuth: () => void;
  activeBook?: StoryBook | null;
  characterCount?: number;
  bookCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  user,
  onOpenAuth,
  activeBook,
  characterCount = 0,
  bookCount = 0,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E8E2D6] bg-[#F9F7F2]/95 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Brand Logo */}
        <div
          id="nav-brand-logo"
          onClick={() => onNavigate('library')}
          className="flex items-center gap-3 cursor-pointer group select-none shrink-0"
        >
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B6B56] via-[#B45F3C] to-[#8C6D38] p-[1.5px] shadow-sm group-hover:shadow-md transition-all">
            <div className="w-full h-full bg-[#FAF8F5] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#5B6B56] group-hover:rotate-12 transition-transform duration-300" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-serif text-xl font-bold tracking-tight text-[#3A342F]">
                MilousGem
              </span>
              <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-[#EAF0E8] text-[#3F5439] border border-[#D0E0CC]">
                AI
              </span>
            </div>
            <p className="text-[11px] text-[#78716A] hidden sm:block">Character Storytelling & Veo 3 Motion</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto py-1">
          {/* Library */}
          <button
            id="nav-tab-library"
            onClick={() => onNavigate('library')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'library'
                ? 'bg-[#5B6B56] text-white shadow-xs'
                : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
            }`}
          >
            <BookOpen className={`w-4 h-4 ${currentView === 'library' ? 'text-white' : 'text-[#5B6B56]'}`} />
            <span className="hidden md:inline">Library</span>
            {bookCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentView === 'library' ? 'bg-white/20 text-white' : 'bg-[#E8E2D6] text-[#4A443F]'
              }`}>
                {bookCount}
              </span>
            )}
          </button>

          {/* Characters */}
          <button
            id="nav-tab-characters"
            onClick={() => onNavigate('characters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'characters'
                ? 'bg-[#5B6B56] text-white shadow-xs'
                : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
            }`}
          >
            <Users className={`w-4 h-4 ${currentView === 'characters' ? 'text-white' : 'text-[#8C9A86]'}`} />
            <span className="hidden md:inline">Characters</span>
            {characterCount > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                currentView === 'characters' ? 'bg-white/20 text-white' : 'bg-[#E8E2D6] text-[#4A443F]'
              }`}>
                {characterCount}
              </span>
            )}
          </button>

          {/* Weave Story */}
          <button
            id="nav-tab-create"
            onClick={() => onNavigate('create_story')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'create_story'
                ? 'bg-[#B45F3C] text-white shadow-xs'
                : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
            }`}
          >
            <PlusCircle className={`w-4 h-4 ${currentView === 'create_story' ? 'text-white' : 'text-[#B45F3C]'}`} />
            <span className="hidden md:inline">Weave Story</span>
          </button>

          {/* Live Voice Studio */}
          <button
            id="nav-tab-voice"
            onClick={() => onNavigate('voice_studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'voice_studio'
                ? 'bg-[#5B6B56] text-white shadow-xs'
                : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
            }`}
          >
            <Radio className={`w-4 h-4 ${currentView === 'voice_studio' ? 'text-white animate-pulse' : 'text-[#5B6B56]'}`} />
            <span className="hidden lg:inline">Live Voice</span>
          </button>

          {/* Veo 3 Motion Animator */}
          <button
            id="nav-tab-veo"
            onClick={() => onNavigate('veo_motion')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'veo_motion'
                ? 'bg-[#B45F3C] text-white shadow-xs'
                : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
            }`}
          >
            <Video className={`w-4 h-4 ${currentView === 'veo_motion' ? 'text-white' : 'text-[#B45F3C]'}`} />
            <span className="hidden lg:inline">Veo 3 Motion</span>
          </button>

          {/* Visual Image Studio */}
          <button
            id="nav-tab-image-studio"
            onClick={() => onNavigate('image_studio')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
              currentView === 'image_studio'
                ? 'bg-[#5B6B56] text-white shadow-xs'
                : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
            }`}
          >
            <ImageIcon className={`w-4 h-4 ${currentView === 'image_studio' ? 'text-white' : 'text-[#8C6D38]'}`} />
            <span className="hidden lg:inline">Image Studio</span>
          </button>

          {/* Active Reader */}
          {activeBook && (
            <button
              id="nav-tab-active-book"
              onClick={() => onNavigate('reader')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all max-w-[140px] sm:max-w-[180px] truncate ${
                currentView === 'reader'
                  ? 'bg-[#8C6D38] text-white shadow-xs'
                  : 'text-[#6E665E] hover:text-[#3A342F] hover:bg-[#EFEAE1]'
              }`}
              title={activeBook.title}
            >
              <BookMarked className={`w-4 h-4 shrink-0 ${currentView === 'reader' ? 'text-white' : 'text-[#8C6D38]'}`} />
              <span className="truncate hidden sm:inline">{activeBook.title}</span>
              <span className="sm:hidden">Read</span>
            </button>
          )}
        </nav>

        {/* User Account / Profile Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="nav-user-profile-btn"
            onClick={onOpenAuth}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-white border border-[#DCD5C9] hover:border-[#70826C] text-[#4A443F] hover:text-[#2D2825] shadow-xs transition-all text-xs"
          >
            <div className="relative">
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-6 h-6 rounded-full object-cover border border-[#D0E0CC]"
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#5B6B56] ring-1 ring-[#F9F7F2]" />
            </div>
            <span className="font-medium hidden sm:inline max-w-[90px] truncate">{user.name}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
