import './globals.css';
import { ForgeProvider, SiteHeader, SiteFooter } from '@/components/forge-provider';
import type { Metadata } from 'next';
export const metadata: Metadata = {
  title: 'EventForge — Less talk. More building.',
  description:
    'Find hackathons, register your team, and ship your next project. A campus hackathon platform for builders and organizers.',
  icons: { icon: '/favicon.svg' },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body>
        <ForgeProvider>
          <div className="site">
            <a className="skip-link" href="#main">
              Skip to content
            </a>
            <SiteHeader />
            <main id="main">{children}</main>
            <SiteFooter />
          </div>
        </ForgeProvider>
      </body>
    </html>
  );
}
