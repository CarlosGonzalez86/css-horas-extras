const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const util = require('util');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------
// Database (SQLite)
// ---------------------------
const DB_PATH = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);
const dbRun = util.promisify(db.run.bind(db));
const dbGet = util.promisify(db.get.bind(db));
const dbAll = util.promisify(db.all.bind(db));

// Initialize users table
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullname TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      department TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// ---------------------------
// Auth helpers
// ---------------------------
const JWT_SECRET = process.env.JWT_SECRET || 'change_this_secret';

function generateToken(user) {
  const payload = { id: user.id, username: user.username };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ---------------------------
// File uploads (keep existing behavior)
// ---------------------------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, 'uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

// Make uploads folder if not exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}

// ---------------------------
// Routes
// ---------------------------
app.get('/', (req, res) => {
  res.send('Servidor funcionando correctamente');
});

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { fullname, email, username, password, department } = req.body;
    if (!fullname || !email || !username || !password) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    // Check existing user by username or email
    const existing = await dbGet(
      'SELECT * FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (existing) {
      return res.status(409).json({ error: 'El usuario o email ya están registrados' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const stmt = db.prepare(
      'INSERT INTO users (fullname, email, username, password, department) VALUES (?, ?, ?, ?, ?)'
    );

    stmt.run(fullname, email, username, hashed, department, function (err) {
      if (err) {
        console.error('Insert user error:', err);
        return res.status(500).json({ error: 'Error al crear el usuario' });
      }

      const user = {
        id: this.lastID,
        fullname,
        email,
        username,
        department
      };

      const token = generateToken(user);
      res.json({ success: true, message: 'Usuario creado', user, token });
    });

    stmt.finalize();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { user, pass } = req.body;
    if (!user || !pass) return res.status(400).json({ error: 'Faltan credenciales' });

    // Find by username or email
    const row = await dbGet('SELECT * FROM users WHERE username = ? OR email = ?', [user, user]);
    if (!row) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const match = await bcrypt.compare(pass, row.password);
    if (!match) return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });

    const userInfo = {
      id: row.id,
      username: row.username,
      fullname: row.fullname,
      email: row.email,
      department: row.department
    };

    const token = generateToken(userInfo);

    res.json({ success: true, message: 'Login correcto', user: userInfo, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// Protected example
app.get('/api/me', authMiddleware, async (req, res) => {
  try {
    const row = await dbGet('SELECT id, fullname, username, email, department, created_at FROM users WHERE id = ?', [req.user.id]);
    if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json({ success: true, user: row });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error de servidor' });
  }
});

// Keep existing upload endpoints (adapted)
app.post('/upload/cedula', upload.single('archivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo' });
  }
  res.json({ message: 'Cédula subida correctamente', archivo: req.file.filename });
});

app.post('/upload/talonario', upload.single('archivo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No se subió ningún archivo' });
  }
  res.json({ message: 'Talonario subido correctamente', archivo: req.file.filename });
});

// Server start
app.listen(PORT, () => {
  console.log(`Servidor activo en http://localhost:${PORT}`);
});
