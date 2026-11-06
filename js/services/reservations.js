function getSupabaseClient() {
  try {
    if (window.StilizaDB && window.StilizaDB.sb) return window.StilizaDB.sb;
  } catch (_) {}
  try {
    if (typeof window.getSupabase === 'function') {
      const c = window.getSupabase();
      if (c) return c;
    }
  } catch (_) {}
  return null;
}

window.StilizaReservations = {
  async list() {
    const sb = getSupabaseClient();
    if (!sb) return [];
    try {
      const { data, error } = await sb
        .from('reservations')
        .select('*, reservation_items(*)')
        .order('created_at', { ascending: false });
      if (error) {
        console.error(error);
        return [];
      }
      return data || [];
    } catch (err) {
      console.error('[reservations.list]', err);
      return [];
    }
  },

  async createReservation({ customer_name, customer_phone, customer_email, items, payment_method, tipo }) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase no configurado. Revisa js/supabase-config.js (URL y anon key).');

    // Solo campos del diagrama (sin product_id ni subtotal)
    const list = (items || []).map(i => ({
      product_name: i.product_name || i.nombre || 'Producto',
      size: i.size || i.talla || 'M',
      unit_price: Number(i.unit_price ?? i.precio ?? 0),
      quantity: Number(i.quantity ?? i.cantidad ?? 1)
    }));

    const total = list.reduce((s, i) => s + i.unit_price * i.quantity, 0);
    const isVenta = tipo === 'venta_tienda';
    const deposit = isVenta ? total : Math.round(total * 0.2 * 100) / 100;
    const remaining = Math.round((total - deposit) * 100) / 100;
    const numero = (isVenta ? 'V' : 'R') + '-2026-' + String(Math.floor(Math.random() * 90000) + 10000);

    // Solo columnas del diagrama de reservations
    const payload = {
      reservation_number: numero,
      customer_name: customer_name || 'Cliente',
      customer_email: customer_email || '',
      customer_phone: customer_phone || '',
      total_amount: total,
      deposit_amount: deposit,
      remaining_amount: remaining,
      payment_method: payment_method || 'tarjeta',
      payment_status: 'pagado',
      pickup_status: isVenta ? 'vendido' : 'pendiente',
      tipo: isVenta ? 'venta_tienda' : 'reserva',
      pickup_deadline: isVenta ? null : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      employee_email: ''
    };

    let res = null;
    let error = null;
    try {
      const r1 = await sb.from('reservations').insert(payload).select().single();
      res = r1.data;
      error = r1.error;
    } catch (netErr) {
      const msg = (netErr && netErr.message) || String(netErr);
      throw new Error('No se pudo conectar con Supabase (' + msg + '). Revisa URL/anon key y que el proyecto no esté pausado.');
    }

    if (error) {
      console.warn('[reservations] insert+select:', error);
      const r2 = await sb.from('reservations').insert(payload);
      if (r2.error) throw r2.error;
      res = { id: null, reservation_number: numero, ...payload };
    }

    if (res && res.id && list.length) {
      const rows = list.map(i => ({
        reservation_id: res.id,
        product_name: i.product_name,
        size: i.size,
        unit_price: i.unit_price,
        quantity: i.quantity
      }));
      const { error: e2 } = await sb.from('reservation_items').insert(rows);
      if (e2) console.warn('[reservations] items:', e2);
    }

    return res || { reservation_number: numero, ...payload };
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
