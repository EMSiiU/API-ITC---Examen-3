import { supabase } from '../../lib/supabase.js';

export const getAvailableResources = async () => {
  const { data, error } = await supabase
    .from('resources')
    .select('*')
    .order('category', { ascending: true });

  if (error) throw new Error('Error al obtener recursos de la base de datos');
  return data;
};

export const reserveResource = async (studentId: string, resourceId: string) => {
  // 1. Verificar existencia y stock
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('*')
    .eq('id', resourceId)
    .single();

  if (fetchError || !resource) {
    throw new Error('El recurso solicitado no existe.');
  }

  if (resource.available_stock <= 0) {
    throw new Error('No hay stock disponible para este recurso.');
  }

  // 2. Restar el stock
  const newStock = resource.available_stock - 1;
  const { error: updateError } = await supabase
    .from('resources')
    .update({ available_stock: newStock })
    .eq('id', resourceId);

  if (updateError) {
    throw new Error('Error al actualizar el inventario.');
  }

  // 3. Crear el préstamo (3 días de vigencia)
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 3);

  const { data: loan, error: loanError } = await supabase
    .from('loans')
    .insert({
      student_id: studentId,
      resource_id: resourceId,
      status: 'pending_pickup',
      borrow_date: new Date().toISOString(),
      due_date: dueDate.toISOString(),
    })
    .select()
    .single();

  if (loanError) {
    // Rollback
    await supabase
      .from('resources')
      .update({ available_stock: resource.available_stock })
      .eq('id', resourceId);
    throw new Error('Error al procesar la reserva.');
  }

  return { message: 'Recurso reservado con éxito', loan };
};