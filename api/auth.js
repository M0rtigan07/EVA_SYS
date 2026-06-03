import { createClient } from "@libsql/client";

const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
});


export default async function handler(req, res) {
    // 1. Validamos que solo aceptamos POST o GET
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).end();
    }

    try {
        // Aseguramos la existencia de la tabla
        await db.execute(`
            CREATE TABLE IF NOT EXISTS usuarios (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT UNIQUE,
                eva_secret_id TEXT UNIQUE
            )
        `);

        // 2. Si es POST, registramos
        if (req.method === 'POST') {
            const { nombre, eva_secret_id } = req.body;

            // Verificamos si el usuario ya existe
            const existe = await db.execute({
                sql: "SELECT * FROM usuarios WHERE nombre = ?",
                args: [nombre]
            });

            if (existe.rows.length > 0) {
                return res.status(409).json({ error: "El usuario ya existe. Usa tu archivo de backup." });
            }

            await db.execute({
                sql: "INSERT INTO usuarios (nombre, eva_secret_id) VALUES (?, ?)",
                args: [nombre, eva_secret_id]
            });
            return res.status(200).json({ success: true });
        }

        // Dentro de tu handler GET en api/auth.js
        if (req.method === 'GET') {
            const { nombre, eva_secret_id } = req.query;

            // Si solo viene nombre, estamos comprobando si existe (para el primer alert)
            if (nombre && !eva_secret_id) {
                const result = await db.execute({
                    sql: "SELECT eva_secret_id FROM usuarios WHERE nombre = ?",
                    args: [nombre]
                });
                return res.status(200).json({ id_encontrado: result.rows.length > 0 });
            }

            // Si vienen ambos, estamos validando el backup (la carga del archivo)
            if (nombre && eva_secret_id) {
                const result = await db.execute({
                    sql: "SELECT * FROM usuarios WHERE nombre = ? AND eva_secret_id = ?",
                    args: [nombre, eva_secret_id]
                });
                return res.status(200).json({ autorizado: result.rows.length > 0 });
            }
        }


    } catch (error) {
        console.error("Error en DB:", error);
        return res.status(500).json({ error: "Fallo en la base de datos" });
    }
}

