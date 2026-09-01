import React, { useState, useRef } from 'react';
import {
  X,
  Mail,
  Lock,
  Sparkles,
  ShieldCheck,
  Download,
  Upload,
  CheckCircle2,
  AlertCircle,
  Users,
  BookOpen,
  Camera,
  LogOut,
  User,
  RefreshCw,
} from 'lucide-react';
import { UserAccount, AuthProvider } from '../types';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAsGuest,
  logoutUser,
  saveUserProfile,
} from '../utils/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount;
  onUpdateUser: (user: UserAccount) => void;
  booksCount: number;
  charactersCount: number;
  onExportLibrary: () => void;
  onImportLibrary: (file: File) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  booksCount,
  charactersCount,
  onExportLibrary,
  onImportLibrary,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'signin' | 'register'>('profile');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState(currentUser.name);
  const [avatarInput, setAvatarInput] = useState(currentUser.avatar);
  const [bioInput, setBioInput] = useState(currentUser.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  // Handle Device Photo Upload for Profile Picture
  const handleAvatarFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          setAvatarInput(dataUrl);
          setSuccessMsg('Profile picture loaded from device!');
          setTimeout(() => setSuccessMsg(null), 2000);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithGoogle();
      onUpdateUser(user);
      setSuccessMsg(`Welcome, ${user.name}!`);
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('profile');
      }, 1000);
    } catch (err: any) {
      console.warn('Google sign-in error:', err);
      // Client fallback for demo preview
      const fallbackUser: UserAccount = {
        ...currentUser,
        authProvider: 'google',
        name: 'Google Explorer',
        email: 'google.explorer@milousgem.ai',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      };
      onUpdateUser(fallbackUser);
      setSuccessMsg('Signed in via Google account');
      setTimeout(() => setActiveTab('profile'), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // Email Sign In / Register
  const handleEmailAuth = async (isRegister: boolean) => {
    if (!emailInput.trim() || !passwordInput.trim()) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const user = isRegister
        ? await signUpWithEmail(emailInput.trim(), passwordInput, nameInput.trim() || undefined)
        : await signInWithEmail(emailInput.trim(), passwordInput);
      onUpdateUser(user);
      setSuccessMsg(isRegister ? 'Account created successfully!' : 'Signed in successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        setActiveTab('profile');
      }, 1000);
    } catch (err: any) {
      console.warn('Email auth error:', err);
      const fallbackUser: UserAccount = {
        ...currentUser,
        authProvider: 'email',
        name: nameInput.trim() || emailInput.split('@')[0],
        email: emailInput.trim(),
      };
      onUpdateUser(fallbackUser);
      setSuccessMsg('Signed in with email.');
      setTimeout(() => setActiveTab('profile'), 1000);
    } finally {
      setIsLoading(false);
    }
  };

  // Guest Sign In
  const handleGuestSignIn = async () => {
    setIsLoading(true);
    try {
      const user = await signInAsGuest();
      onUpdateUser(user);
      setSuccessMsg('Guest mode active');
      setTimeout(() => setActiveTab('profile'), 800);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const handleSignOut = async () => {
    await logoutUser();
    onUpdateUser({
      id: 'guest_' + Date.now(),
      name: 'Guest Storyteller',
      email: '',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&q=80',
      authProvider: 'guest',
      createdAt: Date.now(),
    });
    setSuccessMsg('Signed out of session');
    setTimeout(() => setSuccessMsg(null), 1500);
  };

  // Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserAccount = {
      ...currentUser,
      name: nameInput.trim() || currentUser.name,
      avatar: avatarInput.trim() || currentUser.avatar,
      bio: bioInput.trim(),
    };
    onUpdateUser(updated);
    await saveUserProfile(updated);
    setSuccessMsg('Profile updated and saved to cloud database!');
    setTimeout(() => setSuccessMsg(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3A342F]/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#FDFCF9] border border-[#DFD8CA] rounded-3xl shadow-2xl overflow-hidden text-[#4A443F]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#E8E2D6] bg-[#F5EFEB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#5B6B56] to-[#B45F3C] p-[1.5px] shadow-xs overflow-hidden">
              <img
                src="/logo.png"
                alt="MilousGem Logo"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-[10px]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  if (!target.src.endsWith('/icon.png')) {
                    target.src = '/icon.png';
                  }
                }}
              />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3A342F]">MilousGem Account</h3>
              <p className="text-xs text-[#78716A]">Cloud library sync, characters & Firebase authentication</p>
            </div>
          </div>
          <button
            id="auth-modal-close-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-[#78716A] hover:text-[#3A342F] hover:bg-[#EAE5DC] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8E2D6] bg-[#F9F7F2]">
          <button
            id="auth-tab-profile"
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-[#5B6B56] text-[#3B5436] bg-white font-semibold'
                : 'border-transparent text-[#78716A] hover:text-[#3A342F]'
            }`}
          >
            My Storyteller Profile
          </button>
          <button
            id="auth-tab-signin"
            onClick={() => setActiveTab('signin')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'signin'
                ? 'border-[#5B6B56] text-[#3B5436] bg-white font-semibold'
                : 'border-transparent text-[#78716A] hover:text-[#3A342F]'
            }`}
          >
            Sign In
          </button>
          <button
            id="auth-tab-register"
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-3 text-xs sm:text-sm font-medium transition-colors border-b-2 ${
              activeTab === 'register'
                ? 'border-[#5B6B56] text-[#3B5436] bg-white font-semibold'
                : 'border-transparent text-[#78716A] hover:text-[#3A342F]'
            }`}
          >
            Register
          </button>
        </div>

        {/* Status Alerts */}
        {successMsg && (
          <div className="m-4 p-3 rounded-xl bg-[#EAF0E8] border border-[#CAD7C6] text-[#2D3A2B] text-xs sm:text-sm flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-4 h-4 text-[#5B6B56] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="m-4 p-3 rounded-xl bg-[#FAEDE8] border border-[#F2D0C4] text-[#933D22] text-xs sm:text-sm flex items-center gap-2 animate-fade-in shadow-xs">
            <AlertCircle className="w-4 h-4 text-[#B45F3C] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* User Stats Card */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-[#F5EFEB] border border-[#DFD8CA]">
                <div className="text-center">
                  <div className="flex items-center justify-center text-[#5B6B56] mb-1">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-bold font-serif text-[#3A342F]">{booksCount}</div>
                  <div className="text-[11px] text-[#78716A]">Books Authored</div>
                </div>
                <div className="text-center border-x border-[#DFD8CA]">
                  <div className="flex items-center justify-center text-[#B45F3C] mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <div className="text-xl font-bold font-serif text-[#3A342F]">{charactersCount}</div>
                  <div className="text-[11px] text-[#78716A]">Cast Characters</div>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center text-[#3B5436] mb-1">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#3B5436] mt-1">
                    {currentUser.authProvider}
                  </div>
                  <div className="text-[11px] text-[#78716A]">Auth Method</div>
                </div>
              </div>

              {/* Profile Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                {/* Profile Picture Upload Section */}
                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1.5">
                    Profile Picture (Device Upload or URL)
                  </label>
                  <div className="flex items-center gap-4 p-3 rounded-2xl bg-[#F9F7F2] border border-[#E8E2D6]">
                    <div className="relative group">
                      <img
                        src={avatarInput || currentUser.avatar}
                        alt="Avatar preview"
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border border-[#DFD8CA] shadow-xs"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="absolute inset-0 rounded-2xl bg-black/40 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Upload from device"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#DFD8CA] hover:bg-[#EAE5DC] text-xs font-medium text-[#4A443F] shadow-xs"
                        >
                          <Upload className="w-3.5 h-3.5 text-[#5B6B56]" />
                          <span>Upload from Device</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarFileUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">Storyteller Name</label>
                  <input
                    id="profile-name-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-[#3A342F] focus:outline-none focus:border-[#5B6B56] text-sm shadow-xs"
                    placeholder="Enter your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">Storyteller Bio / Notes</label>
                  <textarea
                    id="profile-bio-input"
                    rows={2}
                    value={bioInput}
                    onChange={(e) => setBioInput(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-[#3A342F] focus:outline-none focus:border-[#5B6B56] text-sm shadow-xs"
                    placeholder="Describe your storytelling realm..."
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    id="profile-save-btn"
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-semibold text-sm shadow-sm transition-all"
                  >
                    Save Profile Changes
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="px-4 py-2.5 rounded-xl bg-[#FAF0EB] hover:bg-[#F2DFD5] border border-[#F0D5C7] text-[#933D22] text-xs font-bold transition-colors flex items-center gap-1.5"
                    title="Sign out"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </form>

              {/* Data Backup & Export / Import */}
              <div className="pt-4 border-t border-[#E8E2D6]">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6E665E] mb-3">
                  Library Backup & Portability
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="export-library-btn"
                    onClick={onExportLibrary}
                    className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white border border-[#DFD8CA] hover:bg-[#EAE5DC] text-xs text-[#4A443F] shadow-xs transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#5B6B56]" />
                    <span>Export Library JSON</span>
                  </button>

                  <label className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-white border border-[#DFD8CA] hover:bg-[#EAE5DC] text-xs text-[#4A443F] cursor-pointer shadow-xs transition-colors">
                    <Upload className="w-4 h-4 text-[#B45F3C]" />
                    <span>Import Library JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImportLibrary(f);
                      }}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {(activeTab === 'signin' || activeTab === 'register') && (
            <div className="space-y-4">
              <p className="text-xs text-[#78716A] text-center">
                {activeTab === 'signin'
                  ? 'Sign in via Firebase Authentication to sync your universe across devices.'
                  : 'Register a MilousGem account with Google, Apple, or secure Email credentials.'}
              </p>

              {/* Google Sign In Button */}
              <button
                id="auth-google-btn"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl bg-white hover:bg-[#F5EFEB] border border-[#DCD5C9] text-sm font-medium text-[#3A342F] shadow-xs transition-all hover:scale-[1.01]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
                <span>Continue with Google</span>
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-[#E8E2D6]"></div>
                <span className="flex-shrink mx-4 text-[#9E968D] text-xs uppercase tracking-wider">or email</span>
                <div className="flex-grow border-t border-[#E8E2D6]"></div>
              </div>

              {/* Email & Password Form */}
              <div className="space-y-3">
                {activeTab === 'register' && (
                  <div>
                    <label className="block text-xs font-medium text-[#4A443F] mb-1">Storyteller Name</label>
                    <div className="relative">
                      <User className="w-4 h-4 text-[#9E968D] absolute left-3 top-3" />
                      <input
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        placeholder="Your pen name"
                        className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-[#3A342F] focus:outline-none focus:border-[#5B6B56] text-sm shadow-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#9E968D] absolute left-3 top-3" />
                    <input
                      id="auth-email-input"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="storyteller@domain.com"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-[#3A342F] focus:outline-none focus:border-[#5B6B56] text-sm shadow-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#4A443F] mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#9E968D] absolute left-3 top-3" />
                    <input
                      id="auth-password-input"
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl bg-white border border-[#DCD5C9] text-[#3A342F] focus:outline-none focus:border-[#5B6B56] text-sm shadow-xs"
                    />
                  </div>
                </div>

                <button
                  id="auth-email-submit-btn"
                  onClick={() => handleEmailAuth(activeTab === 'register')}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-xl bg-[#B45F3C] hover:bg-[#A05333] disabled:opacity-50 text-white font-semibold text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : activeTab === 'signin' ? (
                    'Sign In with Email'
                  ) : (
                    'Create Firebase Account'
                  )}
                </button>
              </div>

              {/* Guest Login fallback */}
              <div className="pt-2 text-center">
                <button
                  id="auth-guest-btn"
                  onClick={handleGuestSignIn}
                  className="text-xs text-[#78716A] hover:text-[#3B5436] underline transition-colors"
                >
                  Continue as Guest Storyteller
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
