// src/app/page.tsx

"use client";

import React, { useState, useEffect, useCallback } from 'react';

const SearchIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const TrendingUpIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    {...props}
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
    <polyline points="16 7 22 7 22 13" />
  </svg>
);

interface Movie {
  id: number;
  title: string;
  poster_path: string | null;
  overview: string;
  release_date: string;
  vote_average: number;
}

type MovieList = Movie[];
type Status = 'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR';

// Define the shape of the structured query used for the proxy
interface TmdbQueryParams {
  path: string;
  query?: string;
  with_genres?: string;
  'vote_average.gte'?: string;
  'primary_release_year'?: string;
  sort_by?: string;
  // Removed [key: string]: string | undefined; to fix the overwrite warning
}

const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/';
const POSTER_SIZE = 'w342';

const MovieCard: React.FC<{ movie: Movie }> = ({ movie }) => {
  const posterPath = movie.poster_path;
  const posterUrl = posterPath
    ? `${IMAGE_BASE_URL}${POSTER_SIZE}${posterPath}`
    : `https://placehold.co/342x513/1e293b/cbd5e1?text=Poster+Missing`;

  const ratingColor = movie.vote_average >= 7 ? 'bg-green-500' : 'bg-amber-500';

  return (
    <div className="bg-slate-800 rounded-xl shadow-xl overflow-hidden transform transition duration-300 hover:scale-[1.03] hover:shadow-2xl flex flex-col">
      {posterPath ? (
        <img
          src={posterUrl}
          alt={movie.title}
          className="w-full object-cover aspect-[2/3]"
          loading="lazy"
        />
      ) : (
        <div className="w-full aspect-[2/3] flex items-center justify-center bg-slate-700 text-slate-400 text-center p-4">
          Poster Unavailable
        </div>
      )}
      
      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-xl font-bold text-white mb-2 line-clamp-2">
          {movie.title}
        </h3>
        
        <div className="flex justify-between items-center text-sm text-slate-400 mb-3">
          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${ratingColor} text-white shadow-md`}>
            ⭐ {movie.vote_average.toFixed(1)}
          </span>
          <span className="text-sm font-medium">
            {movie.release_date ? new Date(movie.release_date).getFullYear() : 'N/A'}
          </span>
        </div>

        <p className="text-slate-300 text-sm flex-grow line-clamp-3">
          {movie.overview || 'No overview available.'}
        </p>
      </div>
    </div>
  );
};

const TmdbProxyTester: React.FC = () => {
  const [popularMovies, setPopularMovies] = useState<MovieList>([]);
  const [trendingMovies, setTrendingMovies] = useState<MovieList>([]);
  const [searchResults, setSearchResults] = useState<MovieList>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchIntent, setSearchIntent] = useState<string>(''); 
  
  const [popularStatus, setPopularStatus] = useState<Status>('IDLE');
  const [trendingStatus, setTrendingStatus] = useState<Status>('IDLE');
  const [searchStatus, setSearchStatus] = useState<Status>('IDLE');
  
  const [popularError, setPopularError] = useState<string | null>(null);
  const [trendingError, setTrendingError] = useState<string | null>(null); 
  const [searchError, setSearchError] = useState<string | null>(null);

  const fetchProxy = useCallback(async (params: TmdbQueryParams) => {
    // Manually construct the query string from the params object
    const urlParams = new URLSearchParams();
    
    // Add path and all other parameters to the URLSearchParams object
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        urlParams.set(key, String(value));
      }
    });

    if (!params.path) {
        throw new Error("Proxy call is missing 'path' parameter.");
    }

    // Pass all parameters to the single tmdb-proxy endpoint
    const url = `/api/tmdb-proxy?${urlParams.toString()}`;

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch data via proxy.');
    }
    
    return data.results && Array.isArray(data.results) ? data.results : [];
  }, []);

  // Fetch Popular Movies
  useEffect(() => {
    setPopularStatus('LOADING');
    fetchProxy({ path: 'movie/popular' })
      .then((results: MovieList) => {
        setPopularMovies(results.slice(0, 10));
        setPopularStatus('SUCCESS');
        setPopularError(null);
      })
      .catch((error) => {
        console.error('Error fetching popular movies:', error);
        setPopularStatus('ERROR');
        setPopularError(error instanceof Error ? error.message : 'An unknown error occurred.');
      });
  }, [fetchProxy]);
  
  // Fetch Trending Movies
  useEffect(() => {
    setTrendingStatus('LOADING');
    fetchProxy({ path: 'trending/movie/day' })
      .then((results: MovieList) => {
        setTrendingMovies(results.slice(0, 10));
        setTrendingStatus('SUCCESS');
        setTrendingError(null);
      })
      .catch((error) => {
        console.error('Error fetching trending movies:', error);
        setTrendingStatus('ERROR');
        setTrendingError(error instanceof Error ? error.message : 'An unknown error occurred.');
      });
  }, [fetchProxy]);

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedSearchTerm = searchTerm.trim();
    
    if (!trimmedSearchTerm) {
      setSearchResults([]);
      setSearchStatus('IDLE');
      setSearchIntent('');
      return;
    }

    setSearchResults([]);
    setSearchStatus('LOADING');
    setSearchError(null);
    setSearchIntent(`AI processing: "${trimmedSearchTerm}"...`);

    try {
      // 1. AI STEP: Call the AI parser to convert text into structured parameters
      const parserUrl = `/api/ai-search-parser?searchTerm=${encodeURIComponent(trimmedSearchTerm)}`;
      const parserResponse = await fetch(parserUrl);
      const parsedData = await parserResponse.json();
      
      if (!parserResponse.ok) {
        // AI parser failed (e.g., bad server config, malformed JSON from LLM)
        throw new Error(parsedData.message || 'Failed to parse query via AI service.');
      }
      
      // Destructure and type-check the AI's output
      // Note: TmdbQueryParams['params'] is not directly accessible here, using object structure
      const { path, params }: { path: string, params: { [key: string]: string | undefined } } = parsedData;
      
      if (typeof path !== 'string' || typeof params !== 'object') {
          throw new Error('AI parser returned invalid format.');
      }
      
      // Update the intent based on the AI's decision
      const filterKeys = Object.keys(params).filter(k => k !== 'query' && params[k]).join(', ');
      const searchType = path === 'discover/movie' ? 'Semantic' : 'Text';
      const detail = filterKeys.length > 0 ? `Filtering /${path} using [${filterKeys.toUpperCase()}]` : (params.query ? `Querying /${path} with "${params.query}"` : `Broad Search...`);
      
      setSearchIntent(`AI ${searchType} Search: ${detail}`);

      // 2. PROXY STEP: Call the TMDB proxy with the AI-generated structured request
      // This is the object construction that caused the warning, now safe due to interface change.
      const tmdbParams: TmdbQueryParams = { path, ...params }; 
      const results: MovieList = await fetchProxy(tmdbParams);
      
      setSearchResults(results);
      setSearchStatus('SUCCESS');
    } catch (error) {
      console.error('Error during semantic search:', error);
      setSearchStatus('ERROR');
      setSearchError(error instanceof Error ? error.message : 'An unknown error occurred during search.');
    }
  }, [searchTerm, fetchProxy]);

  const renderContent = (status: Status, error: string | null, data: MovieList, title: string) => {
    let content;
    let icon;

    if (status === 'LOADING') {
      content = <div className="text-center text-slate-400 p-8">Loading movies...</div>;
    } else if (status === 'ERROR') {
      content = (
        <div className="bg-red-900/50 border border-red-700 text-white p-6 rounded-xl shadow-inner my-4">
          <p className="font-bold text-lg mb-2">Proxy Error / Access Issue</p>
          <p className="text-sm">
            This means the server (where this app is deployed) could not connect to TMDB or your token is invalid. 
            **If searching is failing, also check your AI\_API\_KEY in the environment variables and ensure the SDK is installed.**
          </p>
          <p className="mt-3 text-red-300 font-mono text-xs break-all">
            {error || 'Unknown network error.'}
          </p>
        </div>
      );
    } else if (status === 'SUCCESS' && data.length === 0) {
      content = <div className="text-center text-slate-400 p-8">No movies found for this query.</div>;
    } else {
      content = (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {data.map(movie => <MovieCard key={movie.id} movie={movie} />)}
        </div>
      );
    }

    if (title.includes('Trending')) {
        icon = <TrendingUpIcon className="w-6 h-6 mr-3 text-cyan-400" />;
    } else if (title.includes('Search')) {
        icon = <SearchIcon className="w-6 h-6 mr-3 text-fuchsia-400" />;
    } else {
        icon = null;
    }

    return (
      <section className="mt-12">
        <h2 className="text-3xl font-extrabold text-white mb-2 flex items-center">
          {icon}
          {title}
        </h2>
        {/* Display the AI-parsed intent under the search results header */}
        {title.includes('Search') && searchStatus !== 'IDLE' && (
             <p className="text-fuchsia-300 mb-6 text-sm italic">{searchIntent}</p>
        )}
        {content}
      </section>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white p-4 sm:p-8 lg:p-12">
      
      <header className="text-center mb-12">
        <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-fuchsia-600">
          AI Semantic Search Tester 🧠
        </h1>
        <p className="text-slate-400 mt-2 text-lg">
          Natural Language Search powered by AI parsing, backed by Next.js and TMDB.
        </p>
      </header>

      <section className="max-w-4xl mx-auto mb-16">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-grow">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Try: 'mind-bending sci-fi with a 7.5+ rating' or 'best of 2024'"
              className="w-full bg-slate-700 text-white border-2 border-slate-600 rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-fuchsia-500 transition duration-150 shadow-lg"
            />
          </div>
          <button
            type="submit"
            disabled={searchStatus === 'LOADING'}
            className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold py-3 px-6 rounded-xl transition duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:bg-slate-500 disabled:cursor-not-allowed"
          >
            {searchStatus === 'LOADING' ? 'Searching...' : 'Search Movies'}
          </button>
        </form>
      </section>

      {searchStatus !== 'IDLE' && renderContent(searchStatus, searchError, searchResults, `Search Results`)}

      <main className="max-w-7xl mx-auto">
        {renderContent(trendingStatus, trendingError, trendingMovies, 'Trending Movies (Today)')}

        {renderContent(popularStatus, popularError, popularMovies, 'Popular Movies (All Time)')}
      </main>

      <footer className="mt-20 pt-8 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>Data provided by The Movie Database (TMDB).</p>
        <p>AI parsing simulated/powered by the server proxy.</p>
      </footer>
    </div>
  );
};

export default TmdbProxyTester;