import { Client } from 'pg';
import bcrypt from 'bcryptjs';
import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    const { user, pass, discordId } = req.body;
    const TARGET_CHANNEL_ID = '1466917316322136136'; 

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });
    
    try {
        await client.connect();
        
        let oec = '';
        let isUnique = false;
        
        while (!isUnique) {
            oec = Math.floor(100000 + Math.random() * 900000).toString();
            const check = await client.query("SELECT id FROM pcr_users WHERE oec = $1", [oec]);
            if (check.rows.length === 0) isUnique = true;
        }

        const hash = await bcrypt.hash(pass, 10);
        const userRes = await client.query(
            "INSERT INTO pcr_users (username, password_hash, discord_id, status, oec) VALUES ($1, $2, $3, 'pending', $4) RETURNING id",
            [user, hash, discordId, oec]
        );
        const userId = userRes.rows[0].id;

        await client.end();

        const botToken = process.env.BOT_TOKEN;
        if (botToken) {
            const embed = {
                title: "Nová žádost o přijetí",
                color: 16776960,
                fields: [
                    { name: "Uchazeč", value: user, inline: true },
                    { name: "OEČ", value: oec, inline: true },
                    { name: "Discord ID", value: discordId, inline: false },
                    { name: "Stav", value: "⚠️ ČEKÁ NA SCHVÁLENÍ VELENÍM" }
                ],
                footer: { text: `User ID: ${userId}` }
            };

            const components = [{
                type: 1, 
                components: [
                    { type: 2, label: "SCHVÁLIT PŘIJETÍ", style: 3, custom_id: `approve_${userId}` },
                    { type: 2, label: "ZAMÍTNOUT", style: 4, custom_id: `deny_${userId}` }
                ]
            }];

            await fetch(`https://discord.com/api/v10/channels/${TARGET_CHANNEL_ID}/messages`, {
                method: 'POST',
                headers: { 'Authorization': `Bot ${botToken}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ embeds: [embed], components: components })
            });
        }

        return res.status(200).json({ message: 'Žádost odeslána.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Chyba serveru.' });
    }
}
