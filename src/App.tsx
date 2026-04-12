import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { useSuppliersStore } from './stores/suppliersStore'
import { PRODUCTS, INITIAL_SUPPLIERS } from './data/products'
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
import AdminNotificationsPage from './pages/admin/AdminNotificationsPage'
import AutomationPage from './pages/admin/AutomationPage'
import DeliveryConfirmPage from './pages/DeliveryConfirmPage'
import CreditClaimsPage from './pages/admin/CreditClaimsPage'
import WeeklySchedulePage from './pages/admin/WeeklySchedulePage'
import BranchOverviewPage from './pages/admin/BranchOverviewPage'
import PriceHistoryPage from './pages/admin/PriceHistoryPage'
import CalendarRemindersPage from './pages/admin/CalendarRemindersPage'
import DispatchOrdersPage from './pages/admin/DispatchOrdersPage'
import ChatBot from './components/ChatBot'
import NotificationManager from './components/NotificationManager'
import NotificationScheduler from './components/NotificationScheduler'

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { seedStaticSuppliers, seedStaticProducts } = useSuppliersStore()

  // זריעת ספקים ומוצרים ראשוניים — פעם אחת בהפעלה
  useEffect(() => {
    seedStaticSuppliers(INITIAL_SUPPLIERS)
    seedStaticProducts(PRODUCTS)
  }, [])

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
          <Route
            path="/admin/notifications"
            element={isAuthenticated && user?.isAdmin ? <AdminNotificationsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/automation"
            element={isAuthenticated && user?.isAdmin ? <AutomationPage /> : <Navigate to="/" />}
          />
          <Route
            path="/delivery/:orderId"
            element={isAuthenticated ? <DeliveryConfirmPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/admin/credits"
            element={isAuthenticated && user?.isAdmin ? <CreditClaimsPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/weekly-schedule"
            element={isAuthenticated && user?.isAdmin ? <WeeklySchedulePage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/branch-overview"
            element={isAuthenticated && user?.isAdmin ? <BranchOverviewPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/price-history"
            element={isAuthenticated && user?.isAdmin ? <PriceHistoryPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/calendar-reminders"
            element={isAuthenticated && user?.isAdmin ? <CalendarRemindersPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/dispatch"
            element={isAuthenticated && user?.isAdmin ? <DispatchOrdersPage /> : <Navigate to="/" />}
          />
        </Routes>
      </div>
    </Router>
  )
}

export default App
