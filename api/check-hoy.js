// api/check-hoy.js
import { createClient } from "@libsql/client";
const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

export default async function handler(req, res) {
    const { usuario, fecha } = req.query; // Ejemplo fecha: "2026-06-11"

    // Buscamos si existe algún registro del usuario que empiece por la fecha de hoy
    const result = await db.execute({
        sql: "SELECT COUNT(*) as cuenta FROM historial_entrenamientos WHERE usuario = ? AND fecha LIKE ?",
        args: [usuario, `${fecha}%`]
    });

    return res.status(200).json({ yaEntreno: result.rows[0].cuenta > 0 });
}