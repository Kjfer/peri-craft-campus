import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import CartPreview from '@/components/ui/CartPreview';
import { Menu, User, LogOut, BookOpen, Award, Settings, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Header() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { state: cartState } = useCart();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      console.error('Error signing out:', error);
      // Even if there's an error, navigate to home
      navigate("/");
    }
  };

  const navigation = [
    { name: "Inicio", href: "/" },
    { name: "Cursos", href: "/cursos" },
    { name: "Clases en Vivo", href: "/clases-en-vivo" },
    { name: "Planes", href: "/planes" },
    { name: "Nosotros", href: "/nosotros" },
    { name: "Contacto", href: "/contacto" },
    { name: "Verificar Certificado", href: "/verificar-certificado" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-foreground">P</span>
            </div>
            <span className="text-xl font-bold">Peri Institute</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            <CartPreview />
            
            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className="hidden md:flex"
                  >
                    Admin
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile?.avatar_url} alt={profile?.full_name} />
                        <AvatarFallback>
                          {profile?.full_name?.charAt(0) || user.email?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.full_name}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>Mi Dashboard</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>Mis Cursos</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/dashboard")}>
                      <Award className="mr-2 h-4 w-4" />
                      <span>Certificados</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/configuracion")}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Configuración</span>
                    </DropdownMenuItem>
                    {profile?.role === 'admin' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Panel de Administración</span>
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Cerrar Sesión</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="hidden md:flex"
                >
                  Iniciar Sesión
                </Button>
                <Button onClick={() => navigate("/auth")}>
                  Registrarse
                </Button>
              </>
            )}

            {/* Mobile menu */}
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px]">
                <nav className="flex flex-col space-y-4 mt-6">
                  {navigation.map((item) => (
                    <Link
                      key={item.name}
                      to={item.href}
                      className="text-lg font-medium"
                      onClick={() => setIsOpen(false)}
                    >
                      {item.name}
                    </Link>
                  ))}
                  {user ? (
                    <>
                      {profile?.role === 'admin' && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            navigate("/admin");
                            setIsOpen(false);
                          }}
                          className="justify-start"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          Panel de Administración
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        onClick={() => {
                          handleSignOut();
                          setIsOpen(false);
                        }}
                        className="justify-start"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Cerrar Sesión
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          navigate("/auth");
                          setIsOpen(false);
                        }}
                        className="justify-start"
                      >
                        Iniciar Sesión
                      </Button>
                      <Button
                        onClick={() => {
                          navigate("/auth");
                          setIsOpen(false);
                        }}
                        className="justify-start"
                      >
                        Registrarse
                      </Button>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}