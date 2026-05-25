import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PanchoEvents · Acceso Privado',
  description: 'Plataforma privada de retransmisión de eventos',
  robots: 'noindex, nofollow',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
