import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import CustomerPaymentHistoryPage from './pages/CustomerPaymentHistoryPage';
import CustomerFormPage from './pages/CustomerFormPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import TicketFormPage from './pages/TicketFormPage';
import TicketEditPage from './pages/TicketEditPage';
import AdminPage from './pages/AdminPage';
import AdminCreateUserPage from './pages/AdminCreateUserPage';
import ItemsPage from './pages/ItemsPage';
import ItemFormPage from './pages/ItemFormPage';
import ItemDetailPage from './pages/ItemDetailPage';
import ItemEditPage from './pages/ItemEditPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import BillingPage from './pages/BillingPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import BillOrderPage from './pages/BillOrderPage';
import PurchasingPage from './pages/PurchasingPage';
import PurchaseOrderDetailPage from './pages/PurchaseOrderDetailPage';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './components/AppLayout';

function QuoteIdRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={id ? `/orders/${id}` : '/orders'} replace />;
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<DashboardPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/new" element={<CustomerFormPage />} />
            <Route path="/customers/:id/payment-history" element={<CustomerPaymentHistoryPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/new" element={<TicketFormPage />} />
            <Route path="/tickets/:id/edit" element={<TicketEditPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/users/new" element={<AdminCreateUserPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/items/new" element={<ItemFormPage />} />
            <Route path="/items/:id/edit" element={<ItemEditPage />} />
            <Route path="/items/:id" element={<ItemDetailPage />} />
            <Route path="/quotes" element={<Navigate to="/orders" replace />} />
            <Route path="/quotes/:id" element={<QuoteIdRedirect />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id/billing" element={<BillingPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/bill-order" element={<BillOrderPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/purchasing" element={<PurchasingPage />} />
            <Route path="/purchasing/:id" element={<PurchaseOrderDetailPage />} />
          </Route>
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
