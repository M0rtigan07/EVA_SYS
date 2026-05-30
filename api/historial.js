import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  // Solo permitimos GET para recuperar datos
  if (req.method !== 'GET') return res.status(405).end();

  const { usuario } = req.query; 

  try {
    const result = await db.execute({
      sql: `SELECT * FROM historial_entrenamientos WHERE usuario = ? ORDER BY fecha DESC`,
      args: [usuario || 'Anonimo']
    });
    return res.status(200).json(result.rows);
  } catch (error) {
    return res.status(500).json({ error: "Fallo al recuperar historial" });
  }
}