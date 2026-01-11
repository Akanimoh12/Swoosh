import { type ReactNode } from 'react';
import { Header } from './Header';
import { Footer } from './Footer';
import { NetworkSwitcher } from '@/components/wallet/NetworkSwitcher';
import { PageContainer } from './PageContainer';

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Header />
      <main className="flex-1 py-8">
        <PageContainer>
          <NetworkSwitcher className="mb-6" />
          {children}
        </PageContainer>
      </main>
      <Footer />
    </div>
  );
}
