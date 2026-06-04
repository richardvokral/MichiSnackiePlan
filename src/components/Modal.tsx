'use client';

import { useEffect, useRef } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

// The app's first dialog primitive — headless, no external library. Closes on
// Escape, backdrop click, and locks body scroll while open.
export default function Modal({ open, onClose, title, children }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    cardRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-5"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg outline-none"
      >
        {title && <h2 className="text-lg font-bold text-neutral-800">{title}</h2>}
        <div className={title ? 'mt-2' : ''}>{children}</div>
      </div>
    </div>
  );
}
