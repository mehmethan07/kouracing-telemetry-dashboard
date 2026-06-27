'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export function useKeyboardShortcuts() {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'd': // Dashboard
          router.push('/');
          break;
        case 'l': // Laps
          router.push('/laps');
          break;
        case 'r': // Race mode
          router.push('/race');
          break;
        case 'h': // History
          router.push('/history');
          break;
        case 't': // Team
          router.push('/team');
          break;
        case '?': // Toggle help modal
          setShowHelp(prev => !prev);
          break;
        case 'escape': // Close modal
          setShowHelp(false);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router]);

  return { showHelp, setShowHelp };
}
