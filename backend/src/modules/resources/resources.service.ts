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

// Obtener los prestamo de un estudiante
export const getStudentLoans = async (studentId: string) => {
  const { data, error } = await supabase
    .from('loans')
    .select(`
      *,
      resources (
        name,
        image_url,
        category
      )
    `)
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Error al obtener los préstamos del alumno');
  return data;
};

// Cancelar un prestamo que aun no se recoge
export const cancelReservation = async (loanId: string, studentId: string) => {
  // 1. Validar que el préstamo exista, sea del alumno y esté pendiente
  const { data: loan, error: fetchError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .eq('student_id', studentId)
    .single();

  if (fetchError || !loan) throw new Error('Reserva no encontrada.');
  if (loan.status !== 'pending_pickup') throw new Error('Solo se pueden cancelar reservas pendientes por recoger.');

  // 2. Cambiar estado a cancelado
  const { error: cancelError } = await supabase
    .from('loans')
    .update({ status: 'cancelled' })
    .eq('id', loanId);

  if (cancelError) throw new Error('Error al cancelar la reserva.');

  // 3. Devolver +1 al stock disponible
  const { data: resource } = await supabase
    .from('resources')
    .select('available_stock')
    .eq('id', loan.resource_id)
    .single();

  if (resource) {
    await supabase
      .from('resources')
      .update({ available_stock: resource.available_stock + 1 })
      .eq('id', loan.resource_id);
  }

  return { message: 'Reserva cancelada con éxito.' };
};

// Funciones del Administrador
export const getAllLoansForAdmin = async () => {
  // Traemos TODOS los préstamos, cruzando datos para saber qué recurso es
  const { data, error } = await supabase
    .from('loans')
    .select(`
      *,
      resources (
        name,
        category
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw new Error('Error al obtener la lista de préstamos para el administrador.');
  return data;
};

export const markLoanAsReturned = async (loanId: string) => {
  // 1. Validar que el préstamo exista y no esté devuelto ya
  const { data: loan, error: fetchError } = await supabase
    .from('loans')
    .select('*')
    .eq('id', loanId)
    .single();

  if (fetchError || !loan) throw new Error('Préstamo no encontrado.');
  if (loan.status === 'returned') throw new Error('Este recurso ya fue marcado como devuelto anteriormente.');

  // 2. Cambiar el estado a "returned"
  const { error: updateError } = await supabase
    .from('loans')
    .update({ status: 'returned' })
    .eq('id', loanId);

  if (updateError) throw new Error('Error al actualizar el estado del préstamo.');

  // 3. Devolver +1 al stock disponible para que otro alumno pueda pedirlo
  const { data: resource } = await supabase
    .from('resources')
    .select('available_stock')
    .eq('id', loan.resource_id)
    .single();

  if (resource) {
    await supabase
      .from('resources')
      .update({ available_stock: resource.available_stock + 1 })
      .eq('id', loan.resource_id);
  }

  return { message: 'Recurso devuelto con éxito. Inventario actualizado.' };
};

export const markLoanAsActive = async (loanId: string) => {
  const { data: loan, error: fetchError } = await supabase
    .from('loans')
    .select('status')
    .eq('id', loanId)
    .single();

  if (fetchError || !loan) throw new Error('Préstamo no encontrado.');
  if (loan.status !== 'pending_pickup') throw new Error('Solo se pueden entregar reservas pendientes.');

  const { error: updateError } = await supabase
    .from('loans')
    .update({ status: 'active' })
    .eq('id', loanId);

  if (updateError) throw new Error('Error al actualizar el estado del préstamo.');

  return { message: 'Equipo entregado al alumno. Préstamo activo.' };
};

export const createNewResource = async (resourceData: any) => {
  const { name, description, category, total_stock, image_url } = resourceData;
  
  // Al crear un artículo nuevo, el disponible es igual al stock total inicial
  const { data, error } = await supabase
    .from('resources')
    .insert([{
      name,
      description,
      category,
      total_stock,
      available_stock: total_stock,
      image_url
    }])
    .select()
    .single();

  if (error) throw new Error('Error al crear el recurso: ' + error.message);
  return data;
};

export const adjustResourceStock = async (resourceId: string, delta: number) => {
  // 1. Obtenemos el stock actual
  const { data: resource, error: fetchError } = await supabase
    .from('resources')
    .select('total_stock, available_stock')
    .eq('id', resourceId)
    .single();

  if (fetchError || !resource) throw new Error('Recurso no encontrado.');

  // 2. Calculamos los nuevos valores (delta puede ser +1 o -1)
  const newTotal = resource.total_stock + delta;
  const newAvailable = resource.available_stock + delta;

  // 3. Validaciones estrictas
  if (newTotal < 0) throw new Error('El stock total no puede ser negativo.');
  if (newAvailable < 0) {
    throw new Error('No puedes reducir el stock. El artículo faltante se encuentra actualmente en préstamo.');
  }

  // 4. Actualizamos la base de datos
  const { data, error } = await supabase
    .from('resources')
    .update({ total_stock: newTotal, available_stock: newAvailable })
    .eq('id', resourceId)
    .select()
    .single();

  if (error) throw new Error('Error al actualizar el stock.');
  return data;
};