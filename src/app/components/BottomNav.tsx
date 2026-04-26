'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    href: '/',
    label: 'Heute',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z"
          fill={active ? 'var(--primary)' : 'none'}
          stroke={active ? 'var(--primary)' : 'var(--outline)'}
          strokeWidth="1.75"
        />
        <path d="M12 6v6l3.5 3.5" stroke={active ? 'var(--on-primary)' : 'var(--outline)'}
          strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/tagebuch',
    label: 'Tagebuch',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="18" height="18" rx="3"
          fill={active ? 'var(--primary)' : 'none'}
          stroke={active ? 'var(--primary)' : 'var(--outline)'}
          strokeWidth="1.75"
        />
        <path d="M7 8h10M7 12h10M7 16h6"
          stroke={active ? 'var(--on-primary)' : 'var(--outline)'}
          strokeWidth="1.75" strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: '/loggen',
    label: 'Erfassen',
    icon: (_active: boolean) => (
      <div className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
        style={{ background: 'var(--primary)', marginTop: '-20px' }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
        </svg>
      </div>
    ),
  },
  {
    href: '/statistik',
    label: 'Statistik',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 20V10M12 20V4M6 20v-6"
          stroke={active ? 'var(--primary)' : 'var(--outline)'}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: '/einstellungen',
    label: 'Profil',
    icon: (active: boolean) => (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="8" r="4"
          fill={active ? 'var(--primary)' : 'none'}
          stroke={active ? 'var(--primary)' : 'var(--outline)'}
          strokeWidth="1.75"
        />
        <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6"
          stroke={active ? 'var(--primary)' : 'var(--outline)'}
          strokeWidth="1.75" strokeLinecap="round"
        />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <>
      {/* Spacer so content doesn't hide behind nav */}
      <div className="h-20" />
      
      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-surface-container"
        style={{
          background: 'var(--surface-bright)',
          opacity: 0.9,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-xl mx-auto flex items-end justify-around px-2 pb-safe"
          style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 8px)', paddingTop: '8px' }}>
          {navItems.map((item) => {
            const active = pathname === item.href;
            const isCenter = item.href === '/loggen';

            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center gap-1 min-w-[56px] transition-all duration-150"
                style={{ opacity: isCenter ? 1 : active ? 1 : 0.6 }}
              >
                {item.icon(active)}
                {!isCenter && (
                  <span
                    className="label-sm"
                    style={{
                      color: active ? 'var(--primary)' : 'var(--outline)',
                      fontSize: '10px',
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
