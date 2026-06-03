import { createClient } from "@libsql/client";

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});

export default async function handler(req, res) {
    const { usuario } = req.query;
    const hoy = new Date().toISOString().split('T')[0]; // Formato YYYY-MM-DD

    try {
        const resultado = await db.execute({
            sql: "SELECT * FROM historial_entrenamientos WHERE usuario = ? AND fecha LIKE ?",
            args: [usuario, `${hoy}%`] // El % busca cualquier hora del día
        });

        res.status(200).json({ yaEntreno: resultado.rows.length > 0 });
    } catch (error) {
        res.status(500).json({ error: "Error consultando historial" });
    }
}