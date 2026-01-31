import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export default async function handler(request, response) {
    // Vercel automaticky parsuje JSON body, takže nemusíme dělat JSON.parse()
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const { user, pass } = request.body;

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // Najdeme uživatele
        const result = await client.query('SELECT * FROM pcr_users WHERE username = $1', [user]);

        if (result.rows.length === 0) {
            await client.end();
            return response.status(401).json({ error: 'Uživatel nenalezen' });
        }

        const dbUser = result.rows[0];

        // Ověření hesla
        const match = await bcrypt.compare(pass, dbUser.password_hash);
        if (!match) {
            await client.end();
            return response.status(401).json({ error: 'Špatné heslo' });
        }

        // --- HLAVNÍ KONTROLA STAVU (PENDING) ---
        if (dbUser.status === 'pending') {
            await client.end();
            return response.status(403).json({ status: 'pending', error: 'Účet nebyl schválen' });
        }
        // ---------------------------------------

        // Načtení rolí pro schválené
        const rolesResult = await client.query(`
            SELECT r.role_name 
            FROM pcr_user_roles ur 
            JOIN pcr_roles r ON ur.role_id = r.id 
            WHERE ur.user_id = $1
        `, [dbUser.id]);

        const roles = rolesResult.rows.map(row => row.role_name);

        await client.end();

        // Úspěch - vracíme data
        return response.status(200).json({
            id: dbUser.id,
            username: dbUser.username,
            oec: dbUser.oec,
            roles: roles
        });

    } catch (error) {
        console.error(error);
        return response.status(500).json({ error: 'Chyba databáze' });
    }
}