# Backend para Login-Css

Este directorio contiene un servidor Express minimal que implementa registro e inicio de sesión usando SQLite.

Cómo usar:

1. Instala dependencias:

   cd backend
   npm install

2. Copia el archivo de ejemplo de entorno y ajusta valores:

   cp .env.example .env
   Edita .env y cambia JWT_SECRET

3. Ejecuta el servidor en desarrollo:

   npm run dev

Rutas principales:

- POST /api/register  => { fullname, email, username, password, department }
- POST /api/login     => { user, pass } (user puede ser username o email)
- GET  /api/me        => requiere header Authorization: Bearer <token>

También mantiene las rutas de subida de archivos que ya había:
- POST /upload/cedula  => field 'archivo'
- POST /upload/talonario => field 'archivo'
