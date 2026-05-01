import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Access from "./pages/Access.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLayout from "./layouts/AdminLayout.tsx";
import AdminHome from "./pages/AdminHome.tsx";
import DataSources from "./pages/DataSources.tsx";
import ColumnMapping from "./pages/ColumnMapping.tsx";
import BusinessRules from "./pages/BusinessRules.tsx";
import SyncLogs from "./pages/SyncLogs.tsx";
import Users from "./pages/Users.tsx";
import AlertSettings from "./pages/AlertSettings.tsx";
import Dashboard from "./pages/Dashboard.tsx";
import Alerts from "./pages/Alerts.tsx";
import CustomerRiskRegister from "./pages/CustomerRiskRegister.tsx";
import SalespersonAnalysis from "./pages/SalespersonAnalysis.tsx";
import CustomerDetail from "./pages/CustomerDetail.tsx";
import Reports from "./pages/Reports.tsx";
import SavedViews from "./pages/SavedViews.tsx";
import Profile from "./pages/Profile.tsx";
import EximDashboard from "./pages/EximDashboard.tsx";
import ImportDashboard from "./pages/ImportDashboard.tsx";
import Settings from "./pages/Settings.tsx";
import UserLayout from "./layouts/UserLayout.tsx";
import { FYProvider } from "./lib/fyContext";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FYProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/access" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<UserLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="risk-register" element={<CustomerRiskRegister />} />
            <Route path="salesperson-analysis" element={<SalespersonAnalysis />} />
            <Route path="customer/:id" element={<CustomerDetail />} />
            <Route path="group/:id" element={<CustomerDetail />} />
            <Route path="exim" element={<EximDashboard />} />
            <Route path="import" element={<ImportDashboard />} />
            <Route path="reports" element={<Reports />} />
            <Route path="saved-views" element={<SavedViews />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminHome />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="column-mapping" element={<ColumnMapping />} />
            <Route path="business-rules" element={<BusinessRules />} />
            <Route path="sync-logs" element={<SyncLogs />} />
            <Route path="users" element={<Users />} />
            <Route path="settings" element={<AlertSettings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </FYProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
