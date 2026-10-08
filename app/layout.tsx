import './globals.css';

export const metadata = {
  title: 'EventForge — Event operations, in one place',
  description: 'A unified workspace for campus events, teams, judging, and certificates.',
  icons: { icon: '/favicon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
