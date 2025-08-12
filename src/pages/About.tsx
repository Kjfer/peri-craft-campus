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

export default function About() {
  const stats = [
    { label: "Estudiantes Activos", value: "10,000+", icon: Users },
    { label: "Cursos Disponibles", value: "50+", icon: BookOpen },
    { label: "Certificados Emitidos", value: "5,000+", icon: Award },
    { label: "Países", value: "25+", icon: Globe },
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
      name: "María Fernández",
      role: "Directora Académica",
      description: "15 años de experiencia en diseño de moda y educación textil.",
      image: "/placeholder.svg"
    },
    {
      name: "Carlos Mendoza",
      role: "Instructor Principal",
      description: "Especialista en confección y patronaje con certificaciones internacionales.",
      image: "/placeholder.svg"
    },
    {
      name: "Ana García",
      role: "Coordinadora de Contenidos",
      description: "Experta en pedagogía digital y desarrollo de cursos online.",
      image: "/placeholder.svg"
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
              Somos una institución líder en educación de moda, diseño y confección de ropa, 
              comprometida con formar a los profesionales del futuro de la industria textil.
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
              <Card key={index} className="text-center border-0 bg-gradient-to-br from-background to-muted/50">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                    <stat.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold text-primary mb-2">{stat.value}</h3>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
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
                <p className="text-muted-foreground leading-relaxed">
                  En Peri Institute, creemos que el talento y la creatividad no tienen fronteras. 
                  Nuestra misión es proporcionar educación de calidad mundial en moda, diseño y 
                  confección de ropa a estudiantes de todo el mundo, sin importar su ubicación 
                  geográfica o situación económica.
                </p>
                
                <p className="text-muted-foreground leading-relaxed">
                  A través de nuestra plataforma digital innovadora, ofrecemos cursos prácticos 
                  y teóricos impartidos por profesionales reconocidos en la industria, 
                  garantizando que nuestros estudiantes adquieran las habilidades y conocimientos 
                  necesarios para destacar en el competitivo mundo de la moda.
                </p>

                <div className="flex space-x-4">
                  <Badge variant="secondary" className="px-4 py-2">
                    Accesibilidad Global
                  </Badge>
                  <Badge variant="secondary" className="px-4 py-2">
                    Calidad Premium
                  </Badge>
                </div>
              </div>

              <Card className="border-0 bg-gradient-to-br from-primary/5 to-accent/5">
                <CardContent className="p-8">
                  <h3 className="text-xl font-semibold mb-4">Visión 2030</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Ser la plataforma educativa de referencia mundial en moda y diseño, 
                    reconocida por la excelencia de nuestros programas y el éxito profesional 
                    de nuestros graduados en la industria global de la moda.
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
                <Card key={index} className="border-0 bg-gradient-to-br from-background to-muted/50 hover:shadow-elegant transition-all duration-300">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-4">
                      <value.icon className="w-6 h-6" />
                    </div>
                    <CardTitle className="text-xl">{value.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">
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
                <Card key={index} className="text-center border-0 bg-background hover:shadow-elegant transition-all duration-300">
                  <CardContent className="pt-6">
                    <div className="w-24 h-24 mx-auto rounded-full bg-gradient-primary mb-4 flex items-center justify-center">
                      <span className="text-2xl font-bold text-primary-foreground">
                        {member.name.charAt(0)}
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">{member.name}</h3>
                    <Badge variant="secondary" className="mb-4">{member.role}</Badge>
                    <p className="text-muted-foreground text-sm leading-relaxed">
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
              <Button size="lg" className="px-8">
                Ver Cursos
              </Button>
              <Button size="lg" variant="outline" className="px-8">
                Contactar
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}