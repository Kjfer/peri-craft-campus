import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit, Trash2, Crown, Calendar, Users, DollarSign } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_months: number;
  currency: string;
  is_active: boolean;
  all_courses_included: boolean;
  created_at: string;
  plan_courses?: {
    course_id: string;
    courses: {
      id: string;
      title: string;
    };
  }[];
}

interface Course {
  id: string;
  title: string;
  price: number;
}

const PlanManagement = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    duration_months: '',
    currency: 'USD',
    is_active: true,
    all_courses_included: false,
    selected_courses: [] as string[]
  });

  useEffect(() => {
    fetchPlans();
    fetchCourses();
  }, []);

  const fetchPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('plans')
        .select(`
          *,
          plan_courses(
            course_id,
            courses(id, title)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPlans(data || []);
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Error al cargar los planes');
    }
  };

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, price')
        .eq('is_active', true)
        .order('title');

      if (error) throw error;
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      duration_months: '',
      currency: 'USD',
      is_active: true,
      all_courses_included: false,
      selected_courses: []
    });
    setEditingPlan(null);
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price.toString(),
      duration_months: plan.duration_months.toString(),
      currency: plan.currency,
      is_active: plan.is_active,
      all_courses_included: plan.all_courses_included,
      selected_courses: plan.plan_courses?.map(pc => pc.course_id) || []
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        duration_months: parseInt(formData.duration_months),
        currency: formData.currency,
        is_active: formData.is_active,
        all_courses_included: formData.all_courses_included
      };

      let planId: string;

      if (editingPlan) {
        // Update existing plan
        const { error } = await supabase
          .from('plans')
          .update(planData)
          .eq('id', editingPlan.id);

        if (error) throw error;
        planId = editingPlan.id;
        toast.success('Plan actualizado exitosamente');
      } else {
        // Create new plan
        const { data, error } = await supabase
          .from('plans')
          .insert(planData)
          .select()
          .single();

        if (error) throw error;
        planId = data.id;
        toast.success('Plan creado exitosamente');
      }

      // Update plan courses if not all courses included
      if (!formData.all_courses_included && formData.selected_courses.length > 0) {
        // Delete existing course associations
        await supabase
          .from('plan_courses')
          .delete()
          .eq('plan_id', planId);

        // Insert new course associations
        const courseAssociations = formData.selected_courses.map(courseId => ({
          plan_id: planId,
          course_id: courseId
        }));

        const { error: coursesError } = await supabase
          .from('plan_courses')
          .insert(courseAssociations);

        if (coursesError) throw coursesError;
      } else if (!formData.all_courses_included) {
        // Remove all course associations if none selected
        await supabase
          .from('plan_courses')
          .delete()
          .eq('plan_id', planId);
      }

      setDialogOpen(false);
      resetForm();
      fetchPlans();
      
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Error al guardar el plan');
    }
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este plan?')) return;

    try {
      const { error } = await supabase
        .from('plans')
        .delete()
        .eq('id', planId);

      if (error) throw error;
      
      toast.success('Plan eliminado exitosamente');
      fetchPlans();
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Error al eliminar el plan');
    }
  };

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0
    }).format(price);
  };

  const getDurationText = (months: number) => {
    if (months === 1) return '1 mes';
    if (months < 12) return `${months} meses`;
    if (months === 12) return '1 año';
    return `${Math.floor(months / 12)} años`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestión de Planes</h1>
          <p className="text-muted-foreground">Administra los planes de suscripción</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Plan
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingPlan ? 'Editar Plan' : 'Crear Nuevo Plan'}
              </DialogTitle>
              <DialogDescription>
                Configura los detalles del plan de suscripción
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre del Plan</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Plan Black"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="price">Precio</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                    placeholder="990000"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe los beneficios y características del plan"
                  rows={3}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (meses)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.duration_months}
                    onChange={(e) => setFormData(prev => ({ ...prev, duration_months: e.target.value }))}
                    placeholder="12"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Moneda</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD - Dólar</SelectItem>
                      <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                      <SelectItem value="PEN">PEN - Sol Peruano</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="all_courses"
                  checked={formData.all_courses_included}
                  onCheckedChange={(checked) => setFormData(prev => ({ 
                    ...prev, 
                    all_courses_included: checked,
                    selected_courses: checked ? [] : prev.selected_courses
                  }))}
                />
                <Label htmlFor="all_courses">Incluir todos los cursos</Label>
              </div>

              {!formData.all_courses_included && (
                <div className="space-y-2">
                  <Label>Cursos incluidos en el plan</Label>
                  <div className="max-h-48 overflow-y-auto border rounded-md p-4 space-y-2">
                    {courses.map((course) => (
                      <div key={course.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`course-${course.id}`}
                          checked={formData.selected_courses.includes(course.id)}
                          onCheckedChange={(checked) => {
                            setFormData(prev => ({
                              ...prev,
                              selected_courses: checked
                                ? [...prev.selected_courses, course.id]
                                : prev.selected_courses.filter(id => id !== course.id)
                            }));
                          }}
                        />
                        <Label 
                          htmlFor={`course-${course.id}`} 
                          className="text-sm font-normal"
                        >
                          {course.title} - {formatPrice(course.price, 'USD')}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
                <Label htmlFor="is_active">Plan activo</Label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button type="submit" className="flex-1">
                  {editingPlan ? 'Actualizar Plan' : 'Crear Plan'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {plan.name}
                    {plan.all_courses_included && (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {plan.description}
                  </CardDescription>
                </div>
                <Badge variant={plan.is_active ? "default" : "secondary"}>
                  {plan.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{formatPrice(plan.price, plan.currency)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{getDurationText(plan.duration_months)}</span>
                </div>
              </div>

              {plan.all_courses_included ? (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <Users className="h-4 w-4" />
                  <span>Acceso a todos los cursos</span>
                </div>
              ) : (
                <div className="text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>Cursos incluidos ({plan.plan_courses?.length || 0})</span>
                  </div>
                  {plan.plan_courses && plan.plan_courses.length > 0 && (
                    <div className="text-xs text-muted-foreground ml-6">
                      {plan.plan_courses.slice(0, 2).map(pc => pc.courses.title).join(', ')}
                      {plan.plan_courses.length > 2 && ` y ${plan.plan_courses.length - 2} más...`}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(plan)}
                  className="flex-1"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(plan.id)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {plans.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <Crown className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay planes creados</h3>
            <p className="text-muted-foreground mb-4">
              Crea tu primer plan de suscripción para empezar a ofrecer acceso a tus cursos
            </p>
            <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Crear Primer Plan
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlanManagement;