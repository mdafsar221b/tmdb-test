// src/pages/api/tmdb-proxy.ts

import { NextApiRequest, NextApiResponse } from 'next';

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3/';
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Destructure 'path' and capture all other potential query params with 'rest'
  const { path, ...rest } = req.query;

  if (!TMDB_TOKEN) {
    console.error('TMDB_ACCESS_TOKEN is not set in environment variables.');
    return res.status(500).json({ 
        message: 'Server configuration error: TMDB_ACCESS_TOKEN is missing.' 
    });
  }

  if (typeof path !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid "path" query parameter.' });
  }

  // Initialize the TMDB URL with the base path
  const tmdbUrl = new URL(path, TMDB_API_BASE_URL);

  // Add standard parameters
  tmdbUrl.searchParams.set('language', 'en-US');
  tmdbUrl.searchParams.set('page', '1');
  tmdbUrl.searchParams.set('include_adult', 'false');

  // Dynamically add all incoming query parameters (from the AI parser)
  Object.entries(rest).forEach(([key, value]) => {
      // Ensure the key is a string and value is either string or string array (we take the first)
      if (typeof key === 'string' && value) {
          const finalValue = Array.isArray(value) ? value[0] : String(value);
          tmdbUrl.searchParams.set(key, finalValue);
      }
  });

  try {
    const tmdbResponse = await fetch(tmdbUrl.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${TMDB_TOKEN}`,
        'accept': 'application/json',
      },
    });

    const data = await tmdbResponse.json();

    if (!tmdbResponse.ok) {
      console.error('TMDB API Error:', data);
      return res.status(tmdbResponse.status).json({ 
        message: `TMDB API failed with status ${tmdbResponse.status}.`, 
        details: data 
      });
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('Proxy Fetch Error:', error);
    res.status(500).json({ message: 'Server network error when connecting to TMDB.' });
  }
}