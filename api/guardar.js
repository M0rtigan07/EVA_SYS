import { createClient } from "@libsql/client";

export default async function handler(req, res) {
  // 1. Seguridad: Solo permitimos peticiones POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: "Método no permitido" });
  }

  // 2. Conexión a Turso (usando variables de entorno de Vercel)
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  try {
    const { usuario, tipo, modo, fatiga, peso} = req.body;

    // Validación básica: aseguramos que vienen los datos necesarios
    if (!tipo || !modo ) {
      return res.status(400).json({ error: "Datos incompletos" });
    }

    // 3. Inserción segura en la base de datos
    await db.execute({
      sql: `INSERT INTO historial_entrenamientos (usuario, tipo, modo, fatiga, peso, fecha) 
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [usuario, tipo, modo || 0, new Date().toISOString()]
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error en DB:", error);
    return res.status(500).json({ error: "Error al guardar en base de datos" });
  }
}