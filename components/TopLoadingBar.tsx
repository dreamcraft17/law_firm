'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Loading bar yang muncul saat navigasi (klik link) dan saat Next.js menampilkan loading.tsx.
 * Muncul segera saat user klik link, hilang saat pathname berubah (halaman selesai load).
 */
export default function TopLoadingBar() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      if (!anchor || anchor.target === '_blank' || !anchor.href) return;
      try {
        const url = new URL(anchor.href);
        if (url.origin !== window.location.origin) return;
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
        setVisible(true);
      } catch {
        // ignore
      }
    }

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="global-loading-bar"
      aria-hidden
      role="progressbar"
      aria-valuetext="Memuat halaman"
    />
  );
}
