import React from 'react';
import { Sparkles, Trash2, Edit3, ShieldAlert, MessageSquare, Gem, PlusCircle, Check } from 'lucide-react';
import { Character, CharacterRole } from '../types';

interface CharacterCardProps {
  character: Character;
  onEdit?: (character: Character) => void;
  onDelete?: (id: string) => void;
  onSelectForStory?: (character: Character) => void;
  isSelected?: boolean;
  isCastMode?: boolean;
}

const ROLE_BADGES: Record<CharacterRole, { label: string; bg: string; text: string; border: string }> = {
  protagonist: { label: 'Protagonist', bg: 'bg-[#EAF0E8]', text: 'text-[#3B5436]', border: 'border-[#D0E0CC]' },
  antagonist: { label: 'Antagonist', bg: 'bg-[#FAEDE8]', text: 'text-[#933D22]', border: 'border-[#F2D0C4]' },
  companion: { label: 'Companion', bg: 'bg-[#EDF2F7]', text: 'text-[#2C5282]', border: 'border-[#CBD5E0]' },
  mentor: { label: 'Mentor', bg: 'bg-[#F5EFE6]', text: 'text-[#7C5A28]', border: 'border-[#E8DCBF]' },
  deceiver: { label: 'Deceiver', bg: 'bg-[#F4EFF6]', text: 'text-[#6B3979]', border: 'border-[#E3D3E7]' },
  wildcard: { label: 'Wildcard', bg: 'bg-[#FEF5E7]', text: 'text-[#9A6214]', border: 'border-[#F8E2BD]' },
};

export const CharacterCard: React.FC<CharacterCardProps> = ({
  character,
  onEdit,
  onDelete,
  onSelectForStory,
  isSelected = false,
  isCastMode = false,
}) => {
  const roleStyle = ROLE_BADGES[character.role] || ROLE_BADGES.protagonist;

  return (
    <div
      id={`character-card-${character.id}`}
      className={`group relative rounded-2xl bg-white border transition-all duration-300 overflow-hidden flex flex-col justify-between shadow-xs ${
        isSelected
          ? 'border-[#5B6B56] ring-2 ring-[#5B6B56]/20 shadow-md'
          : 'border-[#E8E2D6] hover:border-[#70826C]/50 hover:shadow-md'
      }`}
    >
      {/* Visual Header / Avatar Banner */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#ECE7DE]">
        <img
          src={character.visualProfile.photoUrl}
          alt={character.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider border backdrop-blur-md shadow-xs ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}
          >
            {roleStyle.label}
          </span>

          {character.visualProfile.keyColors && character.visualProfile.keyColors.length > 0 && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#F9F7F2]/90 backdrop-blur-md border border-[#DFD8CA]">
              {character.visualProfile.keyColors.map((col, idx) => (
                <span
                  key={idx}
                  className="w-2.5 h-2.5 rounded-full border border-white/60"
                  style={{ backgroundColor: col }}
                  title={col}
                />
              ))}
            </div>
          )}
        </div>

        {/* Title and Species Overlay */}
        <div className="absolute bottom-3 left-3 right-3">
          <h4 className="font-serif text-lg font-bold text-white leading-tight drop-shadow-xs">
            {character.name}
          </h4>
          <p className="text-xs text-[#E8E2D6] font-medium truncate">
            {character.titleOrRole} • <span className="text-white/80">{character.visualProfile.speciesOrArchetype}</span>
          </p>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
        <div className="space-y-2.5">
          {/* Backstory */}
          <p className="text-[#6E665E] leading-relaxed line-clamp-3 italic">
            "{character.backstory}"
          </p>

          {/* Personality tags */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {character.personality.slice(0, 3).map((trait, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 rounded bg-[#F5EFEB] text-[#4A443F] text-[10px] font-medium border border-[#DFD8CA]"
              >
                {trait}
              </span>
            ))}
          </div>

          {/* Flaw / Secret (Anti-Repetition Tension Hook) */}
          <div className="p-2.5 rounded-xl bg-[#FAF0EB] border border-[#F0D5C7] space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#B45F3C]">
              <ShieldAlert className="w-3 h-3" />
              <span>Internal Tension / Flaw</span>
            </div>
            <p className="text-[11px] text-[#7C3F28] leading-tight line-clamp-2">
              {character.flawOrSecret}
            </p>
          </div>

          {/* Signature Item */}
          {character.signatureItem && (
            <div className="flex items-center gap-1.5 text-[11px] text-[#78716A] pt-0.5 truncate">
              <Gem className="w-3.5 h-3.5 text-[#B45F3C] shrink-0" />
              <span className="truncate">Item: <span className="text-[#3A342F] font-medium">{character.signatureItem}</span></span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#E8E2D6] flex items-center justify-between gap-2">
          {isCastMode ? (
            <button
              id={`cast-character-${character.id}`}
              onClick={() => onSelectForStory && onSelectForStory(character)}
              className={`w-full py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
                isSelected
                  ? 'bg-[#5B6B56] text-white shadow-sm'
                  : 'bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#4A443F] border border-[#DFD8CA]'
              }`}
            >
              {isSelected ? (
                <>
                  <Check className="w-4 h-4" /> Cast in Story Ensemble
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4 text-[#5B6B56]" /> Cast Character
                </>
              )}
            </button>
          ) : (
            <>
              {onSelectForStory && (
                <button
                  id={`cast-quick-${character.id}`}
                  onClick={() => onSelectForStory(character)}
                  className="flex-1 py-2 px-2.5 rounded-xl bg-[#5B6B56] hover:bg-[#4D5C47] text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Weave Story</span>
                </button>
              )}

              {onEdit && (
                <button
                  id={`edit-char-${character.id}`}
                  onClick={() => onEdit(character)}
                  className="p-2 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#6E665E] hover:text-[#3A342F] border border-[#DFD8CA] transition-colors"
                  title="Edit Character"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
              )}

              {onDelete && (
                <button
                  id={`delete-char-${character.id}`}
                  onClick={() => onDelete(character.id)}
                  className="p-2 rounded-xl bg-[#F5EFEB] hover:bg-[#FAEDE8] text-[#78716A] hover:text-[#933D22] border border-[#DFD8CA] transition-colors"
                  title="Delete Character"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

