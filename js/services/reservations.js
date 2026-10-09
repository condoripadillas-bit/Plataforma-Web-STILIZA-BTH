window.StilizaReservations = {
  _sb() {
    return window.StilizaDB?.sb || (typeof window.getSupabase === 'function' ? window.getSupabase() : null);
  },
  async list(filters = {}) {
    const sb = this._sb();
    if (!sb) return [];
    let q = sb.from('reservations').select('*').order('created_at', { ascending: false });
    if (filters.pickup_status) q = q.eq('pickup_status', filters.pickup_status);
    if (filters.tipo) q = q.eq('tipo', filters.tipo);
    const { data, error } = await q;
    if (error) { console.error('[reservations.list]', error); return []; }
    return data || [];
  },
  async createReservation({ customer_name, customer_phone, customer_email, items, payment_method, tipo, employee_email }) {
    const sb = this._sb();
    if (!sb) throw new Error('Supabase no conectado');

    const list = items || [];
    const total = list.reduce((s, i) =>
      s + Number(i.unit_price || i.precio || 0) * Number(i.quantity || i.cantidad || 1), 0);
    const isVenta = tipo === 'venta_tienda';
    const deposit = isVenta ? total : Math.round(total * 0.2 * 100) / 100;
    const remaining = Math.round((total - deposit) * 100) / 100;
    const numero = (isVenta ? 'V' : 'R') + '-2026-' + String(Math.floor(Math.random() * 90000) + 10000);
    const deadline = isVenta ? null : new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);

    // SOLO columnas de la tabla actual (sin created_by, notes, updated_at)
    const { data: res, error } = await sb.from('reservations').insert({
      reservation_number: numero,
      customer_name: customer_name || 'Cliente',
      customer_phone: customer_phone || '',
      customer_email: customer_email || '',
      total_amount: total,
      deposit_amount: deposit,
      remaining_amount: remaining,
      payment_method: payment_method || 'efectivo',
      payment_status: 'pagado',
      pickup_status: isVenta ? 'vendido' : 'pendiente',
      tipo: isVenta ? 'venta_tienda' : 'reserva',
      pickup_deadline: deadline,
      employee_email: employee_email || ''
    }).select().single();

    if (error) {
      console.error('[reservations.create]', error);
      throw new Error(error.message || JSON.stringify(error));
    }

    if (list.length) {
      const rows = list.map(i => ({
        reservation_id: res.id,
        product_name: i.product_name || i.nombre || 'Producto',
        size: i.size || i.talla || 'M',
        unit_price: Number(i.unit_price || i.precio || 0),
        quantity: Number(i.quantity || i.cantidad || 1)
      }));
      const { error: e2 } = await sb.from('reservation_items').insert(rows);
      if (e2) console.error('[reservation_items]', e2);
      else console.log('[Stiliza] reservation_items OK', rows.length);
    }

    console.log('[Stiliza] Reserva en Supabase', res.reservation_number);
    return res;
  },
  async updateStatus(id, pickup_status) {
    const sb = this._sb();
    if (!sb) return null;
    const patch = { pickup_status };
    if (pickup_status === 'recogido') {
      // al recoger: el frontend también ajusta montos en local
    }
    const { data, error } = await sb.from('reservations').update(patch).eq('id', id).select().single();
    if (error) { console.error(error); throw error; }
    return data;
  }
};
