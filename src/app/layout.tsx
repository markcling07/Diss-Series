import './globals.css';
import { Metadata } from 'next';

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
    <html lang="en">
      <body>
        <main className="app-container">{children}</main>
        <footer style={{ textAlign: 'center', padding: '3rem 1rem 2rem', color: 'var(--text-dark)', fontSize: '0.85rem' }}>
          DissPic &copy; {new Date().getFullYear()} — Photo Upload Platform & Admin Portal
        </footer>
      </body>
    </html>
  );
}
