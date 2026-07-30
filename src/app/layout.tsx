import './globals.css';
import { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import Navbar from '@/components/Navbar';

// Self-hosted at build time and served from our own origin. The previous CSS
// @import fetched this from Google on every load, which breaks on a classroom
// LAN with no internet — exactly where the gallery links get used.
const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-jakarta',
});

export const metadata: Metadata = {
  title: 'DissPic | Photo Upload',
  description: 'Upload photos securely.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={jakarta.variable}>
      <body>
        <Navbar />
        <main className="app-container">{children}</main>
        <footer style={{ textAlign: 'center', padding: '3rem 1rem 2rem', color: 'var(--text-dark)', fontSize: '0.85rem' }}>
          DissPic &copy; {new Date().getFullYear()} — Photo Upload Platform & Admin Portal
        </footer>
      </body>
    </html>
  );
}
