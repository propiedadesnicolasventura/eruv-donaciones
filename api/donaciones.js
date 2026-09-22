const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Cuadras totales por tramo del recorrido (deben coincidir con las del frontend).
const TRAMOS = {
  libertador: 25,
  alvear: 20,
  santafe: 15,
  once: 15,
  warnes: 25,
  jbjusto: 30,
  cierre: 10,
  arcos: 20,
  caballito: 40
};

function tierFor(cuadras) {
  if (cuadras >= 10) return 'platinum';
  if (cuadras >= 5) return 'oro';
  if (cuadras >= 2) return 'plata';
  return 'cobre';
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('donaciones')
      .select('id, created_at, nombre, apellido, anonimo, tramo_id, cuadras, nota')
      .order('created_at', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Público: nunca exponemos teléfono, dirección ni forma de entrega/pago.
    const publicas = (data || []).map(function (d) {
      return {
        id: d.id,
        nombre: d.anonimo ? null : (d.nombre + ' ' + d.apellido).trim(),
        cuadras: d.cuadras,
        tramoId: d.tramo_id,
        nota: d.nota || null,
        tier: tierFor(d.cuadras),
        fecha: d.created_at
      };
    });

    return res.status(200).json({ donaciones: publicas });
  }

  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch (e) { body = {}; }
    }
    body = body || {};

    var nombre = body.nombre;
    var apellido = body.apellido;
    var anonimo = !!body.anonimo;
    var telefono = body.telefono;
    var tramoId = body.tramoId;
    var cuadras = parseInt(body.cuadras, 10);
    var metodoPago = body.metodoPago;
    var entrega = body.entrega;
    var direccion = body.direccion;
    var nota = body.nota;

    if (!nombre || !String(nombre).trim()) {
      return res.status(400).json({ error: 'Falta el nombre.' });
    }
    if (!apellido || !String(apellido).trim()) {
      return res.status(400).json({ error: 'Falta el apellido.' });
    }
    if (!telefono || !String(telefono).trim()) {
      return res.status(400).json({ error: 'Falta el número de teléfono.' });
    }
    if (!TRAMOS.hasOwnProperty(tramoId)) {
      return res.status(400).json({ error: 'Tramo inválido.' });
    }
    if (!Number.isInteger(cuadras) || cuadras < 1 || cuadras > 200) {
      return res.status(400).json({ error: 'Cantidad de cuadras inválida.' });
    }
    if (metodoPago !== 'Efectivo' && metodoPago !== 'Transferencia') {
      return res.status(400).json({ error: 'Método de pago inválido.' });
    }
    if (metodoPago === 'Efectivo') {
      if (entrega !== 'retiro' && entrega !== 'menora') {
        return res.status(400).json({ error: 'Elegí cómo coordinar la entrega del efectivo.' });
      }
      if (entrega === 'retiro' && (!direccion || !String(direccion).trim())) {
        return res.status(400).json({ error: 'Falta la dirección para retirar el efectivo.' });
      }
    } else {
      entrega = null;
      direccion = null;
    }

    // Chequeo de cupo del tramo (no es atómico ante envíos simultáneos, pero
    // evita el caso común de pasarse del total del tramo).
    var existentes = await supabase.from('donaciones').select('cuadras').eq('tramo_id', tramoId);
    if (existentes.error) return res.status(500).json({ error: existentes.error.message });
    var yaDonadas = (existentes.data || []).reduce(function (s, d) { return s + d.cuadras; }, 0);
    if (yaDonadas + cuadras > TRAMOS[tramoId]) {
      return res.status(409).json({ error: 'Ese tramo no tiene tantas cuadras disponibles. Elegí otro tramo o una cantidad menor.' });
    }

    var insert = await supabase.from('donaciones').insert({
      nombre: String(nombre).trim().slice(0, 80),
      apellido: String(apellido).trim().slice(0, 80),
      anonimo: anonimo,
      telefono: String(telefono).trim().slice(0, 40),
      tramo_id: tramoId,
      cuadras: cuadras,
      metodo_pago: metodoPago,
      entrega: entrega,
      direccion: direccion ? String(direccion).trim().slice(0, 300) : null,
      nota: nota ? String(nota).trim().slice(0, 200) : null
    }).select().single();

    if (insert.error) return res.status(500).json({ error: insert.error.message });

    return res.status(200).json({ ok: true, tier: tierFor(cuadras) });
  }

  res.setHeader('Allow', 'GET, POST');
  return res.status(405).json({ error: 'Método no permitido.' });
};
