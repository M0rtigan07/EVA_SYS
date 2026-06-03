import { createClient } from "@libsql/client";

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});


await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT,
        eva_secret_id TEXT UNIQUE
    )
`);


export default async function handler(req, res) {
    // Si es POST, registramos
    if (req.method === 'POST') {
        const { nombre, eva_secret_id } = req.body;
        await db.execute({
            sql: "INSERT INTO usuarios (nombre, eva_secret_id) VALUES (?, ?)",
            args: [nombre, eva_secret_id]
        });
        return res.status(200).json({ success: true });
    }

    // Si es GET, verificamos
    if (req.method === 'GET') {
        const { eva_secret_id } = req.query;
        const result = await db.execute({
            sql: "SELECT nombre FROM usuarios WHERE eva_secret_id = ?",
            args: [eva_secret_id]
        });

        return res.status(200).json({ autorizado: result.rows.length > 0 });
    }
}