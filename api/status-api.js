import { Client } from 'pg';

export default async function handler(request, response) {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    await client.connect();

    try {
        // A) POST - ULOŽENÍ STATUSU
        if (request.method === 'POST') {
            const { userId, status, callName, callNum } = request.body;

            await client.query(`
                UPDATE pcr_users 
                SET current_status = $1, callsign_name = $2, callsign_number = $3, last_update = NOW()
                WHERE id = $4
            `, [status, callName, callNum, userId]);

            await client.end();
            return response.status(200).json({ message: 'OK' });
        }

        // B) GET - NAČTENÍ JEDNOTEK
        if (request.method === 'GET') {
            const res = await client.query(`
                SELECT username, callsign_name, callsign_number, current_status 
                FROM pcr_users 
                WHERE current_status != 'offline' AND current_status IS NOT NULL
                ORDER BY callsign_name, callsign_number
            `);

            await client.end();
            return response.status(200).json(res.rows);
        }

        // Pokud metoda není ani GET, ani POST
        return response.status(405).send('Method Not Allowed');

    } catch (err) {
        await client.end();
        return response.status(500).json({ error: err.message });
    }
}