import { Link } from "react-router-dom";
import { Facebook, Instagram, Youtube, Linkedin, Mail, Phone, MapPin } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-secondary text-secondary-foreground">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-lg font-bold text-primary-foreground">P</span>
              </div>
              <span className="text-xl font-bold">Peri Institute</span>
            </div>
            <p className="text-sm text-secondary-foreground/80">
              Tu academia especializada en moda, diseño y confección de ropa. 
              Aprende con los mejores profesionales del sector.
            </p>
            <div className="flex space-x-4">
              <a href="https://www.facebook.com/p/PERI-Institute-100031453284473" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-secondary-foreground/60 hover:text-secondary-foreground transition-smooth">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="https://www.instagram.com/peri.institute/" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-secondary-foreground/60 hover:text-secondary-foreground transition-smooth">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://www.linkedin.com/company/peri-institute/" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-secondary-foreground/60 hover:text-secondary-foreground transition-smooth">
                <Linkedin className="h-5 w-5" />
              </a>
              <a href="https://www.youtube.com/channel/UCefyuv5d-LZqcNiNWSX9NdQ" 
                 target="_blank" 
                 rel="noopener noreferrer" 
                 className="text-secondary-foreground/60 hover:text-secondary-foreground transition-smooth">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/cursos" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-smooth">
                  Catálogo de Cursos
                </Link>
              </li>
              <li>
                <Link to="/planes" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-smooth">
                  Planes de Suscripción
                </Link>
              </li>
              <li>
                <Link to="/nosotros" className="text-sm text-secondary-foreground/80 hover:text-secondary-foreground transition-smooth">
                  Nosotros
                </Link>
              </li>
            </ul>
          </div>

          {/* Cursos */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Categorías</h3>
            <ul className="space-y-2">
              <li>
                <span className="text-sm text-secondary-foreground/80">Diseño de Moda</span>
              </li>
              <li>
                <span className="text-sm text-secondary-foreground/80">Confección</span>
              </li>
              <li>
                <span className="text-sm text-secondary-foreground/80">Patronaje</span>
              </li>
              <li>
                <span className="text-sm text-secondary-foreground/80">Técnicas Avanzadas</span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contacto</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-sm text-secondary-foreground/80">info@instituto.pericompanygroup.com</span>
              </div>
              <div className="flex items-center space-x-3">
                <Phone className="h-4 w-4 text-primary" />
                <span className="text-sm text-secondary-foreground/80">+51 920 545 678</span>
              </div>
              <div className="flex items-center space-x-3">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm text-secondary-foreground/80">
                  Lima, Lima Metropolitana PE
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-sm text-secondary-foreground/60">
            © {new Date().getFullYear()} Peri Institute. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}