import './globals.css';
import { Metadata } from 'next';
import { Inter, IBM_Plex_Mono } from 'next/font/google';
import Navbar from '@/components/Navbar';

// Both are self-hosted at build time and served from our own origin. A CSS
// @import would fetch them from Google on every load, which breaks on a
// classroom LAN with no internet — exactly where the gallery links get used.

// The interface is set in SF Pro Display, named directly in the stack in
// globals.css so Apple devices use the real thing. SF Pro can't be shipped with
// the app — Apple's licence doesn't allow redistributing it — so Inter is
// self-hosted behind it. It was drawn as an SF-alike for interfaces, which is
// what Windows and Android will actually render here.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-ui',
});

// Carries every piece of machine-ish text: gallery codes, dates, frame counts,
// nav labels. Photo archives annotate in monospace, so it earns its place.
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'DissPic — shared photo archive',
  description:
    'Collect everyone’s photos in one place. Open a gallery, share the link, and anyone can add theirs without an account.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${plexMono.variable}`}>
      <body>
        <Navbar />
        <main className="app-container">{children}</main>
        <footer className="site-footer">
          <span className="site-footer-mark">DissPic</span>
          <span className="site-footer-meta">
            Photo archive &amp; admin portal · {new Date().getFullYear()}
          </span>
        </footer>
      </body>
    </html>
  );
}
