// app/layout.js - Root layout with viewport configuration for mobile full-screen landscape play
import './globals.css';

export const metadata = {
  title: 'Plumazo — Guerra de pollitos por turnos',
  description: 'Guerra de pollitos de juguete por turnos en 3D. Juega con tus amigos usando el celular como mando.',
  icons: {
    icon: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className="h-full">
      <body className="h-full m-0 p-0 overflow-hidden bg-slate-950 text-white select-none">
        {children}
      </body>
    </html>
  );
}
