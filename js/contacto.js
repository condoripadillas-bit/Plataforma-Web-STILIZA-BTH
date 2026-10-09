document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('formContacto')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('contactoNombre')?.value.trim()
      || document.getElementById('nombre')?.value.trim() || '';
    const email = document.getElementById('contactoEmail')?.value.trim()
      || document.getElementById('email')?.value.trim() || '';
    const mensaje = document.getElementById('contactoMensaje')?.value.trim()
      || document.getElementById('mensaje')?.value.trim() || '';

    if (!nombre || !email || !mensaje) {
      if (typeof mostrarToast === 'function') mostrarToast('Completa nombre, correo y mensaje', 'warn');
      return;
    }

    try {
      const list = JSON.parse(localStorage.getItem('stiliza_mensajes') || '[]');
      list.push({ id: 'm' + Date.now(), name: nombre, email, message: mensaje, fecha: new Date().toISOString() });
      localStorage.setItem('stiliza_mensajes', JSON.stringify(list));
    } catch (_) {}

    let okDb = false;
    try {
      if (window.StilizaMessages?.create) {
        await window.StilizaMessages.create({ name: nombre, email, message: mensaje });
        okDb = true;
      }
    } catch (err) {
      console.error('[contacto]', err);
    }

    const texto = encodeURIComponent(`*Mensaje Stiliza*\nNombre: ${nombre}\nEmail: ${email}\n\n${mensaje}`);
    window.open(`https://wa.me/59174954029?text=${texto}`, '_blank');
    e.target.reset();
    if (typeof mostrarToast === 'function') {
      mostrarToast(okDb ? 'Mensaje enviado y guardado' : 'Mensaje enviado');
    }
  });
});
