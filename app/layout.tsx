import './globals.css';
import type { Metadata } from 'next';
import { Inter, Poppins } from 'next/font/google';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'sonner';

const inter = Inter({ 
  subsets: ['latin'], 
  variable: '--font-inter',
  display: 'swap' 
});

const poppins = Poppins({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap'
});

export const metadata: Metadata = {
  title: 'Admin Dashboard - Agent Management System',
  description: 'Modern admin dashboard for managing agents, tasks, and analytics with glassmorphism design',
  keywords: 'admin, dashboard, agent management, task distribution, analytics',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className="font-inter antialiased">
        <AuthProvider>
          {children}
          <Toaster 
            position="top-right" 
            richColors 
            expand={false}
            closeButton
          />
        </AuthProvider>
      </body>
    </html>
  );
}