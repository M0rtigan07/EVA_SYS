import { createClient } from "@libsql/client";



// Inicializar cliente (asegúrate de tener las variables en Vercel)
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});



export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { usuario, tipo, modo, fatiga, peso } = req.body;

  // Validación: Si faltan datos vitales, avisamos
  if (!tipo || !modo) {
    return res.status(400).json({ error: "Faltan tipo o modo de entrenamiento" });
  }

  try {
    // Aseguramos que Turso reciba los valores, incluso si son null
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