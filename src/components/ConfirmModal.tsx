import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isDestructive?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
  isDestructive = true,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div
        className="w-full max-w-md bg-white rounded-3xl border border-[#DFD8CA] p-6 shadow-2xl space-y-5 text-[#4A443F]"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                isDestructive ? 'bg-[#FAEDE8] text-[#933D22] border border-[#F2D0C4]' : 'bg-[#EAF0E8] text-[#3B5436]'
              }`}
            >
              {isDestructive ? <Trash2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-[#3A342F]">{title}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#78716A] hover:text-[#3A342F] hover:bg-[#F5EFEB] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-[#6E665E] leading-relaxed">{message}</p>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-[#E8E2D6]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[#F5EFEB] hover:bg-[#EAE5DC] text-[#6E665E] hover:text-[#3A342F] text-xs sm:text-sm font-semibold transition-colors border border-[#DFD8CA]"
          >
            Cancel
          </button>
          <button
            type="button"
            id="confirm-modal-action-btn"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-5 py-2.5 rounded-xl text-white font-bold text-xs sm:text-sm shadow-md transition-all ${
              isDestructive
                ? 'bg-[#B45F3C] hover:bg-[#933D22] hover:shadow-lg'
                : 'bg-[#5B6B56] hover:bg-[#4D5C47]'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
