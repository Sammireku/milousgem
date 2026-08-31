import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Sparkles,
  Send,
  Radio,
  BookOpen,
  MessageSquare,
  Bot,
  User,
  Users,
  Play,
  RotateCcw,
  Zap,
} from 'lucide-react';
import { Character, StoryBook } from '../types';
import { narrator } from '../utils/speech';

interface LiveVoiceStudioProps {
  characters: Character[];
  books: StoryBook[];
  onCreateStoryFromVoice: (prompt: string, characterIds: string[]) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini' | 'character';
  senderName: string;
  text: string;
  timestamp: number;
}

export const LiveVoiceStudio: React.FC<LiveVoiceStudioProps> = ({
  characters,
  books,
  onCreateStoryFromVoice,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [conversationMode, setConversationMode] = useState<'brainstorm' | 'character_roleplay' | 'narrator'>('brainstorm');
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>(characters[0]?.id || '');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'gemini',
      senderName: 'Gemini Live Storyteller',
      text: 'Greetings, storyteller! I am your Live Gemini creative narrator. Speak or write your thoughts—we can brainstorm fresh plot twists, converse directly in-character with your cast, or weave branching scenes together.',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [autoSpeakReplies, setAutoSpeakReplies] = useState<boolean>(true);
  const [speechError, setSpeechError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const selectedChar = characters.find((c) => c.id === selectedCharacterId) || characters[0];

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition event:', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Voice input: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechError('Speech recognition is not supported in this browser; you can type directly below.');
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      narrator.stop();
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      narrator.stop();
      setTranscript('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn('Recognition start error:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = (textToSend || transcript).trim();
    if (!messageText || isLoading) return;

    // Stop listening & clear input
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    setTranscript('');

    // Add user message
    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      senderName: 'You',
      text: messageText,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Direct request to Gemini Live storyteller API
      const response = await fetch('/api/voice/interact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSpeech: messageText,
          conversationMode,
          castMembers: conversationMode === 'character_roleplay' && selectedChar ? [selectedChar] : characters,
          activeBookContext: books[0] || null,
        }),
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to receive voice response');
      }

      const replyText = data.storytellerReply || 'I hear your idea clearly. Let us craft this story chapter together.';
      const senderName =
        conversationMode === 'character_roleplay' && selectedChar
          ? `${selectedChar.name} (${selectedChar.titleOrRole})`
          : 'Gemini Live Storyteller';

      const botMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        sender: conversationMode === 'character_roleplay' ? 'character' : 'gemini',
        senderName,
        text: replyText,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, botMsg]);

      // Auto-narrate reply
      if (autoSpeakReplies) {
        narrator.speak(replyText, {
          rate: conversationMode === 'character_roleplay' ? 0.95 : 1.05,
          pitch: conversationMode === 'character_roleplay' ? 0.9 : 1.0,
        });
      }
    } catch (err: any) {
      console.error('Voice interaction error:', err);
      const errMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        sender: 'gemini',
        senderName: 'Gemini Voice Engine',
        text: `That sparked an intriguing narrative thread: "${messageText}". Let's incorporate this into your chronicle.`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-[#E8E2D6]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs uppercase tracking-wider font-bold px-2.5 py-0.5 rounded-full bg-[#EAF0E8] text-[#3B5436] border border-[#CAD7C6] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#5B6B56] animate-pulse" />
              Gemini Live Voice Studio
            </span>
            <span className="text-xs text-[#78716A]">Voice Conversations & Spoken Storycraft</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#3A342F]">
            Live Voice Conversations
          </h1>
          <p className="text-[#6E665E] text-sm max-w-2xl mt-1">
            Talk directly to Gemini Live to brainstorm plot directions, converse in-character with your cast, or weave interactive tales using natural speech.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const lastGeminiMsg = [...messages].reverse().find((m) => m.sender !== 'user');
              if (lastGeminiMsg) {
                onCreateStoryFromVoice(lastGeminiMsg.text, selectedChar ? [selectedChar.id] : []);
              }
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white font-semibold text-xs sm:text-sm shadow-xs transition-colors"
          >
            <BookOpen className="w-4 h-4" />
            <span>Weave Story from Ideas</span>
          </button>
        </div>
      </div>

      {/* Mode Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <button
          onClick={() => setConversationMode('brainstorm')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            conversationMode === 'brainstorm'
              ? 'bg-[#EAF0E8] border-[#CAD7C6] shadow-xs'
              : 'bg-[#FDFCF9] border-[#DFD8CA] hover:bg-[#F9F7F2]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-[#3A342F]">
            <Sparkles className="w-4 h-4 text-[#5B6B56]" />
            Plot & Scene Brainstormer
          </div>
          <p className="text-xs text-[#6E665E] mt-1">
            Explore worldbuilding, non-repeating twists, and moral dilemmas.
          </p>
        </button>

        <button
          onClick={() => setConversationMode('character_roleplay')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            conversationMode === 'character_roleplay'
              ? 'bg-[#EAF0E8] border-[#CAD7C6] shadow-xs'
              : 'bg-[#FDFCF9] border-[#DFD8CA] hover:bg-[#F9F7F2]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-[#3A342F]">
            <Users className="w-4 h-4 text-[#B45F3C]" />
            Character Voice Dialogue
          </div>
          <p className="text-xs text-[#6E665E] mt-1">
            Converse directly with your created character's flaw and voice cadence.
          </p>
        </button>

        <button
          onClick={() => setConversationMode('narrator')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            conversationMode === 'narrator'
              ? 'bg-[#EAF0E8] border-[#CAD7C6] shadow-xs'
              : 'bg-[#FDFCF9] border-[#DFD8CA] hover:bg-[#F9F7F2]'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm text-[#3A342F]">
            <Radio className="w-4 h-4 text-[#8C6D38]" />
            Interactive Audio Chronicle
          </div>
          <p className="text-xs text-[#6E665E] mt-1">
            Live choose-your-own-adventure storytelling spoken out loud.
          </p>
        </button>
      </div>

      {/* Roleplay Character Picker */}
      {conversationMode === 'character_roleplay' && (
        <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-2xl p-4 mb-6 shadow-xs flex items-center gap-4 overflow-x-auto">
          <span className="text-xs font-bold text-[#4A443F] shrink-0">Select Character:</span>
          <div className="flex items-center gap-2">
            {characters.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCharacterId(c.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
                  selectedCharacterId === c.id
                    ? 'bg-[#5B6B56] text-white border-[#5B6B56] shadow-xs'
                    : 'bg-white text-[#4A443F] border-[#DCD5C9] hover:bg-[#F9F7F2]'
                }`}
              >
                <img
                  src={c.visualProfile.photoUrl}
                  alt={c.name}
                  referrerPolicy="no-referrer"
                  className="w-5 h-5 rounded-full object-cover"
                />
                <span>{c.name}</span>
                <span className="text-[10px] opacity-80">({c.role})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conversation Window */}
      <div className="bg-[#FDFCF9] border border-[#DFD8CA] rounded-3xl p-6 shadow-sm flex flex-col h-[520px]">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender !== 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[#EAF0E8] border border-[#CAD7C6] flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  {msg.sender === 'character' && selectedChar ? (
                    <img
                      src={selectedChar.visualProfile.photoUrl}
                      alt={selectedChar.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full rounded-xl object-cover"
                    />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#5B6B56]" />
                  )}
                </div>
              )}

              <div
                className={`max-w-xl rounded-2xl p-4 text-sm leading-relaxed shadow-xs ${
                  msg.sender === 'user'
                    ? 'bg-[#5B6B56] text-white rounded-tr-xs'
                    : msg.sender === 'character'
                    ? 'bg-[#FAF4EE] border border-[#E8D8CD] text-[#3A342F] rounded-tl-xs'
                    : 'bg-white border border-[#DFD8CA] text-[#3A342F] rounded-tl-xs'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-serif font-bold text-xs opacity-90">{msg.senderName}</span>
                  {msg.sender !== 'user' && (
                    <button
                      onClick={() => narrator.speak(msg.text)}
                      className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
                      title="Replay Voice"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-[#3A342F] flex items-center justify-center shrink-0 mt-0.5 shadow-xs text-white">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-[#EAF0E8] border border-[#CAD7C6] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#5B6B56]" />
              </div>
              <div className="bg-white border border-[#DFD8CA] rounded-2xl p-3 text-xs text-[#78716A]">
                Gemini Live is weaving response...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice & Input Controls Footer */}
        <div className="pt-4 mt-2 border-t border-[#E8E2D6]">
          {/* Live Waveform Indicator when Listening */}
          {isListening && (
            <div className="mb-3 p-2.5 rounded-xl bg-[#EAF0E8] border border-[#CAD7C6] flex items-center justify-between text-xs text-[#3B5436] animate-pulse">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#5B6B56]" />
                <span className="font-semibold">Listening to your voice... (Speak clearly)</span>
              </div>
              <span className="font-mono text-[11px]">LIVE AUDIO STREAM</span>
            </div>
          )}

          {speechError && (
            <div className="mb-2 text-xs text-[#B45F3C]">{speechError}</div>
          )}

          <div className="flex items-center gap-3">
            {/* Mic Toggle Button */}
            <button
              id="voice-mic-btn"
              onClick={toggleListening}
              className={`p-3.5 rounded-2xl border shadow-xs transition-all ${
                isListening
                  ? 'bg-[#B45F3C] text-white border-[#B45F3C] scale-105 shadow-md animate-bounce'
                  : 'bg-white border-[#DCD5C9] hover:bg-[#EAF0E8] text-[#5B6B56]'
              }`}
              title={isListening ? 'Stop Listening' : 'Start Voice Input'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Audio narration toggle */}
            <button
              onClick={() => setAutoSpeakReplies(!autoSpeakReplies)}
              className={`p-3.5 rounded-2xl border shadow-xs transition-colors ${
                autoSpeakReplies
                  ? 'bg-[#EAF0E8] text-[#3B5436] border-[#CAD7C6]'
                  : 'bg-white text-[#78716A] border-[#DCD5C9]'
              }`}
              title={autoSpeakReplies ? 'Auto-Voice Enabled' : 'Auto-Voice Muted'}
            >
              {autoSpeakReplies ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>

            {/* Text Input fallback */}
            <div className="flex-1 relative">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={
                  isListening
                    ? 'Listening... transcript appears here...'
                    : 'Speak using the microphone or type your prompt...'
                }
                className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white border border-[#DCD5C9] text-sm text-[#3A342F] focus:outline-none focus:border-[#5B6B56] shadow-xs"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={!transcript.trim() || isLoading}
                className="absolute right-2 top-2 p-2 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] disabled:opacity-40 text-white shadow-xs transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
