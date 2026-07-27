import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import RootLayout from "@/components/layout/RootLayout";
import { useUIStore } from "@/stores/uiStore";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Cashier from "@/pages/Cashier";
import CashierPayment from "@/pages/CashierPayment";
import CashierSuccess from "@/pages/CashierSuccess";
import Products from "@/pages/Products";
import ProductForm from "@/pages/ProductForm";
import Stocks from "@/pages/Stocks";
import StockBatchForm from "@/pages/StockBatchForm";
import StockOpname from "@/pages/StockOpname";
import StockReport from "@/pages/StockReport";
import Promotions from "@/pages/Promotions";
import DailyReport from "@/pages/DailyReport";
import TransactionHistory from "@/pages/TransactionHistory";
import TransactionDetail from "@/pages/TransactionDetail";
import Settings from "@/pages/Settings";
import BackupRestore from "@/pages/BackupRestore";
import Categories from "@/pages/Categories";

function AuthGuard({ children }: { children: React.ReactNode }) {
  const currentUser = useUIStore((s) => s.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    if (!currentUser) {
      navigate("/login", { replace: true });
    }
  }, [currentUser, navigate]);

  if (!currentUser) return null;
  return <>{children}</>;
}

function AppContent() {
  const location = useLocation();
  const darkMode = useUIStore((s) => s.darkMode);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "grosir-dark" : "grosir");
  }, [darkMode]);

  return (
    <div className="page-enter-active" key={location.pathname}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<RootLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/cashier" element={<AuthGuard><Cashier /></AuthGuard>} />
          <Route path="/cashier/payment" element={<AuthGuard><CashierPayment /></AuthGuard>} />
          <Route path="/cashier/success" element={<AuthGuard><CashierSuccess /></AuthGuard>} />
          <Route path="/products" element={<AuthGuard><Products /></AuthGuard>} />
          <Route path="/products/form" element={<AuthGuard><ProductForm /></AuthGuard>} />
          <Route path="/products/form/:id" element={<AuthGuard><ProductForm /></AuthGuard>} />
          <Route path="/categories" element={<AuthGuard><Categories /></AuthGuard>} />
          <Route path="/stocks" element={<AuthGuard><Stocks /></AuthGuard>} />
          <Route path="/stocks/batch" element={<AuthGuard><StockBatchForm /></AuthGuard>} />
          <Route path="/stocks/batch/:id" element={<AuthGuard><StockBatchForm /></AuthGuard>} />
          <Route path="/stocks/opname" element={<AuthGuard><StockOpname /></AuthGuard>} />
          <Route path="/promotions" element={<AuthGuard><Promotions /></AuthGuard>} />
          <Route path="/reports/daily" element={<AuthGuard><DailyReport /></AuthGuard>} />
          <Route path="/reports/stocks" element={<AuthGuard><StockReport /></AuthGuard>} />
          <Route path="/reports/transactions" element={<AuthGuard><TransactionHistory /></AuthGuard>} />
          <Route path="/reports/transactions/:id" element={<AuthGuard><TransactionDetail /></AuthGuard>} />
          <Route path="/settings" element={<AuthGuard><Settings /></AuthGuard>} />
          <Route path="/settings/backup" element={<AuthGuard><BackupRestore /></AuthGuard>} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
      <AppContent />
    </BrowserRouter>
  );
}
