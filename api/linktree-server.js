const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = 3002; // Different port to avoid conflicts

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'], // Vite dev server ports
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Database setup - create in api folder
const dbPath = path.join(__dirname, 'linktree.db');
const db = new sqlite3.Database(dbPath);

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    bio TEXT,
    image TEXT,
    theme_id INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Links table
  db.run(`CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
  )`);

  // Themes table
  db.run(`CREATE TABLE IF NOT EXISTS themes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    background_color TEXT DEFAULT '#ffffff',
    text_color TEXT DEFAULT '#000000',
    accent_color TEXT DEFAULT '#007bff'
  )`);

  // Insert default themes
  const themes = [
    { id: 1, name: 'Default', bg: '#8B5CF6', text: '#FFFFFF', accent: '#A855F7' },
    { id: 2, name: 'Ocean', bg: '#3B82F6', text: '#FFFFFF', accent: '#60A5FA' },
    { id: 3, name: 'Sunset', bg: '#F97316', text: '#FFFFFF', accent: '#FB923C' },
    { id: 4, name: 'Forest', bg: '#10B981', text: '#FFFFFF', accent: '#34D399' },
    { id: 5, name: 'Rose', bg: '#F43F5E', text: '#FFFFFF', accent: '#FB7185' },
    { id: 6, name: 'Mint', bg: '#06B6D4', text: '#FFFFFF', accent: '#22D3EE' },
    { id: 7, name: 'Gold', bg: '#F59E0B', text: '#FFFFFF', accent: '#FBBF24' },
    { id: 8, name: 'Purple', bg: '#7C3AED', text: '#FFFFFF', accent: '#8B5CF6' }
  ];

  themes.forEach(theme => {
    db.run(`INSERT OR IGNORE INTO themes (id, name, background_color, text_color, accent_color) 
            VALUES (?, ?, ?, ?, ?)`, 
            [theme.id, theme.name, theme.bg, theme.text, theme.accent]);
  });

  // Insert demo user (no password for wallet-based auth)
  db.run(`INSERT OR IGNORE INTO users (id, name, email, password, bio, theme_id) 
          VALUES (1, 'Demo User', 'demo@iryshare.com', '$2a$10$dummy.hash.for.demo', 'Welcome to my Linktree on Iryshare!', 1)`);

  // Insert demo links
  const demoLinks = [
    'INSERT OR IGNORE INTO links (id, user_id, name, url, image) VALUES (1, 1, "My Website", "https://iryshare.com", "/link-placeholder.png")',
    'INSERT OR IGNORE INTO links (id, user_id, name, url, image) VALUES (2, 1, "Instagram", "https://instagram.com/iryshare", "/link-placeholder.png")',
    'INSERT OR IGNORE INTO links (id, user_id, name, url, image) VALUES (3, 1, "YouTube", "https://youtube.com/@iryshare", "/link-placeholder.png")',
    'INSERT OR IGNORE INTO links (id, user_id, name, url, image) VALUES (4, 1, "Twitter", "https://twitter.com/iryshare", "/link-placeholder.png")'
  ];
  
  demoLinks.forEach(query => db.run(query));
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Authentication middleware (simplified for Iryshare)
const authenticateUser = (req, res, next) => {
  // For Iryshare integration, we'll use wallet address as user identifier
  const walletAddress = req.headers['wallet-address'];
  
  if (!walletAddress) {
    return res.status(401).json({ error: 'Wallet address required' });
  }
  
  // Find or create user based on wallet address
  db.get('SELECT * FROM users WHERE email = ?', [`${walletAddress}@iryshare.wallet`], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    
    if (!user) {
      // Create new user for this wallet
      const defaultName = `User ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
      db.run(
        'INSERT INTO users (name, email, password, bio, theme_id) VALUES (?, ?, ?, ?, ?)',
        [defaultName, `${walletAddress}@iryshare.wallet`, '$2a$10$dummy.hash.for.wallet', 'Welcome to my Linktree!', 1],
        function(err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }
          req.user = { id: this.lastID, wallet: walletAddress };
          next();
        }
      );
    } else {
      req.user = { id: user.id, wallet: walletAddress };
      next();
    }
  });
};

// Routes

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Iryshare Linktree API is running!', timestamp: new Date().toISOString() });
});

// User routes
app.get('/api/user', authenticateUser, (req, res) => {
  db.get('SELECT id, name, email, bio, image, theme_id FROM users WHERE id = ?', 
    [req.user.id], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  });
});

app.patch('/api/user', authenticateUser, (req, res) => {
  const { name, bio } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  db.run(
    'UPDATE users SET name = ?, bio = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [name, bio || '', req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'User updated successfully' });
    }
  );
});

// User image upload
app.post('/api/user/image', authenticateUser, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const imagePath = `/uploads/${req.file.filename}`;
  
  db.run(
    'UPDATE users SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [imagePath, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'User image updated', image: imagePath });
    }
  );
});

// Links routes
app.get('/api/links', authenticateUser, (req, res) => {
  db.all('SELECT * FROM links WHERE user_id = ? ORDER BY created_at DESC', 
    [req.user.id], (err, links) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(links);
  });
});

app.post('/api/links', authenticateUser, (req, res) => {
  const { name, url } = req.body;
  
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  if (name.length > 20) {
    return res.status(400).json({ error: 'Name must be 20 characters or less' });
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  db.run(
    'INSERT INTO links (user_id, name, url, image) VALUES (?, ?, ?, ?)',
    [req.user.id, name, url, '/link-placeholder.png'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Link created successfully', id: this.lastID });
    }
  );
});

app.patch('/api/links/:id', authenticateUser, (req, res) => {
  const { name, url } = req.body;
  
  if (!name || !url) {
    return res.status(400).json({ error: 'Name and URL are required' });
  }

  if (name.length > 18) {
    return res.status(400).json({ error: 'Name must be 18 characters or less' });
  }

  db.run(
    'UPDATE links SET name = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [name, url, req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Link not found' });
      }
      res.json({ message: 'Link updated successfully' });
    }
  );
});

app.delete('/api/links/:id', authenticateUser, (req, res) => {
  db.get('SELECT image FROM links WHERE id = ? AND user_id = ?', 
    [req.params.id, req.user.id], (err, link) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!link) {
      return res.status(404).json({ error: 'Link not found' });
    }

    // Delete image file if it exists and is not a placeholder
    if (link.image && 
        link.image !== '/link-placeholder.png' &&
        link.image.startsWith('/uploads/')) {
      const imagePath = path.join(uploadsDir, path.basename(link.image));
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    db.run('DELETE FROM links WHERE id = ? AND user_id = ?', 
      [req.params.id, req.user.id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Link deleted successfully' });
    });
  });
});

// Link image upload
app.post('/api/links/:id/image', authenticateUser, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No image uploaded' });
  }

  const imagePath = `/uploads/${req.file.filename}`;
  
  db.run(
    'UPDATE links SET image = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [imagePath, req.params.id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Link not found' });
      }
      res.json({ message: 'Link image updated', image: imagePath });
    }
  );
});

// Themes routes
app.get('/api/themes', authenticateUser, (req, res) => {
  db.all('SELECT * FROM themes', (err, themes) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(themes);
  });
});

app.patch('/api/user/theme', authenticateUser, (req, res) => {
  const { theme_id } = req.body;
  
  if (!theme_id) {
    return res.status(400).json({ error: 'Theme ID is required' });
  }

  db.run(
    'UPDATE users SET theme_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [theme_id, req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json({ message: 'Theme updated successfully' });
    }
  );
});

// Public profile route (no authentication required)
app.get('/api/profile/:walletOrUsername', (req, res) => {
  const { walletOrUsername } = req.params;
  
  // Try to find by wallet address first, then by username
  const searchEmail = walletOrUsername.includes('0x') 
    ? `${walletOrUsername}@iryshare.wallet`
    : walletOrUsername;
  
  db.get('SELECT id, name, bio, image, theme_id FROM users WHERE email = ? OR name = ?', 
    [searchEmail, walletOrUsername], (err, user) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!user) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    db.all('SELECT * FROM links WHERE user_id = ? ORDER BY created_at ASC', 
      [user.id], (err, links) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT * FROM themes WHERE id = ?', [user.theme_id], (err, theme) => {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.json({
          user: {
            id: user.id,
            name: user.name,
            bio: user.bio,
            image: user.image,
            theme: theme || { background_color: '#8B5CF6', text_color: '#FFFFFF', accent_color: '#A855F7' }
          },
          links
        });
      });
    });
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 5MB.' });
    }
  }
  res.status(500).json({ error: error.message });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Iryshare Linktree API running on port ${PORT}`);
  console.log(`📡 API Base: http://localhost:${PORT}/api`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
});

module.exports = app;
