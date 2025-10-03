import { NextApiRequest, NextApiResponse } from 'next';

const TMDB_API_BASE_URL = 'https://api.themoviedb.org/3/';
const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const { path, query } = req.query;

  if (!TMDB_TOKEN) {
    console.error('TMDB_ACCESS_TOKEN is not set in environment variables.');
    return res.status(500).json({ 
        message: 'Server configuration error: TMDB_ACCESS_TOKEN is missing.' 
    });
  }

  if (typeof path !== 'string') {
    return res.status(400).json({ message: 'Missing or invalid "path" query parameter.' });
  }

  const tmdbUrl = new URL(path, TMDB_API_BASE_URL);

  if (query && typeof query === 'string') {
    tmdbUrl.searchParams.set('query', query);
  }
  
  tmdbUrl.searchParams.set('language', 'en-US');
  tmdbUrl.searchParams.set('page', '1');
  tmdbUrl.searchParams.set('include_adult', 'false');

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
