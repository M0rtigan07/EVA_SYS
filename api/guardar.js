import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  try {
    // 1. Aseguramos la existencia de la tabla y sus columnas
    await db.execute(`
      CREATE TABLE IF NOT EXISTS historial_entrenamientos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT,
        tipo TEXT,
        modo TEXT,
        fatiga INTEGER,
        peso REAL,
        fecha TEXT
      )
    `);

    // 2. Insertamos el registro
    const { usuario, tipo, modo, fatiga, peso } = req.body;
    await db.execute({
      sql: `INSERT INTO historial_entrenamientos (usuario, tipo, modo, fatiga, peso, fecha) VALUES (?, ?, ?, ?, ?, ?)`,
      args: [usuario || 'Anonimo', tipo, modo, fatiga || 0, peso || 0, new Date().toISOString()]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error en DB:", error);
    return res.status(500).json({ error: "Fallo en la base de datos" });
  }
}