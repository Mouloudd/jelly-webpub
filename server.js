// server.js - Backend API Server for Jellyfin
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Jellyfin server configuration
const JELLYFIN_URL = process.env.JELLYFIN_URL || 'http://mouloud.ddns.net:8096';
const JELLYFIN_API_KEY = process.env.JELLYFIN_API_KEY || 'YOUR_API_KEY';

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api', limiter);

// Jellyfin API helper
const jellyfinApi = axios.create({
  baseURL: JELLYFIN_URL,
  headers: {
    'X-Emby-Token': JELLYFIN_API_KEY,
    'Content-Type': 'application/json'
  }
});

// Helper function to make Jellyfin API requests
const makeJellyfinRequest = async (endpoint, params = {}) => {
  try {
    // Remove empty params to avoid 400 errors
    const cleanParams = Object.fromEntries(
      Object.entries(params).filter(([_, value]) => value !== '' && value !== null && value !== undefined)
    );

    console.log(`Making request to: ${JELLYFIN_URL}${endpoint}`);
    console.log('Params:', cleanParams);

    const response = await axios.get(`${JELLYFIN_URL}${endpoint}`, {
      headers: {
        'X-Emby-Token': JELLYFIN_API_KEY,
        'Content-Type': 'application/json'
      },
      params: cleanParams
    });
    return response.data;
  } catch (error) {
    console.error('Jellyfin API Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
};

// Routes

// Add a test endpoint to check API key and connection
app.get('/api/test', async (req, res) => {
  try {
    console.log('Testing Jellyfin connection...');
    console.log('JELLYFIN_URL:', JELLYFIN_URL);
    console.log('API Key provided:', JELLYFIN_API_KEY ? 'Yes' : 'No');
    
    // Test basic server info
    const info = await makeJellyfinRequest('/System/Info');
    console.log('Server info retrieved successfully');
    
    // Test getting users
    const users = await makeJellyfinRequest('/Users');
    console.log('Users retrieved:', users.length);
    
    res.json({
      success: true,
      server: {
        name: info.ServerName,
        version: info.Version
      },
      users: users.length,
      message: 'Connection successful'
    });
  } catch (error) {
    console.error('Test failed:', error.message);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// Get server info
app.get('/api/server/info', async (req, res) => {
  try {
    const info = await makeJellyfinRequest('/System/Info');
    res.json({
      serverName: info.ServerName,
      version: info.Version,
      status: 'online'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch server info' });
  }
});

// Get all libraries
app.get('/api/libraries', async (req, res) => {
  try {
    const libraries = await makeJellyfinRequest('/Library/VirtualFolders');
    res.json(libraries);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch libraries' });
  }
});

// Get items from library (movies/shows)
app.get('/api/items', async (req, res) => {
  try {
    // First, get the user ID (required for most Jellyfin API calls)
    const users = await makeJellyfinRequest('/Users');
    if (!users || users.length === 0) {
      return res.status(500).json({ error: 'No users found' });
    }
    
    const userId = users[0].Id; // Use first user
    
    const { 
      parentId, 
      limit = 50, 
      startIndex = 0, 
      includeItemTypes = 'Movie,Series',
      recursive = 'true',
      sortBy = 'DateCreated',
      sortOrder = 'Descending'
    } = req.query;

    const params = {
      Limit: limit,
      StartIndex: startIndex,
      IncludeItemTypes: includeItemTypes,
      Recursive: recursive,
      SortBy: sortBy,
      SortOrder: sortOrder,
      Fields: 'PrimaryImageAspectRatio,MediaSourceCount,ProductionYear,Overview,Genres,CommunityRating,OfficialRating,People'
    };

    // Only add ParentId if it's provided
    if (parentId) {
      params.ParentId = parentId;
    }

    const items = await makeJellyfinRequest(`/Users/${userId}/Items`, params);
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items', details: error.message });
  }
});

// Get item details
app.get('/api/items/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get user ID first
    const users = await makeJellyfinRequest('/Users');
    if (!users || users.length === 0) {
      return res.status(500).json({ error: 'No users found' });
    }
    
    const userId = users[0].Id;
    
    const item = await makeJellyfinRequest(`/Users/${userId}/Items/${id}`, {
      Fields: 'PrimaryImageAspectRatio,MediaSourceCount,ProductionYear,Overview,Genres,CommunityRating,OfficialRating,People,Studios,Taglines,MediaSources'
    });
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch item details', details: error.message });
  }
});

// Get seasons for a series
app.get('/api/series/:id/seasons', async (req, res) => {
  try {
    const { id } = req.params;
    const seasons = await makeJellyfinRequest(`/Shows/${id}/Seasons`, {
      Fields: 'PrimaryImageAspectRatio,ProductionYear,Overview'
    });
    res.json(seasons);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch seasons' });
  }
});

// Get episodes for a season
app.get('/api/seasons/:id/episodes', async (req, res) => {
  try {
    const { id } = req.params;
    const episodes = await makeJellyfinRequest(`/Shows/${id}/Episodes`, {
      Fields: 'PrimaryImageAspectRatio,ProductionYear,Overview,MediaSources'
    });
    res.json(episodes);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch episodes' });
  }
});

// Search items
app.get('/api/search', async (req, res) => {
  try {
    const { query, limit = 20 } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    // Get user ID first
    const users = await makeJellyfinRequest('/Users');
    if (!users || users.length === 0) {
      return res.status(500).json({ error: 'No users found' });
    }
    
    const userId = users[0].Id;

    const results = await makeJellyfinRequest(`/Users/${userId}/Items`, {
      SearchTerm: query,
      Limit: limit,
      IncludeItemTypes: 'Movie,Series,Episode',
      Recursive: 'true',
      Fields: 'PrimaryImageAspectRatio,ProductionYear,Overview,Genres'
    });
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Get image URL
app.get('/api/image/:itemId/:imageType', (req, res) => {
  const { itemId, imageType } = req.params;
  const { width, height, quality = 90 } = req.query;
  
  let imageUrl = `${JELLYFIN_URL}/Items/${itemId}/Images/${imageType}`;
  
  const params = new URLSearchParams();
  if (width) params.append('width', width);
  if (height) params.append('height', height);
  params.append('quality', quality);
  
  if (params.toString()) {
    imageUrl += `?${params.toString()}`;
  }
  
  res.json({ imageUrl });
});

// Stream video endpoint
app.get('/api/stream/:itemId', (req, res) => {
  const { itemId } = req.params;
  const { 
    container = 'mp4',
    videoCodec = 'h264',
    audioCodec = 'aac',
    maxWidth = '1920',
    maxHeight = '1080',
    videoBitRate = '8000000',
    audioBitRate = '128000'
  } = req.query;

  const streamUrl = `${JELLYFIN_URL}/Videos/${itemId}/stream.${container}?` +
    `VideoCodec=${videoCodec}&` +
    `AudioCodec=${audioCodec}&` +
    `MaxWidth=${maxWidth}&` +
    `MaxHeight=${maxHeight}&` +
    `VideoBitRate=${videoBitRate}&` +
    `AudioBitRate=${audioBitRate}&` +
    `api_key=${JELLYFIN_API_KEY}`;

  res.json({ streamUrl });
});

// Get recently added items
app.get('/api/recent', async (req, res) => {
  try {
    const { limit = 20 } = req.query;
    
    // Get user ID first
    const users = await makeJellyfinRequest('/Users');
    if (!users || users.length === 0) {
      return res.status(500).json({ error: 'No users found' });
    }
    
    const userId = users[0].Id;
    
    const recent = await makeJellyfinRequest(`/Users/${userId}/Items`, {
      Limit: limit,
      Recursive: 'true',
      IncludeItemTypes: 'Movie,Series',
      SortBy: 'DateCreated',
      SortOrder: 'Descending',
      Fields: 'PrimaryImageAspectRatio,ProductionYear,Overview,Genres,CommunityRating'
    });
    res.json(recent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent items', details: error.message });
  }
});

// Get genres
app.get('/api/genres', async (req, res) => {
  try {
    const genres = await makeJellyfinRequest('/Genres', {
      IncludeItemTypes: 'Movie,Series',
      Recursive: true
    });
    res.json(genres);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

// Get items by genre
app.get('/api/genre/:genreId/items', async (req, res) => {
  try {
    const { genreId } = req.params;
    const { limit = 50, startIndex = 0 } = req.query;
    
    const items = await makeJellyfinRequest('/Users/Items', {
      GenreIds: genreId,
      Limit: limit,
      StartIndex: startIndex,
      Recursive: true,
      IncludeItemTypes: 'Movie,Series',
      Fields: 'PrimaryImageAspectRatio,ProductionYear,Overview,Genres,CommunityRating'
    });
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch items by genre' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Jellyfin URL: ${JELLYFIN_URL}`);
});

module.exports = app;