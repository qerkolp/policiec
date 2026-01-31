import { Client } from 'pg';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).send('Method Not Allowed');
    }

    const data = request.body;

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
        return response.status(200).json({ message: 'OK' });

    } catch (err) {
        console.error(err);
        return response.status(500).json({ error: err.message });
    }
}