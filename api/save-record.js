import { Client } from 'pg';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const data = req.body;
    
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await client.connect();
        await client.query(
            "INSERT INTO police_records (case_number, suspect_name, legal_qualification, description, officer_name) VALUES ($1, $2, $3, $4, $5)",
            [data.case_number, data.suspect, data.law, data.description, data.officer]
        );
        await client.end();
        return res.status(200).json({ message: 'OK' });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
