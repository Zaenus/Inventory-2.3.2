const https = require('https');
const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const productRoutes = require('./routes/products');
const inventoryRoutes = require('./routes/inventory');

const app = express();
const PORT = process.env.PORT || 3000;

// HTTPS options
const options = {
  key: fs.readFileSync(path.join(__dirname, 'server.key')),
  cert: fs.readFileSync(path.join(__dirname, 'server.cert'))
};

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use(bodyParser.json({ limit: '10mb' }));
app.use(cors());

// Unprotected routes
app.get('/contagem', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contagem.html')));
app.get('/exportar', (req, res) => res.sendFile(path.join(__dirname, 'public', 'exportar.html')));
app.get('/importar', (req, res) => res.sendFile(path.join(__dirname, 'public', 'importar.html')));
app.get('/leitor-codigos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'barcode.html')));
app.get('/pesquisar-produtos', (req, res) => res.sendFile(path.join(__dirname, 'public', 'searchProduct.html')));
app.get('/relatorio-margens', (req, res) => res.sendFile(path.join(__dirname, 'public', 'margins.html')));

// SQLite Database Connection
const db = new sqlite3.Database('database.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        produto TEXT NOT NULL,
        atual REAL DEFAULT 0,
        preco_custo REAL DEFAULT 0,
        preco_venda REAL DEFAULT 0,
        margem_lucro REAL DEFAULT 0,
        codigo_de_barras TEXT,
        codigo_de_barras_sec TEXT
      )
    `);
    db.run(`
    CREATE TABLE IF NOT EXISTS inventory_compaction (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT NOT NULL,
        codigo_de_barras TEXT,
        produto TEXT NOT NULL,
        quantidade_contada REAL NOT NULL DEFAULT 0,
        data_hora DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
});

// Use routes
app.use('/api', productRoutes(db));
app.use('/api', inventoryRoutes(db));

// Start server
https.createServer(options, app).listen(PORT, () => {
  console.log(`Server is running on https://localhost:${PORT} (accessible via IP)`);
});