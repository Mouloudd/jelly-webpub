import React, { useState, useEffect } from 'react';
import { Search, Play, Info, Star, Calendar, Clock, Filter, Grid, List, ChevronRight, ChevronLeft, Home, Film, Tv, Heart, User, Settings, Menu, X } from 'lucide-react';

const API_BASE_URL = 'http://mouloud.ddns.net:5000/api';

const api = {
  getServerInfo: () => fetch(`${API_BASE_URL}/server/info`).then(res => res.json()),
  getItems: (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return fetch(`${API_BASE_URL}/items?${queryString}`)
    .then(async res => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    });
}
,
  getItemDetails: (id) => {
  return fetch(`${API_BASE_URL}/items/${id}`)
    .then(async res => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    });
}
,
  getRecent: (limit = 20) => {
  return fetch(`${API_BASE_URL}/recent?limit=${limit}`)
    .then(async res => {
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    });
}
,
  search: (query, limit = 20) => fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(query)}&limit=${limit}`).then(res => res.json()),
  getGenres: () => fetch(`${API_BASE_URL}/genres`).then(res => res.json()),
  getImage: (itemId, imageType, width, height) => {
    const params = new URLSearchParams();
    if (width) params.append('width', width);
    if (height) params.append('height', height);
    return fetch(`${API_BASE_URL}/image/${itemId}/${imageType}?${params.toString()}`).then(res => res.json());
  },
  getStreamUrl: async (itemId) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${API_BASE_URL}/stream/${itemId}`);
    if (res.ok) {
      return await res.json();
    } else {
      const message = await res.text();
      if (res.status === 429) {
        // wait before retrying
        await new Promise(res => setTimeout(res, 1000 * (attempt + 1)));
      } else {
        throw new Error(message);
      }
    }
  }
  throw new Error("Too many requests, please try again later.");
}


};

const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
  </div>
);
const MediaCard = ({ item, onClick, className = "", myList, setMyList }) => {
  const [imageUrl, setImageUrl] = useState('');
  const [imageLoaded, setImageLoaded] = useState(false);
  const isInMyList = myList.some((i) => i.Id === item.Id);

  useEffect(() => {
    if (item.Id) {
      api.getImage(item.Id, 'Primary', 300, 450)
        .then(data => {
          setImageUrl(data.imageUrl);
          setImageLoaded(true);
        })
        .catch(() => setImageLoaded(true));
    }
  }, [item.Id]);

  const toggleMyList = (e) => {
    e.stopPropagation(); // IMPORTANT: stops click bubbling
    const updatedList = isInMyList
      ? myList.filter(i => i.Id !== item.Id)
      : [...myList, item];

    setMyList(updatedList);
    localStorage.setItem('myList', JSON.stringify(updatedList));
  };

  return (
    <div className={`group relative bg-gray-900 rounded-lg overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl ${className}`}>
      
      {/* Image area ONLY is clickable */}
      <div
        className="aspect-[2/3] bg-gray-800 relative overflow-hidden cursor-pointer"
        onClick={() => onClick(item)}
      >
        {imageLoaded && imageUrl ? (
          <img 
            src={imageUrl} 
            alt={item.Name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            onError={() => setImageUrl('')}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Film className="w-16 h-16 text-gray-600" />
          </div>
        )}

        {/* Heart icon */}
        <button
          onClick={toggleMyList}
          className="absolute top-2 left-2 z-10 text-white bg-black bg-opacity-50 rounded-full p-1 hover:bg-opacity-80 transition"
        >
          <Heart className={`w-5 h-5 ${isInMyList ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>

        {/* Overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
          <div className="text-center">
            <Play className="w-12 h-12 text-white mx-auto mb-2" />
            <p className="text-white text-sm font-medium">Watch Now</p>
          </div>
        </div>

        {/* Rating & Year */}
        {item.CommunityRating && (
          <div className="absolute top-2 right-2 bg-black bg-opacity-70 rounded-full px-2 py-1 flex items-center">
            <Star className="w-3 h-3 mr-1 text-yellow-400" />
            <span className="text-white text-xs">{item.CommunityRating.toFixed(1)}</span>
          </div>
        )}
        {item.ProductionYear && (
          <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 rounded px-2 py-1 text-xs text-white">
            {item.ProductionYear}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="p-3">
        <h3 className="text-white font-medium text-sm truncate">{item.Name}</h3>
        {item.Type === 'Series' && (
          <p className="text-gray-400 text-xs mt-1">TV Series</p>
        )}
      </div>
    </div>
  );
};

// ---
// The rest of the file is too long for a single response.
// I'll continue sending the rest of the complete, updated `App.js` in the next message.
// ---
// ... previous content remains unchanged ...

const HeroSection = ({ featuredItem, onPlay, onInfo }) => {
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (featuredItem?.Id) {
      api.getImage(featuredItem.Id, 'Backdrop', 1920, 1080)
        .then(data => setImageUrl(data.imageUrl))
        .catch(() => {});
    }
  }, [featuredItem?.Id]);

  if (!featuredItem) return null;

  return (
    <div className="relative h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={featuredItem.Name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-gray-900 to-gray-800"></div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
      </div>

      <div className="relative z-10 text-white max-w-4xl mx-auto px-6 text-center">
        <h1 className="text-6xl font-bold mb-4">{featuredItem.Name}</h1>

        <div className="flex items-center justify-center gap-4 mb-6">
          {featuredItem.ProductionYear && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {featuredItem.ProductionYear}
            </span>
          )}
          {featuredItem.CommunityRating && (
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              {featuredItem.CommunityRating.toFixed(1)}
            </span>
          )}
          {featuredItem.Type === 'Series' && (
            <span className="flex items-center gap-1">
              <Tv className="w-4 h-4" />
              TV Series
            </span>
          )}
        </div>

        {featuredItem.Overview && (
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto leading-relaxed">
            {featuredItem.Overview.length > 200 
              ? `${featuredItem.Overview.substring(0, 200)}...` 
              : featuredItem.Overview}
          </p>
        )}

        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => onPlay(featuredItem)}
            className="flex items-center gap-2 bg-white text-black px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
          >
            <Play className="w-5 h-5" />
            Play
          </button>
          <button 
            onClick={() => onInfo(featuredItem)}
            className="flex items-center gap-2 bg-gray-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
          >
            <Info className="w-5 h-5" />
            More Info
          </button>
        </div>
      </div>
    </div>
  );
};
// ... previous content remains unchanged ...



const SearchBar = ({ value, onChange, onSearch }) => (
  <div className="relative flex-1 max-w-lg">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
    <input
      type="text"
      value={value}
      onChange={onChange}
      onKeyPress={(e) => e.key === 'Enter' && onSearch()}
      placeholder="Search movies and TV shows..."
      className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
    />
  </div>
);

// JellyfinApp main component and modal will be continued in the next part...
// ... previous content remains unchanged ...

const JellyfinApp = () => {
  const [user, setUser] = useState(null);
  const [myList, setMyList] = useState(() => JSON.parse(localStorage.getItem('myList')) || []);
  const [items, setItems] = useState([]);
  const [recentItems, setRecentItems] = useState([]);
  const [featuredItem, setFeaturedItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [currentView, setCurrentView] = useState('home');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPlayer, setShowPlayer] = useState(false);
  const [streamUrl, setStreamUrl] = useState('');
  const [itemDetails, setItemDetails] = useState(null);
  const [error, setError] = useState('');
  const [isLoadingStream, setIsLoadingStream] = useState(false);


  useEffect(() => {
  loadInitialData();
}, []);


  const loadInitialData = async () => {
  if (items.length && recentItems.length) return; // Skip reload

  try {
    setLoading(true);

    const [recentRes, itemsRes] = await Promise.all([
      api.getRecent(20),
      api.getItems({
        Limit: 50,
        StartIndex: 0,
        IncludeItemTypes: 'Movie,Series',
        Recursive: 'true',
        SortBy: 'DateCreated',
        SortOrder: 'Descending',
        Fields: 'PrimaryImageAspectRatio,MediaSourceCount,ProductionYear,Overview,Genres,CommunityRating,OfficialRating,People'
      })
    ]);

    if (recentRes?.Items?.length) {
      setRecentItems(recentRes.Items);
      setFeaturedItem(recentRes.Items[0]);
    }
    if (itemsRes?.Items?.length) {
      setItems(itemsRes.Items);
    }

  } catch (err) {
    console.error("⚠️ Data load error:", err.message || err);
    setError("Too many requests — please wait a moment.");
  } finally {
    setLoading(false);
  }
};


  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await api.search(searchQuery);
      setSearchResults(results.Items || []);
      setCurrentView('search');
    } catch (error) {
      console.error('Search error:', error);
    }
  };

  const handlePlay = async (item) => {
  if (isLoadingStream) return; // prevent rapid clicks

  try {
    setIsLoadingStream(true);
    const streamData = await api.getStreamUrl(item.Id);
    setStreamUrl(streamData.streamUrl);
    setSelectedItem(item);
    setShowPlayer(true);
  } catch (error) {
    console.error('Error getting stream URL:', error);
    setError("Too many requests — please wait a few seconds.");
  } finally {
    setIsLoadingStream(false);
  }
};
;

  const handleInfo = async (item) => {
    try {
      const details = await api.getItemDetails(item.Id);
      setItemDetails(details);
    } catch (e) {
      console.error('Failed to fetch details:', e);
    }
  };

  const renderFilteredItems = (type) => (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6">{type === 'Movie' ? 'Movies' : 'TV Shows'}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {items.filter(item => item.Type === type).map(item => (
          <MediaCard
  key={item.Id}
  item={item}
  onClick={handlePlay}
  myList={myList}
  setMyList={setMyList}
/>
        ))}
      </div>
    </div>
  );

  const renderContent = () => {
    if (loading) return <Loading />;
    switch (currentView) {
      case 'search':
        return (
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white mb-6">Search Results</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
              {searchResults.map((item) => (
                <MediaCard
  key={item.Id}
  item={item}
  onClick={handlePlay}
  myList={myList}
  setMyList={setMyList}
/>
              ))}
            </div>
          </div>
        );
      
            

      default:
        return (
          <>
            <HeroSection featuredItem={featuredItem} onPlay={handlePlay} onInfo={handleInfo} />
            <div className="p-6 space-y-8">
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Recently Added</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {recentItems.slice(0, 8).map((item) => (
                    <MediaCard
  key={item.Id}
  item={item}
  onClick={handlePlay}
  myList={myList}
  setMyList={setMyList}
/>
                  ))}
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">All Movies & Shows</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
                  {items.slice(0, 16).map((item) => (
                    <MediaCard
  key={item.Id}
  item={item}
  onClick={handlePlay}
  myList={myList}
  setMyList={setMyList}
/>
                  ))}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  return (
  <div className="min-h-screen bg-black text-white p-6">
    <h1 className="text-3xl font-bold mb-6">Available Movies & Series</h1>

    {loading ? (
      <Loading />
    ) : error ? (
      <div className="bg-red-700 text-white p-4 rounded">{error}</div>
    ) : (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {items.map(item => (
          <MediaCard
            key={item.Id}
            item={item}
            onClick={handlePlay}
            myList={myList}
            setMyList={setMyList}
          />
        ))}
      </div>
    )}

    {/* Video Player */}
    {showPlayer && selectedItem && (
      <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
        <div className="w-full h-full max-w-6xl max-h-full">
          <div className="flex items-center justify-between p-4 bg-black">
            <h3 className="text-white text-xl font-semibold">{selectedItem?.Name}</h3>
            <button onClick={() => setShowPlayer(false)} className="text-white hover:text-gray-300">
              <X className="w-6 h-6" />
            </button>
          </div>
          <video
            src={streamUrl}
            controls
            autoPlay
            className="w-full h-full bg-black"
            style={{ maxHeight: 'calc(100vh - 80px)' }}
          />
        </div>
      </div>
    )}
  </div>
);

};

export default JellyfinApp;
