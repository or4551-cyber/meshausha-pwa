import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useEffect, lazy, Suspense } from 'react'
import { useAuthStore } from './stores/authStore'
import { useSuppliersStore } from './stores/suppliersStore'
import { PRODUCTS, INITIAL_SUPPLIERS } from './data/products'
import { getAdminPhoneFromCloud, getSuppliersFromCloud } from './lib/cloudApi'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import OrdersPage from './pages/OrdersPage'
import SummaryPage from './pages/SummaryPage'
import HistoryPage from './pages/HistoryPage'
import RemindersPage from './pages/RemindersPage'
import DeliveryConfirmPage from './pages/DeliveryConfirmPage'
import NotificationManager from './components/NotificationManager'
import NotificationScheduler from './components/NotificationScheduler'

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
const ChatBot = lazy(() => import('./components/ChatBot'))

function PageFallback() {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="w-12 h-12 rounded-full border-4 border-secondary/20 border-t-secondary animate-spin" />
    </div>
  )
}

function App() {
  const { isAuthenticated, user } = useAuthStore()
  const { seedStaticSuppliers, seedStaticProducts, setAdminPhone, adminPhone, loadCloudData } = useSuppliersStore()

  // זריעת ספקים ומוצרים + טעינת נתוני אדמין מהענן
  useEffect(() => {
    seedStaticSuppliers(INITIAL_SUPPLIERS)
    seedStaticProducts(PRODUCTS)
    // טעינת adminPhone מהענן
    if (!adminPhone) {
      getAdminPhoneFromCloud().then(phone => {
        if (phone) setAdminPhone(phone)
      })
    }
    // טעינת ספקים ומוצרים מהענן — טוען רק אם יש נתוני לוח זמנים בענן
    getSuppliersFromCloud().then(data => {
      const hasSchedules = data?.suppliers?.some((s: any) => s.schedules?.length > 0)
      if (hasSchedules) {
        // יש נתוני אדמין בענן — טען (הענן גובר על ספקים/לוח זמנים)
        loadCloudData(data!.suppliers, data!.products ?? [])
        // הוסף רק מוצרים סטטיים חדשים שעדיין אינם בענן (לא דורס עדכונים)
        seedStaticProducts(PRODUCTS)
      }
    })
  }, [])

  return (
    <Router>
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
        </Suspense>
      </div>
    </Router>
  )
}

export default App
