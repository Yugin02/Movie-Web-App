import {useEffect, useState} from 'react'
import Search from './components/SearchBar';
import Spinner from './components/Spinner';
import Card from './components/Card';
import { useDebounce } from 'react-use';
import { getTrendingMovies, updateSearchCount } from './appwrite';
import { SpeedInsights } from '@vercel/speed-insights/react';

const API_BASE_URL = 'https://api.themoviedb.org/3';
const API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const API_OPTIONS = {
  method: 'GET',
  headers: {
    accept: 'application/json',
    authorization: `Bearer ${API_KEY}`
  }
}


const App = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [allMovies, setAllMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [trendingMovies, setTrendingMovies] = useState([]);

  // Debounce the search term to avoid too many API calls
  useDebounce(()=> setDebouncedSearchTerm(searchTerm), 500, [searchTerm]);

  const fetchMovies = async (query = '')=> {
    setIsLoading(true);
    setError('');
    try {
      const endpoint = query ? 
      `${API_BASE_URL}/search/movie?query=${encodeURIComponent(query)}&sort_by=popularity.desc`
      : `${API_BASE_URL}/discover/movie?sort_by=popularity.desc`;
      const response = await fetch(endpoint, API_OPTIONS);

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const data = await response.json();

      if (data.Response === 'false') {
        setError(data.Error || 'Failed to fetch movies');
        setAllMovies([]);
        return;
      }
      setAllMovies(data.results || []);
      if (query && data.results && data.results.length > 0) {
        // Update search count in Appwrite
        await updateSearchCount(query, data.results[0]);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
      setError('Failed to fetch movies. Please try again later.');
    } finally {
      setIsLoading(false);
    } 
  }

  const fetchTrendingMovies = async () => {
    try {
      const movies = await getTrendingMovies();
      console.log('Trending Movies:', movies);
      setTrendingMovies(movies);
    } catch (error) {
      console.error('Error fetching trending movies:', error);
    }
  }

  useEffect(()=>{
    fetchMovies(debouncedSearchTerm);
  }, [debouncedSearchTerm]);

  useEffect(() => {
    // Fetch trending movies on initial load
    fetchTrendingMovies();
  }, []);

  return (
    <main>
      <SpeedInsights />
      <div className='pattern'/>
      
      <div className="wrapper">
        <header>
          <img src="./hero-img.png" alt="" />
          <h1>Find <span className='text-gradient'>Movies</span> You'll Enjoy Without Hassle</h1>
        <Search searchTerm={searchTerm} setSearchTerm={setSearchTerm}/>
        </header>

        { trendingMovies.length > 0 && (  
        <section className="trending">
          <h2>Trending Movies</h2>
          <ul>
            {trendingMovies.map((movie, index) => (
              <li key={movie.$id}>
                <p>{index + 1}</p>
                <img src={movie.poster_url} alt={movie.title} />
              </li>
            ))}
          </ul>
        </section>
        )}

        <section className='all-movies'>
          <h2>All Movies</h2>
          { isLoading ? ( 
             <Spinner/>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : (
              <ul>
                {allMovies.map((movie) => (
                  <Card key={movie.id} movie={movie}/>
                ))}
              </ul>
            )
          }
        </section>
      </div>
    </main>
  )
}

export default App