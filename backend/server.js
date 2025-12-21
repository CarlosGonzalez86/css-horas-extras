const express = require('express');
const multer = require('multer');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SECRET = 'CSS_SEGURIDAD_2026';

app.use(cors());
app.use(express.json());

// Crear carpetas
['uploads/talonarios', 'uploads/cedulas'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Usuario administrador
const users = [
    {
        username: 'admin',
        password: bcrypt.hashSync('css2026', 10),
        role: 'admin'
    }
];

// LOGIN
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (!user) return res.status(401).json({ msg: 'Usuario inválido' });

    if (!bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ msg: 'Contraseña incorrecta' });
    }

    const token = jwt.sign(
        { username: user.username, role: user.role },
        SECRET,
        { expiresIn: '2h' }
    );

    res.json({ token });
});

// Middleware admin
function authAdmin(req, res, next) {
    const token = req.headers.authorization;
    if (!token) return res.sendStatus(403);

    try {
        const decoded = jwt.verify(token, SECRET);
        if (decoded.role !== 'admin') return res.sendStatus(403);
        next();
    } catch {
        res.sendStatus(403);
    }
}

// Subida de archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, `uploads/${req.body.type}s`);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ msg: 'Archivo subido correctamente' });
});

// Listar archivos
app.get('/files', authAdmin, (req, res) => {
    res.json({
        talonarios: fs.readdirSync('uploads/talonarios'),
        cedulas: fs.readdirSync('uploads/cedulas')
    });
});

// Descargar archivo
app.get('/download/:type/:name', authAdmin, (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.type, req.params.name);
    res.download(filePath);
});

// Eliminar archivo
app.delete('/delete/:type/:name', authAdmin, (req, res) => {
    const filePath = path.join(__dirname, 'uploads', req.params.type, req.params.name);
    fs.unlinkSync(filePath);
    res.json({ msg: 'Archivo eliminado' });
});

app.listen(PORT, () => {
    console.log(`Servidor activo → http://localhost:${PORT}`);
});
