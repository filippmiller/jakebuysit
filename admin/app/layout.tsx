import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AdminNav } from '@/components/admin-nav';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Jake Admin Platform | Mission Control',
  description: 'Internal operations platform for JakeBuysIt',
  robots: 'noindex, nofollow', // Admin panel should not be indexed
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <AdminNav />
          <main className="flex-1 overflow-auto bg-gray-50 p-8">
            {children}
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
