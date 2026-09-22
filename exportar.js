const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

var TRAMO_NOMBRES = {
  libertador: 'Corredor Libertador',
  alvear: 'Av. del Libertador / Alvear',
  santafe: 'Av. Santa Fe / Av. Callao',
  once: 'Once / Av. Pueyrredón',
  warnes: 'Av. Warnes / Áng. Gallardo',
  jbjusto: 'Av. Juan B. Justo',
  cierre: 'Cierre Juan B. Justo / Córdoba',
  arcos: 'Anexo Sanatorio Los Arcos',
  caballito: 'Anexo Caballito'
};

function tierFor(cuadras) {
  if (cuadras >= 10) return 'Platinum';
  if (cuadras >= 5) return 'Oro';
  if (cuadras >= 2) return 'Plata';
  return 'Cobre';
}

function csvCell(v) {
  var s = v === null || v === undefined ? '' : String(v);
  if (/[",\n]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Método no permitido.' });
  }

  var token = req.query && req.query.token;
  if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  const { data, error } = await supabase
    .from('donaciones')
    .select('created_at, nombre, apellido, anonimo, telefono, tramo_id, cuadras, metodo_pago, entrega, direccion, nota')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  var headers = [
    'Fecha', 'Nombre', 'Apellido', 'Teléfono', 'Anónimo en el muro',
    'Tramo', 'Cuadras', 'Nivel', 'Monto USD', 'Método de pago',
    'Entrega', 'Dirección', 'Nota'
  ];
  var rows = (data || []).map(function (d) {
    return [
      new Date(d.created_at).toLocaleString('es-AR'),
      d.nombre,
      d.apellido,
      d.telefono,
      d.anonimo ? 'Sí' : 'No',
      TRAMO_NOMBRES[d.tramo_id] || d.tramo_id,
      d.cuadras,
      tierFor(d.cuadras),
      d.cuadras * 500,
      d.metodo_pago,
      d.entrega === 'retiro' ? 'Pasan a retirar' : (d.entrega === 'menora' ? 'Acerca a Menora' : ''),
      d.direccion || '',
      d.nota || ''
    ];
  });

  var lines = [headers].concat(rows).map(function (r) { return r.map(csvCell).join(','); });
  var csv = '﻿' + lines.join('\r\n'); // BOM para que Excel detecte UTF-8 bien

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="donaciones-eruv-' + new Date().toISOString().slice(0,10) + '.csv"');
  return res.status(200).send(csv);
};
