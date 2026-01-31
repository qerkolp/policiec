import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Zase pojistka pro různé názvy proměnných
    const user = req.body.user || req.body.username;
    const pass = req.body.pass || req.body.password;
    
    if (!user || !pass) {
        return res.status(400).json({ error: 'Vyplňte jméno a heslo' });
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();

        // ZMĚNA: Používáme ILIKE nebo LOWER() pro ignorování velikosti písmen
        // Trim() odstraní mezery na začátku a konci, kdyby tam nějaké byly
        const result = await client.query('SELECT * FROM pcr_users WHERE LOWER(username) = LOWER($1)', [user.trim()]);

        if (result.rows.length === 0) {
            await client.end();
            // Pro jistotu zalogujeme do Vercelu, co jsme hledali (pomůže při ladění)
            console.log(`Login failed: User '${user}' not found in DB.`);
            return res.status(401).json({ error: 'Uživatel nenalezen' });
        }

        const dbUser = result.rows[0];

        const match = await bcrypt.compare(pass, dbUser.password_hash);
        if (!match) {
            await client.end();
            return res.status(401).json({ error: 'Špatné heslo' });
        }

        if (dbUser.status === 'pending') {
            await client.end();
            return res.status(403).json({ status: 'pending', error: 'Účet nebyl schválen' });
        }

        const rolesResult = await client.query(`
            SELECT r.role_name 
            FROM pcr_user_roles ur 
            JOIN pcr_roles r ON ur.role_id = r.id 
            WHERE ur.user_id = $1
        `, [dbUser.id]);
        
        const roles = rolesResult.rows.map(row => row.role_name);

        await client.end();

        return res.status(200).json({
            id: dbUser.id,
            username: dbUser.username,
            oec: dbUser.oec,
            roles: roles
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: 'Chyba databáze' });
    }
}
