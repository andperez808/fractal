import './globals.css';
export const metadata = {
  title: 'Fracta — Shape the infinite',
  description: 'Explore live 3D fractals with your hands.',
  icons: { icon: '/favicon.svg' },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
