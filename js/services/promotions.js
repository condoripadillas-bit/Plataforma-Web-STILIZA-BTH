window.StilizaPromotions = {
  _sb() {
    return window.StilizaDB?.sb || (typeof window.getSupabase === 'function' ? window.getSupabase() : null);
  },
  _row(p) {
    let image_url = p.image_url || '';
    if (image_url && image_url.length > 120000) image_url = '';
    return {
      title: String(p.title || '').trim(),
      description: String(p.description || ''),
      discount_percent: Number(p.discount_percent) || 0,
      discount_label: String(p.discount_label || ''),
      original_price: Number(p.original_price) || 0,
      category: String(p.category || ''),
      image_url,
      end_date: p.end_date || null,
      days_total: Number(p.days_total) || 20,
      is_active: p.is_active !== false
    };
  },
  async listActive() {
    const sb = this._sb();
    if (!sb) return [];
    const { data, error } = await sb.from('promotions').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) { console.error('[promos]', error); return []; }
    return data || [];
  },
  async listAll() {
    const sb = this._sb();
    if (!sb) return [];
    const { data, error } = await sb.from('promotions').select('*').order('created_at', { ascending: false });
    if (error) { console.error('[promos]', error); return []; }
    return data || [];
  },
  async create(promo) {
    const sb = this._sb();
    if (!sb) throw new Error('Supabase no conectado');
    const row = this._row(promo);
    if (!row.title) throw new Error('Título vacío');
    const { data, error } = await sb.from('promotions').insert(row).select().single();
    if (error) {
      console.error('[promos.create]', error);
      throw new Error(error.message || JSON.stringify(error));
    }
    console.log('[Stiliza] Promo en Supabase', data?.id);
    return data;
  },
  async update(id, patch) {
    const sb = this._sb();
    if (!sb) throw new Error('Supabase no conectado');
    const row = this._row(patch);
    const { data, error } = await sb.from('promotions').update(row).eq('id', id).select().single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    return data;
  },
  async remove(id) {
    const sb = this._sb();
    if (!sb) return;
    await sb.from('promotions').delete().eq('id', id);
  }
};
