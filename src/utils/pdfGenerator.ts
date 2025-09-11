import jsPDF from 'jspdf';
import type { Course } from '@/types/course';

interface Module {
  id: string;
  title: string;
  description?: string;
  order_number: number;
  lessons: Lesson[];
}

interface Lesson {
  id: string;
  title: string;
  description?: string;
  duration_minutes: number;
  order_number: number;
  is_free: boolean;
}

export function generateSyllabusPDF(course: Course, modules: Module[]) {
  // If the course has a custom syllabus PDF, use that instead
  if (course.syllabus_pdf_url) {
    // Open the existing PDF in a new tab
    window.open(course.syllabus_pdf_url, '_blank');
    return;
  }

  // Generate PDF automatically if no custom PDF is provided
  const doc = new jsPDF();
  let yPosition = 20;

  // Título del documento
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Syllabus del Curso', 20, yPosition);
  yPosition += 15;

  // Información del curso
  doc.setFontSize(16);
  doc.text(course.title, 20, yPosition);
  yPosition += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  
  if (course.instructor_name) {
    doc.text(`Instructor: ${course.instructor_name}`, 20, yPosition);
    yPosition += 8;
  }

  if (course.level) {
    doc.text(`Nivel: ${course.level}`, 20, yPosition);
    yPosition += 8;
  }

  const totalDuration = modules.reduce((total, module) => 
    total + module.lessons.reduce((moduleTotal, lesson) => 
      moduleTotal + lesson.duration_minutes, 0), 0);
  
  if (totalDuration > 0) {
    doc.text(`Duración total: ${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`, 20, yPosition);
    yPosition += 8;
  }

  const totalLessons = modules.reduce((total, module) => total + module.lessons.length, 0);
  doc.text(`Total de lecciones: ${totalLessons}`, 20, yPosition);
  yPosition += 15;

  // Descripción del curso
  if (course.description) {
    doc.setFont('helvetica', 'bold');
    doc.text('Descripción:', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    const splitDescription = doc.splitTextToSize(course.description, 170);
    doc.text(splitDescription, 20, yPosition);
    yPosition += splitDescription.length * 5 + 10;
  }

  // Lo que aprenderás
  if (course.what_you_learn && course.what_you_learn.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.text('¿Qué aprenderás?', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    course.what_you_learn.forEach((item) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`• ${item}`, 25, yPosition);
      yPosition += 6;
    });
    yPosition += 10;
  }

  // Contenido del curso
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('Contenido del Curso:', 20, yPosition);
  yPosition += 10;

  modules.forEach((module, moduleIndex) => {
    // Verificar si necesitamos nueva página
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Título del módulo
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`Módulo ${moduleIndex + 1}: ${module.title}`, 20, yPosition);
    yPosition += 8;

    if (module.description) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      const splitDesc = doc.splitTextToSize(module.description, 170);
      doc.text(splitDesc, 25, yPosition);
      yPosition += splitDesc.length * 4 + 5;
    }

    // Lecciones del módulo
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    
    module.lessons.forEach((lesson, lessonIndex) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }

      const lessonText = `${lessonIndex + 1}. ${lesson.title} (${lesson.duration_minutes} min)${lesson.is_free ? ' - Gratis' : ''}`;
      doc.text(lessonText, 30, yPosition);
      yPosition += 5;

      if (lesson.description) {
        doc.setFont('helvetica', 'italic');
        const splitLessonDesc = doc.splitTextToSize(`   ${lesson.description}`, 160);
        doc.text(splitLessonDesc, 30, yPosition);
        yPosition += splitLessonDesc.length * 4;
        doc.setFont('helvetica', 'normal');
      }
      yPosition += 2;
    });

    yPosition += 8;
  });

  // Requisitos
  if (course.requirements && course.requirements.length > 0) {
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Requisitos:', 20, yPosition);
    yPosition += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    course.requirements.forEach((requirement) => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(`• ${requirement}`, 25, yPosition);
      yPosition += 6;
    });
  }

  // Agregar pie de página
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Página ${i} de ${pageCount}`, 170, 290);
  }

  // Descargar el PDF
  const fileName = `syllabus-${course.title.toLowerCase().replace(/\s+/g, '-')}.pdf`;
  doc.save(fileName);
}