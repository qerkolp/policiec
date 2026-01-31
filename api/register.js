import { Client } from 'pg';
import bcrypt from 'bcryptjs';

export default async function handler(req, res) {
    // 1. ZJISTÍME, CO PŘIŠLO
    let body = req.body;
    
    // Pokud je to string (text), zkusíme z toho udělat JSON
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
    }

    // 2. VYTÁHNEME DATA (pokud existují)
    // Ošetřujeme null/undefined, aby server nespadl
    const data = body || {}; 
    const user = data.user || data.username || data.login;
    const pass = data.pass || data.password || data.heslo;
    const discordId = data.discordId || data.discord;

    // 3. SMRTÍCÍ DIAGNOSTIKA
    // Pokud chybí heslo, okamžitě vracíme chybu s výpisem toho, co přišlo.
    if (!pass) {
        return res.status(400).json({
            ERROR: "CRITICAL_FAILURE: Server nedostal heslo.",
            RECEIVED_DATA: data,  // Tady uvidíš, jestli přišlo {} nebo null
            RECEIVED_TYPE: typeof req.body
        });
    }

    // Pokud heslo máme, pokračujeme dál...
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        
        // Generace OEČ
        let oec = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Hash hesla (teď už bezpečně, protože pass existuje)
        const hash = await bcrypt.hash(pass, 10);
        
        const userRes = await client.query(
            "INSERT INTO pcr_users (username, password_hash, discord_id, status, oec) VALUES ($1, $2, $3, 'pending', $4) RETURNING id",
            [user, hash, discordId, oec]
        );
        
        await client.end();
        return res.status(200).json({ message: 'OK - Uživatel vytvořen', id: userRes.rows[0].id });

    } catch (err) {
        return res.status(500).json({ error: 'DB_ERROR: ' + err.message });
    }
}
