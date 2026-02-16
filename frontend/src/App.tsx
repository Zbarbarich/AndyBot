import { BrowserRouter as Router, Routes, Route, Navigate, useParams } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import './styles/index.css';
import LandingPage from './pages/LandingPage';
import CustomersPage from './pages/CustomersPage';
import CustomerDetailPage from './pages/CustomerDetailPage';
import TicketsPage from './pages/TicketsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import AdminPage from './pages/AdminPage';
import ItemsPage from './pages/ItemsPage';
import OrdersPage from './pages/OrdersPage';
import OrderDetailPage from './pages/OrderDetailPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
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
            <Route path="/" element={<LandingPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/tickets" element={<TicketsPage />} />
            <Route path="/tickets/:id" element={<TicketDetailPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/quotes" element={<Navigate to="/orders" replace />} />
            <Route path="/quotes/:id" element={<QuoteIdRedirect />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
          </Route>
        </Routes>
      </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
