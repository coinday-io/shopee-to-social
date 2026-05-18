import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import { Sidebar } from '@/components/layout/Sidebar';
import './globals.css';

export const metadata: Metadata = {
  title: 'Shopee to Social',
  description: 'Otomasi posting produk Shopee ke media sosial',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans">
        <div className="flex h-screen w-screen overflow-hidden bg-neutral-50">
          <Sidebar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
        <Toaster
          position="top-right"
          toastOptions={{
            style: { fontSize: '14px' },
            success: { iconTheme: { primary: '#22C55E', secondary: 'white' } },
            error: { iconTheme: { primary: '#EF4444', secondary: 'white' } },
          }}
        />
      </body>
    </html>
  );
}
