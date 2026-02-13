
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

async function main() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
        console.error('No GEMINI_API_KEY found');
        return;
    }
    console.log('Using key ending in:', key.slice(-4));

    try {
        // Try raw REST API first to list models, as it's most reliable for debugging
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
        const data = await response.json();

        console.log('--- REST API Models (v1beta) ---');
        if (data.models) {
            data.models.forEach((m: any) => {
                console.log(`- ${m.name} (${m.supportedGenerationMethods?.join(', ')})`);
            });
        } else {
            console.log('No specific models found or error:', data);
        }

    } catch (e) {
        console.error('REST API Error:', e);
    }
}

main();
