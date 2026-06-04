'use client';

import Modal from './Modal';

interface RegisterPromptProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

// Nudge anonymous users toward a free account when they reach for a feature
// that needs one (multi-day calendar, saving preferences across devices, etc.).
export default function RegisterPrompt({
  open,
  onClose,
  title = 'Register for free',
  message = 'Register for free to unlock this feature.',
}: RegisterPromptProps) {
  return (
    <Modal open={open} onClose={onClose} title={title}>
      <p className="text-sm leading-relaxed text-neutral-500">{message}</p>
      <div className="mt-5 flex flex-col gap-2">
        <a
          href="/auth/sign-in"
          className="w-full rounded-full bg-purple-600 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-purple-700"
        >
          Register for free
        </a>
        <button
          onClick={onClose}
          className="w-full py-2 text-center text-sm font-medium text-neutral-400 transition-colors hover:text-neutral-600"
        >
          Maybe later
        </button>
      </div>
    </Modal>
  );
}
