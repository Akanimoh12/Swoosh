import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { AppLayout } from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { CelebrationProvider, SkipLink, MainContent } from '@/components/ui'
import { 
  PageLoader, 
  HistoryPageSkeleton,
  AnalyticsPageSkeleton,
  IntentPageSkeleton,
} from '@/components/ui/RouteLoader'

// Lazy load pages for better initial load performance
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })))
const IntentPage = lazy(() => import('@/pages/IntentPage').then(m => ({ default: m.IntentPage })))
const HistoryPage = lazy(() => import('@/pages/HistoryPage').then(m => ({ default: m.HistoryPage })))
const AnalyticsPage = lazy(() => import('@/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))

// Page-specific suspense fallbacks
function HistorySuspense() {
  return (
    <Suspense fallback={<HistoryPageSkeleton />}>
      <HistoryPage />
    </Suspense>
  )
}

function AnalyticsSuspense() {
  return (
    <Suspense fallback={<AnalyticsPageSkeleton />}>
      <AnalyticsPage />
    </Suspense>
  )
}

function IntentSuspense() {
  return (
    <Suspense fallback={<IntentPageSkeleton />}>
      <IntentPage />
    </Suspense>
  )
}

function App() {
  return (
    <CelebrationProvider>
      <SkipLink />
      <ErrorBoundary>
        <AppLayout>
          <MainContent className="flex-1">
            <AnimatePresence mode="wait">
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/intent" element={<IntentSuspense />} />
                  <Route path="/intent/:id" element={<IntentSuspense />} />
                  <Route path="/history" element={<HistorySuspense />} />
                  <Route path="/analytics" element={<AnalyticsSuspense />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </MainContent>
        </AppLayout>
      </ErrorBoundary>
    </CelebrationProvider>
  )
}

export default App
