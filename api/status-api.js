import { Client } from 'pg';

export default async function handler(req, res) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    await client.connect();

    try {
        if (req.method === 'POST') {
            const { userId, status, callName, callNum } = req.body;

            await client.query(`
                UPDATE pcr_users 
                SET current_status = $1, callsign_name = $2, callsign_number = $3, last_update = NOW()
                WHERE id = $4
            `, [status, callName, callNum, userId]);

            await client.end();
            return res.status(200).json({ message: 'OK' });
        }

        if (req.method === 'GET') {
            const result = await client.query(`
                SELECT username, callsign_name, callsign_number, current_status 
                FROM pcr_users 
                WHERE current_status != 'offline' AND current_status IS NOT NULL
                ORDER BY callsign_name, callsign_number
            `);

            await client.end();
            return res.status(200).json(result.rows);
        }

        return res.status(405).json({ error: 'Method not allowed' });

    } catch (err) {
        await client.end();
        return res.status(500).json({ error: err.message });
    }
}
