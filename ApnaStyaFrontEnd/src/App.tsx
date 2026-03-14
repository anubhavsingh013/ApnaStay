import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScrollToTop from "@/components/layout/ScrollToTop";
import PageTransition from "@/components/layout/PageTransition";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoDataProvider } from "@/features/demo/DemoDataContext";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Index from "./pages/Index";
import Properties from "./pages/Properties";
import Dashboard from "./pages/Dashboard";
import OwnerDashboard from "./pages/OwnerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import BrokerDashboard from "./pages/BrokerDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OwnerProfile from "./pages/OwnerProfile";
import PropertyDetail from "./pages/PropertyDetail";
import HelpCenter from "./pages/HelpCenter";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import ContactUs from "./pages/ContactUs";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DemoDataProvider>
        <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/properties" element={<Properties />} />
              <Route path="/property/:id" element={<PropertyDetail />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/owner/dashboard" element={<ProtectedRoute><OwnerDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/broker/dashboard" element={<ProtectedRoute><BrokerDashboard /></ProtectedRoute>} />
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/signup" element={<PageTransition><Signup /></PageTransition>} />
              <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
              <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
              <Route path="/owner/profile" element={<ProtectedRoute><OwnerProfile /></ProtectedRoute>} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/contact" element={<ContactUs />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
        </TooltipProvider>
      </DemoDataProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
