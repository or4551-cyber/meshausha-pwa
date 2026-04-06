import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import SummaryPage from './pages/SummaryPage'
import HistoryPage from './pages/HistoryPage'
import RemindersPage from './pages/RemindersPage'
import AdminPage from './pages/AdminPage'
import PriceManagementPage from './pages/admin/PriceManagementPage'
import ReportsPage from './pages/admin/ReportsPage'
import AnalyticsPage from './pages/admin/AnalyticsPage'
import AnalyticsDashboard from './pages/admin/AnalyticsDashboard'
import AddSupplierPage from './pages/admin/AddSupplierPage'
import SuppliersContactPage from './pages/admin/SuppliersContactPage'
import InvoicesPage from './pages/admin/InvoicesPage'
import InvoiceAnalysisPage from './pages/admin/InvoiceAnalysisPage'
import GmailSettingsPage from './pages/admin/GmailSettingsPage'
import GmailCallbackPage from './pages/admin/GmailCallbackPage'
import ChatBot from './components/ChatBot'
import NotificationManager from './components/NotificationManager'
import NotificationScheduler from './components/NotificationScheduler'

function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <Router>
      <div className="min-h-screen bg-primary">
        {isAuthenticated && (
          <>
            <ChatBot />
            <NotificationManager />
            <NotificationScheduler />
          </>
        )}
        <Routes>
          <Route 
            path="/login" 
            element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/" 
            element={isAuthenticated ? <DashboardPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/orders" 
            element={isAuthenticated ? <OrdersPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/summary" 
            element={isAuthenticated ? <SummaryPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/history" 
            element={isAuthenticated ? <HistoryPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/reminders" 
            element={isAuthenticated ? <RemindersPage /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/admin" 
            element={isAuthenticated && user?.isAdmin ? <AdminPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/prices" 
            element={isAuthenticated && user?.isAdmin ? <PriceManagementPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/reports" 
            element={isAuthenticated && user?.isAdmin ? <ReportsPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/analytics" 
            element={isAuthenticated && user?.isAdmin ? <AnalyticsPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/dashboard" 
            element={isAuthenticated && user?.isAdmin ? <AnalyticsDashboard /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/add-supplier" 
            element={isAuthenticated && user?.isAdmin ? <AddSupplierPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/suppliers-contact" 
            element={isAuthenticated && user?.isAdmin ? <SuppliersContactPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/invoices" 
            element={isAuthenticated && user?.isAdmin ? <InvoicesPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/invoice-analysis" 
            element={isAuthenticated && user?.isAdmin ? <InvoiceAnalysisPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/gmail-settings" 
            element={isAuthenticated && user?.isAdmin ? <GmailSettingsPage /> : <Navigate to="/" />} 
          />
          <Route 
            path="/admin/gmail-callback" 
            element={isAuthenticated && user?.isAdmin ? <GmailCallbackPage /> : <Navigate to="/" />} 
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
