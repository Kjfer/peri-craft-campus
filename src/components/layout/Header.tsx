import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, User, LogOut, BookOpen, Award, Settings, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
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
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
              <img 
                src="https://idjmabhvzupcdygguqzm.supabase.co/storage/v1/object/sign/images/logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MGYzZmU5YS1lMWI0LTQ1YzktOTJiYy1jZjU1OTljYWQ0YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZXMvbG9nby5wbmciLCJpYXQiOjE3NTkxNjU5NzQsImV4cCI6MTc5MDcwMTk3NH0.EPW4Mnk0ZvuraUMWuDffz6h_KZsu_2tM5D3mcenC6lg" 
                alt="Peri Institute Logo" 
                className="w-full h-full object-cover rounded-lg"
              />
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
            
            {user ? (
              <>
                {profile?.role === 'admin' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/admin")}
                    className="hidden md:flex items-center gap-2"
                  >
                    <ShieldCheck className="w-4 h-4" />
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
                    {profile?.role === 'admin' && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/admin")}>
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Panel de Administración</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
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
                  size="icon"
                  onClick={() => navigate("/auth")}
                  className="hidden md:flex"
                  title="Acceso Administrador"
                >
                  <ShieldCheck className="w-5 h-5" />
                </Button>
                <Button variant="outline" asChild>
                  <a 
                    href="https://intranet.peri-institute.pericompanygroup.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Ingreso al Intranet
                  </a>
                </Button>
                <Button asChild>
                  <a 
                    href="https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3D0fff6c2a-971c-4f7a-b0b3-3032b7a26319%26scope%3Dopenid%2Bprofile%2Bauthorities%2Bemail%2Buser%26redirect_uri%3Dhttps%253A%252F%252Fconsumer.hotmart.com%252Fauth%252Flogin%26response_type%3Dcode%26response_mode%3Dquery%26state%3D8b93495e25ae42728ba62b59f48a1be0%26client_name%3DCasOAuthClient"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Accede a tus compras
                  </a>
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
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Acceso Administrador
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          window.open('https://intranet.peri-institute.pericompanygroup.com', '_blank');
                          setIsOpen(false);
                        }}
                        className="justify-start"
                      >
                        Ingreso al Intranet
                      </Button>
                      <Button
                        onClick={() => {
                          window.open('https://sso.hotmart.com/login?service=https%3A%2F%2Fsso.hotmart.com%2Foauth2.0%2FcallbackAuthorize%3Fclient_id%3D0fff6c2a-971c-4f7a-b0b3-3032b7a26319%26scope%3Dopenid%2Bprofile%2Bauthorities%2Bemail%2Buser%26redirect_uri%3Dhttps%253A%252F%252Fconsumer.hotmart.com%252Fauth%252Flogin%26response_type%3Dcode%26response_mode%3Dquery%26state%3D8b93495e25ae42728ba62b59f48a1be0%26client_name%3DCasOAuthClient', '_blank');
                          setIsOpen(false);
                        }}
                        className="justify-start"
                      >
                        Accede a tus compras
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