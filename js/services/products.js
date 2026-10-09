window.StilizaProducts = {
  _sb() {
    return window.StilizaDB?.sb || (typeof window.getSupabase === 'function' ? window.getSupabase() : null);
  },
  _row(p) {
    let image_url = p.image_url || p.imagen || '';
    if (image_url && image_url.length > 120000) image_url = '';
    return {
      name: String(p.name || p.nombre || '').trim(),
      description: String(p.description || p.descripcion || ''),
      material: String(p.material || ''),
      category: String(p.category || p.categoria || 'gala'),
      price: Number(p.price ?? p.precio) || 0,
      image_url,
      sizes: Array.isArray(p.sizes) ? p.sizes : (Array.isArray(p.tallas) ? p.tallas : ['S', 'M', 'L']),
      is_active: p.is_active !== false && p.activo !== false
    };
  },
  async listActive() {
    const sb = this._sb();
    if (!sb) return [];
    const { data, error } = await sb.from('products').select('*').eq('is_active', true).order('created_at', { ascending: false });
    if (error) { console.error('[products]', error); return []; }
    return data || [];
  },
  async listAll() {
    const sb = this._sb();
    if (!sb) return [];
    const { data, error } = await sb.from('products').select('*').order('created_at', { ascending: false });
    if (error) { console.error('[products]', error); return []; }
    return data || [];
  },
  async create(product) {
    const sb = this._sb();
    if (!sb) throw new Error('Supabase no conectado');
    const row = this._row(product);
    if (!row.name) throw new Error('Nombre vacío');
    const { data, error } = await sb.from('products').insert(row).select().single();
    if (error) {
      console.error('[products.create]', error);
      throw new Error(error.message || JSON.stringify(error));
    }
    console.log('[Stiliza] Producto guardado en Supabase', data?.id);
    return data;
  },
  async update(id, patch) {
    const sb = this._sb();
    if (!sb) throw new Error('Supabase no conectado');
    const row = this._row({ ...patch });
    if (!patch.name && !patch.nombre) delete row.name;
    const { data, error } = await sb.from('products').update(row).eq('id', id).select().single();
    if (error) throw new Error(error.message || JSON.stringify(error));
    return data;
  },
  async remove(id) {
    const sb = this._sb();
    if (!sb) return;
    const { error } = await sb.from('products').delete().eq('id', id);
    if (error) console.error(error);
  },
  async toggleActive(id, isActive) {
    const sb = this._sb();
    if (!sb) return null;
    const { data, error } = await sb.from('products').update({ is_active: !!isActive }).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }
};
