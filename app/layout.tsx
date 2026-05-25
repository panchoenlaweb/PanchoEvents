import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'YPass · Acceso Privado',
  description: 'Comunidad de viewing parties en español para eventos Thai BL/GL',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
