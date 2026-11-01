'use client';

import { useEffect, useState } from 'react';
import ProductViewerModal from '@/components/ProductViewerModal';

export default function Product3DTrigger({ src }: { src?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  function openViewer() {
    if (!src) return;
    // Push a phantom history entry so the browser back button closes the modal
    // instead of navigating away from the product page.
    history.pushState({ viewer3d: true }, '');
    setIsOpen(true);
  }

  function closeViewer() {
    setIsOpen(false);
    // Remove the phantom entry if the user closed via the ✕ button or Escape
    // (not via the browser back button, which already consumed it).
    if (history.state?.viewer3d) {
      history.back();
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    // When the user presses the browser back button while the modal is open,
    // popstate fires and the phantom entry is already consumed — just close.
    function handlePopState() {
      setIsOpen(false);
    }
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openViewer}
        disabled={!src}
        aria-haspopup="dialog"
        className={`absolute bottom-3 right-3 inline-flex min-h-11 items-center gap-2 rounded-md border border-line bg-surface/95 px-3.5 text-sm font-semibold text-ink shadow-sm transition-colors hover:border-paddy focus-visible:outline-2 focus-visible:outline-paddy focus-visible:outline-offset-2 ${!src ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" />
        </svg>
        Explorer en 3D
      </button>
      {isOpen && src && <ProductViewerModal src={src} onClose={closeViewer} />}
    </>
  );
}
