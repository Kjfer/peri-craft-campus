import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Award, 
  BookOpen, 
  Globe,
  Heart,
  Target,
  Lightbulb,
  Scissors,
  Palette,
  Star
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function About() {
  const navigate = useNavigate();

  const stats = [
    { label: "Estudiantes Activos", value: "200+", icon: Users },
    { label: "Cursos Disponibles", value: "15+", icon: BookOpen },
    { label: "Certificados Emitidos", value: "200+", icon: Award },
    { label: "Países en Latinoamérica", value: "5+", icon: Globe },
  ];

  const values = [
    {
      icon: Heart,
      title: "Pasión por la Moda",
      description: "Creemos que la moda es una forma de arte y expresión personal que merece ser enseñada con dedicación y amor."
    },
    {
      icon: Target,
      title: "Excelencia Educativa",
      description: "Nos comprometemos a ofrecer la mejor calidad educativa con instructores expertos y contenido actualizado."
    },
    {
      icon: Lightbulb,
      title: "Innovación Constante",
      description: "Adoptamos nuevas tecnologías y metodologías para crear experiencias de aprendizaje únicas y efectivas."
    },
    {
      icon: Users,
      title: "Comunidad Global",
      description: "Fomentamos una comunidad internacional donde estudiantes y profesionales pueden conectar y colaborar."
    }
  ];

  const team = [
    {
      name: "Nitza Peri",
      role: "Directora Académica",
      description: "Empresaria en el rubro Textil, Ingeniería, Educación e Importación de Cosméticos.",
      image: "https://idjmabhvzupcdygguqzm.supabase.co/storage/v1/object/sign/images/1701365672457.jpg?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MGYzZmU5YS1lMWI0LTQ1YzktOTJiYy1jZjU1OTljYWQ0YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZXMvMTcwMTM2NTY3MjQ1Ny5qcGciLCJpYXQiOjE3NTkxNjQzNTAsImV4cCI6MTc5MDcwMDM1MH0.Rj_w3VPPYFlrULxPKJjFEd-ldz6HRK4afPDaG_D1j38"
    },
    {
      name: "Pether Peri",
      role: "Director e Instructor Principal",
      description: "Diseñador de modas reconocido internacionalmente y con amplia experiencia en la industria.",
      image: "https://idjmabhvzupcdygguqzm.supabase.co/storage/v1/object/sign/images/Captura%20de%20pantalla%202025-09-29%20100039.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV82MGYzZmU5YS1lMWI0LTQ1YzktOTJiYy1jZjU1OTljYWQ0YjIiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJpbWFnZXMvQ2FwdHVyYSBkZSBwYW50YWxsYSAyMDI1LTA5LTI5IDEwMDAzOS5wbmciLCJpYXQiOjE3NTkxNTgwOTMsImV4cCI6MTc5MDY5NDA5M30.xqMPwRVWF5vVgB5HXE6vWtd_hM_fYTIwCtDKBgYQUoY"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/30">
      {/* Hero Section */}
      <section className="py-16 bg-gradient-primary text-primary-foreground">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Sobre Peri Institute
            </h1>
            <p className="text-xl opacity-90 mb-8 leading-relaxed">
              Peri Institute es un instituto virtual de moda que ofrece un programa intensivo de un año, 
              desde fundamentos de diseño y confección hasta técnicas avanzadas de producción. 
              Su metodología 100% online, práctica y accesible, está dirigida a personas con o sin experiencia, 
              acompañadas por docentes especializados y una comunidad creativa. La escuela impulsa el talento emergente, 
              brindando recursos para emprender o integrarse al mundo laboral de la moda con confianza y visión profesional.
            </p>
            <div className="flex items-center justify-center space-x-4">
              <Scissors className="w-8 h-8" />
              <Palette className="w-8 h-8" />
              <Star className="w-8 h-8" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <Card key={index} className="text-center border-0 bg-gradient-to-br from-white via-primary/5 to-primary/10 hover:shadow-elegant hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-2">
                <CardContent className="pt-6">
                  <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center text-white mb-4 shadow-lg">
                    <stat.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-3xl font-bold text-primary mb-2 drop-shadow-sm">{stat.value}</h3>
                  <p className="text-sm text-gray-700 font-semibold">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Nuestra Misión</h2>
              <p className="text-lg text-muted-foreground">
                Democratizar el acceso a la educación de calidad en moda y diseño
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-6">
                <p className="text-gray-700 font-medium leading-relaxed text-lg">
                 En Peri Institute creemos que la pasión creativa puede transformarse en una carrera 
                 profesional. Nuestra misión es brindar formación en moda, diseño y confección accesible 
                 a nivel global, eliminando barreras geográficas y económicas para que cualquier persona 
                 pueda desarrollar su talento y convertirlo en una oportunidad real.
                </p>
                
                <p className="text-gray-700 font-medium leading-relaxed text-lg">
                  A través de nuestra plataforma 100% virtual, ofrecemos programas intensivos con un enfoque 
                  práctico y actualizado, dirigidos por docentes especializados en la industria. De esta manera, 
                  aseguramos que cada estudiante adquiera competencias sólidas y aplicables para destacar en 
                  el dinámico y exigente mundo de la moda.
                </p>

                <div className="flex space-x-4">
                  <Badge variant="secondary" className="px-4 py-2 bg-primary/10 text-primary font-semibold">
                    Accesibilidad Global
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2 bg-primary/10 text-primary font-semibold">
                    Calidad Premium
                  </Badge>
                </div>
              </div>

              <Card className="border-0 bg-gradient-to-br from-primary/5 via-white to-yellow-50/50 shadow-elegant hover:shadow-glow transition-all duration-300">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold mb-4 text-gray-900">Visión 2030</h3>
                  <p className="text-gray-700 font-medium leading-relaxed">
                    Convertirnos en la plataforma educativa líder a nivel mundial en moda y diseño, 
                    reconocida por la calidad de nuestros programas y por impulsar el éxito profesional 
                    de nuestros estudiantes dentro de la industria global de la moda.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Nuestros Valores</h2>
              <p className="text-lg text-muted-foreground">
                Los principios que guían cada decisión y acción en Peri Institute
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="border-0 bg-gradient-to-br from-white via-gray-50/50 to-primary/5 hover:shadow-elegant hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-1">
                  <CardHeader>
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center text-white mb-4 shadow-lg">
                      <value.icon className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-900">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 font-medium leading-relaxed">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">Nuestro Equipo</h2>
              <p className="text-lg text-muted-foreground">
                Profesionales apasionados comprometidos con tu éxito
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {team.map((member, index) => (
                <Card key={index} className="text-center border-0 bg-gradient-to-br from-white via-gray-50/50 to-primary/5 hover:shadow-elegant hover:shadow-primary/20 transition-all duration-300 transform hover:-translate-y-2">
                  <CardContent className="pt-8">
                    <div className="w-28 h-28 mx-auto rounded-full mb-6 overflow-hidden shadow-lg border-4 border-primary/20">
                      <img 
                        src={member.image} 
                        alt={member.name}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        onError={(e) => {
                          // Fallback to letter if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.parentElement.innerHTML = `
                            <div class="w-28 h-28 rounded-full bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center shadow-lg">
                              <span class="text-3xl font-bold text-white">${member.name.charAt(0)}</span>
                            </div>
                          `;
                        }}
                      />
                    </div>
                    <h3 className="text-xl font-bold mb-3 text-gray-900">{member.name}</h3>
                    <Badge variant="secondary" className="mb-4 bg-primary/10 text-primary font-semibold">{member.role}</Badge>
                    <p className="text-gray-700 font-medium text-sm leading-relaxed bg-white/80 p-4 rounded-lg">
                      {member.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">
              ¿Listo para comenzar tu viaje en la moda?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Únete a miles de estudiantes que ya están transformando sus sueños en realidad
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="px-8" onClick={() => navigate("/cursos")}>
                Ver Cursos
              </Button>
              <Button size="lg" variant="outline" className="px-8" onClick={() => navigate("/contacto")}>
                Contactar
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}