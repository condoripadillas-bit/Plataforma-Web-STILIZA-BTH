function getSupabaseClient() {
  try {
    if (window.StilizaDB && window.StilizaDB.sb) return window.StilizaDB.sb;
  } catch (_) {}
  return null;
}

window.StilizaReservations = {
  async list() {
    const sb = getSupabaseClient();
    if (!sb) return [];
    const { data, error } = await sb
      .from('reservations')
      .select('*, reservation_items(*)')
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      return [];
    }
    return data || [];
  },

  async createReservation({ customer_name, customer_phone, items, payment_method, tipo }) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error('Supabase no configurado');

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

    const { data: res, error } = await sb.from('reservations').insert({
      reservation_number: numero,
      customer_name: customer_name || 'Cliente',
      customer_phone: customer_phone || '',
      total_amount: total,
      deposit_amount: deposit,
      remaining_amount: remaining,
      payment_method: payment_method || 'tarjeta',
      pickup_status: isVenta ? 'vendido' : 'pendiente'
    }).select().single();

    if (error) throw error;

    if (res && res.id && list.length) {
      const rows = list.map(i => ({
        reservation_id: res.id,
        product_name: i.product_name,
        size: i.size,
        unit_price: i.unit_price,
        quantity: i.quantity
      }));
      const { error: e2 } = await sb.from('reservation_items').insert(rows);
      if (e2) console.warn('items:', e2);
    }

    return res;
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
