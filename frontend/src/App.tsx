import { Routes, Route } from 'react-router-dom'
import { AppLayout } from '@/components/layout/AppLayout'
import { HomePage } from '@/pages/HomePage'
import { IntentPage } from '@/pages/IntentPage'
import { WalletDemoPage } from '@/pages/WalletDemoPage'
import { ComponentsDemoPage } from '@/pages/ComponentsDemoPage'
import { FormsDemoPage } from '@/pages/FormsDemoPage'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/intent" element={<IntentPage />} />
        <Route path="/intent/:id" element={<IntentPage />} />
        <Route path="/wallet-demo" element={<WalletDemoPage />} />
        <Route path="/components" element={<ComponentsDemoPage />} />
        <Route path="/forms-demo" element={<FormsDemoPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
