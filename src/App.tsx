import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense, useEffect } from 'react'
import { useAuthStore } from './stores/authStore'
import { useCatalogSync } from './hooks/useCatalogSync'
import { primeAdminPin, authenticateWithPin, setSessionPersistence, hasActiveSession } from './lib/priceAdminSession'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import NotificationManager from './components/NotificationManager'
import NotificationScheduler from './components/NotificationScheduler'
import ErrorBoundary from './components/ErrorBoundary'
import ToastContainer from './components/Toast'
import ConfirmDialog from './components/ConfirmDialog'

const SummaryPage = lazy(() => import('./pages/SummaryPage'))
const HistoryPage = lazy(() => import('./pages/HistoryPage'))
const RemindersPage = lazy(() => import('./pages/RemindersPage'))
const DeliveryConfirmPage = lazy(() => import('./pages/DeliveryConfirmPage'))

const AdminPage = lazy(() => import('./pages/AdminPage'))
const PriceManagementPage = lazy(() => import('./pages/admin/PriceManagementPage'))
const ReportsPage = lazy(() => import('./pages/admin/ReportsPage'))
const AnalyticsPage = lazy(() => import('./pages/admin/AnalyticsPage'))
const AnalyticsDashboard = lazy(() => import('./pages/admin/AnalyticsDashboard'))
const AddSupplierPage = lazy(() => import('./pages/admin/AddSupplierPage'))
const SuppliersContactPage = lazy(() => import('./pages/admin/SuppliersContactPage'))
const InvoicesPage = lazy(() => import('./pages/admin/InvoicesPage'))
const InvoiceAnalysisPage = lazy(() => import('./pages/admin/InvoiceAnalysisPage'))
const GmailSettingsPage = lazy(() => import('./pages/admin/GmailSettingsPage'))
const GmailCallbackPage = lazy(() => import('./pages/admin/GmailCallbackPage'))
const AdminNotificationsPage = lazy(() => import('./pages/admin/AdminNotificationsPage'))
const AutomationPage = lazy(() => import('./pages/admin/AutomationPage'))
const CreditClaimsPage = lazy(() => import('./pages/admin/CreditClaimsPage'))
const WeeklySchedulePage = lazy(() => import('./pages/admin/WeeklySchedulePage'))
const BranchOverviewPage = lazy(() => import('./pages/admin/BranchOverviewPage'))
const PriceHistoryPage = lazy(() => import('./pages/admin/PriceHistoryPage'))
const CalendarRemindersPage = lazy(() => import('./pages/admin/CalendarRemindersPage'))
const DispatchOrdersPage = lazy(() => import('./pages/admin/DispatchOrdersPage'))
const OrdersSearchPage = lazy(() => import('./pages/admin/OrdersSearchPage'))
const ExecutiveDashboardPage = lazy(() => import('./pages/admin/ExecutiveDashboardPage'))
const OrdersCalendarPage = lazy(() => import('./pages/OrdersCalendarPage'))
const ChatBot = lazy(() => import('./components/ChatBot'))

function PageFallback() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
    </div>
  )
}

function App() {
  const { isAuthenticated, user, rememberMe } = useAuthStore()

  // סנכרון קטלוג המוצרים (זריעה + adminPhone + לוחות-זמנים + קטלוג מרכזי, עם fallback offline).
  useCatalogSync()

  // price-session לאדמין — מקום יחיד שמכסה גם כניסה טרייה וגם שחזור מ-"זכור אותי":
  // אדמין משוחזר מ-persist דילג על LoginPage ולכן אין לו session; ה-PIN כבר שמור ב-authStore
  // (user.branchCode), אז מנפיקים ממנו. בלי זה כתיבות-המחירון נכשלות ב-no_session.
  useEffect(() => {
    if (!isAuthenticated || !user?.isAdmin || !user.branchCode) return
    setSessionPersistence(rememberMe)
    primeAdminPin(user.branchCode)
    if (!hasActiveSession()) void authenticateWithPin(user.branchCode)
  }, [isAuthenticated, user?.isAdmin, user?.branchCode, rememberMe])

  return (
    <Router>
      <ErrorBoundary>
      <ToastContainer />
      <ConfirmDialog />
      <div className="min-h-screen bg-primary">
        {isAuthenticated && (
          <>
            <Suspense fallback={null}>
              <ChatBot />
            </Suspense>
            <NotificationManager />
            <NotificationScheduler />
          </>
        )}
        <Suspense fallback={<PageFallback />}>
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
            path="/calendar"
            element={isAuthenticated ? <OrdersCalendarPage /> : <Navigate to="/login" />}
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
          <Route
            path="/admin/search"
            element={isAuthenticated && user?.isAdmin ? <OrdersSearchPage /> : <Navigate to="/" />}
          />
          <Route
            path="/admin/executive"
            element={isAuthenticated && user?.isAdmin ? <ExecutiveDashboardPage /> : <Navigate to="/" />}
          />
        </Routes>
        </Suspense>
      </div>
      </ErrorBoundary>
    </Router>
  )
}

export default App
