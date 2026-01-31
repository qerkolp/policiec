import { Client } from 'pg';

export default async function handler(request, response) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
        // A) GET - NAČÍST UŽIVATELE
        if (request.method === 'GET') {
            const usersRes = await client.query(`
                SELECT u.id, u.username, u.discord_id, string_agg(r.role_name, ',') as roles
                FROM pcr_users u
                LEFT JOIN pcr_user_roles ur ON u.id = ur.user_id
                LEFT JOIN pcr_roles r ON ur.role_id = r.id
                GROUP BY u.id, u.username, u.discord_id
                ORDER BY u.id ASC
            `);

            const rolesRes = await client.query("SELECT id, role_name FROM pcr_roles ORDER BY category, role_name");

            await client.end();
            return response.status(200).json({
                users: usersRes.rows,
                allRoles: rolesRes.rows
            });
        }

        // B) POST - ULOŽIT ROLE
        if (request.method === 'POST') {
            const { userId, roleIds } = request.body;

            // Smazat staré role
            await client.query("DELETE FROM pcr_user_roles WHERE user_id = $1", [userId]);

            // Vložit nové
            if (roleIds && roleIds.length > 0) {
                for (const rId of roleIds) {
                    await client.query("INSERT INTO pcr_user_roles (user_id, role_id) VALUES ($1, $2)", [userId, rId]);
                }
            }

            await client.end();
            return response.status(200).json({ message: 'Saved' });
        }

        return response.status(405).send('Method Not Allowed');

    } catch (err) {
        console.error(err);
        await client.end();
        return response.status(500).json({ error: err.message });
    }
}