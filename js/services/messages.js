window.StilizaMessages = {
  _sb() {
    return window.StilizaDB?.sb || (typeof window.getSupabase === 'function' ? window.getSupabase() : null);
  },
  async create({ name, email, message }) {
    const sb = this._sb();
    if (!sb) throw new Error('Supabase no conectado');
    const { data, error } = await sb.from('contact_messages').insert({
      name: String(name || '').trim(),
      email: String(email || '').trim(),
      message: String(message || '').trim()
    }).select().single();
    if (error) {
      console.error('[messages]', error);
      throw new Error(error.message || JSON.stringify(error));
    }
    return data;
  },
  async list() {
    const sb = this._sb();
    if (!sb) return [];
    const { data, error } = await sb.from('contact_messages').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
  }
};
