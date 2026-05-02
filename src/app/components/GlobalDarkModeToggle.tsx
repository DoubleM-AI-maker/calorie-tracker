'use client';

import { usePathname } from 'next/navigation';
import DarkModeToggle from './DarkModeToggle';

// Renders nothing on /loggen — that page embeds the toggle in its own header
// to avoid overlapping with the close button on mobile.
export default function GlobalDarkModeToggle() {
  const pathname = usePathname();
  if (pathname === '/loggen') return null;
  return <DarkModeToggle />;
}
