const express = require("express");
const multer = require("multer");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000; 

// ======================
// MIDDLEWARES
// ======================
app.use(cors());
app.use(express.json());

// ======================
// ASEGURAR CARPETAS
// ======================
const rutas = [
    "uploads",
    "uploads/cedulas",
    "uploads/talonarios"
];

rutas.forEach(ruta => {
    if (!fs.existsSync(ruta)) {
        fs.mkdirSync(ruta, { recursive: true });
    }
});

// ======================
// CONFIGURACIÓN MULTER
// ======================
const storage = (folder) => multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, `uploads/${folder}`);
    },
    filename: (req, file, cb) => {
        const uniqueName = Date.now() + "-" + file.originalname;
        cb(null, uniqueName);
    }
});

const uploadCedula = multer({ storage: storage("cedulas") });
const uploadTalonario = multer({ storage: storage("talonarios") });

// ======================
// RUTAS
// ======================
app.get("/", (req, res) => {
    res.send("Servidor funcionando correctamente ✅");
});

// Subir cédula
app.post("/upload/cedula", uploadCedula.single("archivo"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No se subió ningún archivo" });
    }

    res.json({
        message: "Cédula subida correctamente ✅",
        archivo: req.file.filename
    });
});

// Subir talonario
app.post("/upload/talonario", uploadTalonario.single("archivo"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: "No se subió ningún archivo" });
    }

    res.json({
        message: "Talonario subido correctamente ✅",
        archivo: req.file.filename
    });
});

// ======================
// SERVIDOR
// ======================
app.listen(PORT, () => {
    console.log(`Servidor activo en http://localhost:${PORT}`);
});