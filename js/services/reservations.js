// STILIZA — Reservas (Supabase)
function getSupabaseClient() {
  if (window.StilizaDB && window.StilizaDB.sb) return window.StilizaDB.sb;
  if (window.supabaseClient) return window.supabaseClient;
  if (window.sb) return window.sb;
  if (typeof window.getSupabase === 'function') {
    try { return window.getSupabase(); } catch (_) {}
  }
  return null;
}

window.StilizaReservations = {
  async list(filters = {}) {
    const sb = getSupabaseClient();
    if (!sb) {
      console.warn('[Stiliza] list: sin cliente Supabase');
      return [];
    }
    let q = sb.from('reservations').select('*, reservation_items(*)').order('created_at', { ascending: false });
    if (filters.pickup_status) q = q.eq('pickup_status', filters.pickup_status);
    if (filters.tipo) q = q.eq('tipo', filters.tipo);
    const { data, error } = await q;
    if (error) {
      console.error('[Stiliza] list reservas:', error);
      return [];
    }
    return data || [];
  },

  async createReservation({ customer_name, customer_phone, customer_email, items, payment_method, tipo, employee_email }) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase no configurado (no hay cliente)');

    const safeItems = (items || []).map(i => ({
      product_id: i.product_id || null,
      product_name: i.product_name || i.nombre || 'Producto',
      size: i.size || i.talla || 'M',
      unit_price: Number(i.unit_price ?? i.precio ?? 0),
      quantity: Number(i.quantity ?? i.cantidad ?? 1)
    }));

    if (!safeItems.length) throw new Error('No hay ítems en la reserva');

    const total = safeItems.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const isVenta = tipo === 'venta_tienda' || tipo === 'venta';
    const deposit = isVenta ? total : Math.round(total * 0.2 * 100) / 100;
    const remaining = Math.round((total - deposit) * 100) / 100;
    const numero = (isVenta ? 'V' : 'R') + '-2026-' + String(Math.floor(Math.random() * 90000) + 10000);
    const deadline = isVenta ? null : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    let uid = null;
    try {
      const session = await sb.auth.getSession();
      uid = session?.data?.session?.user?.id || null;
    } catch (_) {}

    // Intento 1: con todas las columnas
    let payload = {
      reservation_number: numero,
      customer_name: customer_name || 'Cliente',
      customer_phone: customer_phone || '',
      customer_email: customer_email || '',
      total_amount: total,
      deposit_amount: deposit,
      remaining_amount: remaining,
      payment_method: payment_method || 'tarjeta',
      payment_status: 'pagado',
      pickup_status: isVenta ? 'vendido' : 'pendiente',
      tipo: isVenta ? 'venta_tienda' : 'reserva',
      pickup_deadline: deadline,
      employee_email: employee_email || ''
    };
    if (uid) payload.created_by = uid;

    let res = null;
    let error = null;

    ({ data: res, error } = await sb.from('reservations').insert(payload).select().single());

    // Intento 2: si falla por columnas, versión mínima
    if (error) {
      console.warn('[Stiliza] insert completo falló, reintentando mínimo:', error.message);
      payload = {
        reservation_number: numero,
        customer_name: customer_name || 'Cliente',
        customer_phone: customer_phone || '',
        total_amount: total,
        deposit_amount: deposit,
        remaining_amount: remaining,
        payment_method: payment_method || 'tarjeta',
        pickup_status: isVenta ? 'vendido' : 'pendiente'
      };
      ({ data: res, error } = await sb.from('reservations').insert(payload).select().single());
    }

    if (error) throw error;
    if (!res || !res.id) throw new Error('No se obtuvo id de la reserva');

    const rows = safeItems.map(i => ({
      reservation_id: res.id,
      product_id: i.product_id,
      product_name: i.product_name,
      size: i.size,
      unit_price: i.unit_price,
      quantity: i.quantity,
      subtotal: i.unit_price * i.quantity
    }));

    // items (si falla subtotal, reintenta sin subtotal)
    let e2 = (await sb.from('reservation_items').insert(rows)).error;
    if (e2) {
      console.warn('[Stiliza] items con subtotal falló, reintentando sin subtotal:', e2.message);
      const rows2 = safeItems.map(i => ({
        reservation_id: res.id,
        product_name: i.product_name,
        size: i.size,
        unit_price: i.unit_price,
        quantity: i.quantity
      }));
      e2 = (await sb.from('reservation_items').insert(rows2)).error;
      if (e2) console.error('[Stiliza] items error:', e2);
    }

    const { data: full } = await sb
      .from('reservations')
      .select('*, reservation_items(*)')
      .eq('id', res.id)
      .single();

    return full || res;
  },

  async updateStatus(id, pickup_status) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase no configurado');
    const { data, error } = await sb
      .from('reservations')
      .update({ pickup_status })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};
