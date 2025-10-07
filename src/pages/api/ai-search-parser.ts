// src/pages/api/ai-search-parser.ts

import { NextApiRequest, NextApiResponse } from 'next';
// Using GoogleGenAI as suggested, assuming it's installed
import { GoogleGenAI } from '@google/genai'; 

// Define the shape of the AI-generated structured search query
interface AISearchResult {
    path: string;
    params: {
        query?: string;
        with_genres?: string; // TMDB Genre ID, e.g., '878' for Sci-Fi
        'vote_average.gte'?: string; // Minimum rating, e.g., '7.5'
        'primary_release_year'?: string; // Specific year, e.g., '2024'
        sort_by?: string; // e.g., 'vote_count.desc'
        [key: string]: string | undefined; 
    };
}

const AI_API_KEY = process.env.AI_API_KEY;

// Mock implementation as fallback if the AI key is missing or for local testing
function mockLLM_Parse(searchTerm: string): AISearchResult {
    searchTerm = searchTerm.toLowerCase().trim();

    if (searchTerm.includes('mind-bending') || searchTerm.includes('sci-fi')) {
        return {
            path: 'discover/movie',
            params: {
                with_genres: '878', // Science Fiction
                'vote_average.gte': '7.5',
            }
        };
    } else if (searchTerm.includes('best of 2024') || searchTerm.includes('newest hits')) {
        return {
            path: 'discover/movie',
            params: {
                'vote_average.gte': '7',
                'primary_release_year': '2024',
            }
        };
    } else if (searchTerm.includes('best') || searchTerm.includes('top rated')) {
        return {
            path: 'discover/movie',
            params: {
                'vote_average.gte': '8.5',
                sort_by: 'vote_count.desc' 
            }
        };
    } 
    
    // Fallback to basic text search
    return {
        path: 'search/movie',
        params: {
            query: searchTerm,
        }
    };
}

// Actual LLM implementation using Gemini
async function realLLM_Parse(searchTerm: string): Promise<AISearchResult> {
    if (!AI_API_KEY) {
        console.warn("AI_API_KEY is not set. Falling back to mock parser.");
        return mockLLM_Parse(searchTerm);
    }
    
    const aiClient = new GoogleGenAI({ apiKey: AI_API_KEY });
    
    // Schema definition for reliable JSON output from the LLM
    const structuredOutputSchema = {
        type: 'OBJECT',
        properties: {
            path: {
                type: 'STRING',
                description: "The TMDB API path. Use 'search/movie' for simple keyword search or 'discover/movie' for filters (rating, year, genre)."
            },
            params: {
                type: 'OBJECT',
                description: "A dictionary of TMDB query parameters.",
                properties: {
                    query: { type: 'STRING', description: 'The movie title or keyword for search/movie. Omit if path is discover/movie.' },
                    'vote_average.gte': { type: 'STRING', description: 'Minimum rating filter (e.g., 7.5)' },
                    'primary_release_year': { type: 'STRING', description: 'Filter by release year (e.g., 2024)' },
                    with_genres: { type: 'STRING', description: 'TMDB Genre ID (e.g., 878 for Science Fiction). Only include the most relevant genre ID.' },
                    sort_by: { type: 'STRING', description: "Sort criteria, e.g., 'vote_count.desc' for best." }
                }
            }
        }
    } as const;

    const prompt = `
        Analyze the user's movie search query: "${searchTerm}".
        Translate the intent into structured JSON parameters for The Movie Database (TMDB) API.
        
        - Use "search/movie" only for direct title or actor searches.
        - Use "discover/movie" for any query involving filters like genre, rating, or year.
        - Only include parameters explicitly implied by the query. Ensure string values for rating and year.
        
        Respond STRICTLY with a single JSON object that conforms to the provided schema. 
    `;

    try {
        const response = await aiClient.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { 
                responseMimeType: "application/json",
                responseSchema: structuredOutputSchema,
                temperature: 0.1 
            }
        });

        // ⚠️ FIX: Check if response.text is defined before parsing.
        if (!response.text) {
             throw new Error("Gemini API failed to return structured text content, possibly due to a safety block or internal error.");
        }

        const parsedResult = JSON.parse(response.text.trim());
        
        // Final sanity check
        if (typeof parsedResult.path !== 'string' || typeof parsedResult.params !== 'object') {
            throw new Error("AI response structure is invalid.");
        }
        
        return parsedResult as AISearchResult;

    } catch (e) {
        console.error("Error calling Gemini API:", e);
        // Fallback to simple search on external API failure
        return {
            path: 'search/movie',
            params: { query: searchTerm }
        };
    }
}

export default async function handler(
  req: NextApiRequest, 
  res: NextApiResponse<AISearchResult | { message: string }>
) {
    if (req.method !== 'GET') {
        return res.status(405).json({ message: 'Method Not Allowed' });
    }

    const { searchTerm } = req.query;

    if (typeof searchTerm !== 'string' || !searchTerm.trim()) {
        return res.status(400).json({ message: 'Missing or invalid "searchTerm" query parameter.' });
    }

    try {
        const result = await realLLM_Parse(searchTerm); 
        res.status(200).json(result);
    } catch (error) {
        // Handle errors caught from realLLM_Parse, including key issues and bad structure
        console.error('AI Search Parser Error:', error);
        res.status(500).json({ message: `AI query processing failed: ${error instanceof Error ? error.message : 'Unknown error.'}` });
    }
}