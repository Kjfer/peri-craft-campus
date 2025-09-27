import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AuthDebug } from "@/components/AuthDebug";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import Plans from "./pages/Plans";
import About from "./pages/About";
import Contact from "./pages/Contact";
import ClasesEnVivo from "./pages/ClasesEnVivo";
import LessonPlayer from "./pages/LessonPlayer";
import LearningPlatform from "./pages/LearningPlatform";
import VerifyCertificate from "./pages/VerifyCertificate";
import PaymentResult from "./pages/PaymentResult";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentError from "./pages/PaymentError";
import PaymentRedirect from "./pages/PaymentRedirect";
import Checkout from "./pages/Checkout";
import CheckoutSuccess from "./pages/CheckoutSuccess";
import Cart from "./pages/Cart";
import CartCheckout from "./pages/CartCheckout";
import CourseCheckout from "./pages/CourseCheckout";
import OrderHistory from "./pages/OrderHistory";
import CheckoutFailed from "./pages/CheckoutFailed";
import CheckoutPending from "./pages/CheckoutPending";
import NotFound from "./pages/NotFound";
import AccountSettings from "./pages/AccountSettings";
import AdminDashboard from "./pages/admin/Dashboard";
import CourseManagement from "./pages/admin/CourseManagement";
import CreateCourse from "./pages/admin/CreateCourse";
import EditCourse from "./pages/admin/EditCourse";
import UserManagement from "./pages/admin/UserManagement";
import CertificateManagement from "./pages/admin/CertificateManagement";
import Settings from "./pages/admin/Settings";
import PlanManagement from "./pages/admin/PlanManagement";
import SecurityDashboard from "./components/admin/SecurityDashboard";
import ConfirmEmail from "./pages/ConfirmEmail";
import Subscriptions from "./pages/Subscriptions";
import SubscriptionCheckout from "./pages/SubscriptionCheckout";
import MySubscriptions from "./pages/MySubscriptions";
import NotificationCenter from "./pages/NotificationCenter";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/confirm-email" element={<ConfirmEmail />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/cursos" element={<Courses />} />
            <Route path="/courses/:courseId/lessons/:lessonId" element={<LessonPlayer />} />
            <Route path="/learn/:courseId" element={<LearningPlatform />} />
            <Route path="/learn/:courseId/lesson/:lessonId" element={<LearningPlatform />} />
                  <Route path="/curso/:id" element={<CourseDetail />} />
                  <Route path="/planes" element={<Plans />} />
                  <Route path="/subscriptions" element={<Subscriptions />} />
                  <Route path="/subscription-checkout" element={<SubscriptionCheckout />} />
                  <Route path="/my-subscriptions" element={<MySubscriptions />} />
                  <Route path="/notifications" element={<NotificationCenter />} />
                  <Route path="/nosotros" element={<About />} />
                  <Route path="/contacto" element={<Contact />} />
                  <Route path="/clases-en-vivo" element={<ClasesEnVivo />} />
                  <Route path="/verificar-certificado" element={<VerifyCertificate />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/checkout/carrito" element={<CartCheckout />} />
                  <Route path="/checkout/curso/:courseId" element={<CourseCheckout />} />
                  <Route path="/carrito" element={<Cart />} />
                  <Route path="/ordenes" element={<OrderHistory />} />
                  <Route path="/configuracion" element={<AccountSettings />} />
                  <Route path="/checkout/success/:orderId" element={<CheckoutSuccess />} />
                  <Route path="/checkout/failed" element={<CheckoutFailed />} />
                  <Route path="/checkout/pending" element={<CheckoutPending />} />
                  <Route path="/payment/redirect/:orderId" element={<PaymentRedirect />} />
                  <Route path="/payment/success/:orderId" element={<PaymentSuccess />} />
                  <Route path="/payment/success" element={<PaymentResult />} />
                  <Route path="/payment-success" element={<PaymentSuccess />} />
                  <Route path="/payment-error" element={<PaymentError />} />
                  <Route path="/payment/failure" element={<PaymentResult />} />
                  <Route path="/payment/pending" element={<PaymentResult />} />
                  
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminDashboard />} />
                  <Route path="/admin/cursos" element={<CourseManagement />} />
                  <Route path="/admin/cursos/crear" element={<CreateCourse />} />
                  <Route path="/admin/cursos/editar/:id" element={<EditCourse />} />
                  <Route path="/admin/usuarios" element={<UserManagement />} />
                  <Route path="/admin/certificados" element={<CertificateManagement />} />
                  <Route path="/admin/planes" element={<PlanManagement />} />
                  <Route path="/admin/seguridad" element={<SecurityDashboard />} />
                  <Route path="/admin/configuracion" element={<Settings />} />
                  
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </main>
              <Footer />
              <AuthDebug />
            </div>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
