const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

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
    .select('id, created_at, nombre, apellido, anonimo, telefono, tramo_id, cuadras, metodo_pago, entrega, direccion, nota')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });

  return res.status(200).json({ donaciones: data || [] });
};
