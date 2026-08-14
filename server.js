// server.js
// Simple Express server that stores files in Google Drive using the googleapis library.

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const UPLOAD_FIELD = 'archivo';
const upload = multer({ storage: multer.memoryStorage() });

const PORT = process.env.PORT || 3000;
const CREDENTIALS = {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  redirect_uris: [process.env.REDIRECT_URI || 'http://localhost:3000/oauth2callback']
};

const TOKEN_STORE = path.join(__dirname, 'tokens.json');

function saveRefreshToken(refreshToken) {
  const obj = { refresh_token: refreshToken };
  fs.writeFileSync(TOKEN_STORE, JSON.stringify(obj, null, 2));
}

function loadRefreshToken() {
  if (process.env.REFRESH_TOKEN) return process.env.REFRESH_TOKEN;
  try {
    const raw = fs.readFileSync(TOKEN_STORE, 'utf8');
    const obj = JSON.parse(raw);
    return obj.refresh_token;
  } catch (e) {
    return null;
  }
}

function getOAuth2Client() {
  const { client_id, client_secret, redirect_uris } = CREDENTIALS;
  if (!client_id || !client_secret) {
    throw new Error('Missing CLIENT_ID or CLIENT_SECRET in environment');
  }

  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  const refreshToken = loadRefreshToken();
  if (refreshToken) {
    oAuth2Client.setCredentials({ refresh_token: refreshToken });
  }
  return oAuth2Client;
}

// Route: start OAuth flow to get refresh token
app.get('/auth', (req, res) => {
  try {
    const { client_id, client_secret, redirect_uris } = CREDENTIALS;
    if (!client_id || !client_secret) return res.status(500).send('CLIENT_ID/CLIENT_SECRET not set');

    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const authUrl = oAuth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/drive.file'],
      prompt: 'consent'
    });
    res.redirect(authUrl);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error generating auth URL');
  }
});

// OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code');

  try {
    const { client_id, client_secret, redirect_uris } = CREDENTIALS;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    const { tokens } = await oAuth2Client.getToken(code);

    if (tokens.refresh_token) {
      saveRefreshToken(tokens.refresh_token);
      res.send(`Refresh token saved. You can now close this window.`);
    } else {
      // Some accounts may not return a refresh token if previously consented. Show tokens.
      res.send('No refresh token returned. Existing refresh token may exist; check tokens.json.');
    }
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send('Error exchanging code for token');
  }
});

// Utility: get Drive client
function getDrive() {
  const auth = getOAuth2Client();
  return google.drive({ version: 'v3', auth });
}

// POST /upload/:tipo
app.post('/upload/:tipo', upload.single(UPLOAD_FIELD), async (req, res) => {
  const tipo = req.params.tipo;
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

  try {
    const drive = getDrive();

    const fileMetadata = {
      name: req.file.originalname,
      appProperties: { tipo }
    };

    const media = {
      mimeType: req.file.mimetype,
      body: Buffer.from(req.file.buffer)
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id,name'
    });

    res.json({ message: 'Archivo subido correctamente', file: response.data });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error subiendo archivo' });
  }
});

// GET /files
// Returns: { talonarios: [names], cedulas: [names] }
app.get('/files', async (req, res) => {
  try {
    const drive = getDrive();

    async function listByTipo(tipo) {
      const q = `appProperties has { key='tipo' and value='${tipo}' } and trashed=false`;
      const resp = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1000 });
      return resp.data.files.map(f => f.name);
    }

    const talonarios = await listByTipo('talonario');
    const cedulas = await listByTipo('cedula');

    res.json({ talonarios, cedulas });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error listando archivos' });
  }
});

// GET /download/:tipo/:name
app.get('/download/:tipo/:name', async (req, res) => {
  const tipo = req.params.tipo;
  const name = req.params.name;

  try {
    const drive = getDrive();
    const q = `name='${name.replace(/'/g, "\\'")}' and appProperties has { key='tipo' and value='${tipo}' } and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id,name,mimeType)', pageSize: 1 });
    const file = list.data.files && list.data.files[0];
    if (!file) return res.status(404).send('Archivo no encontrado');

    const fileId = file.id;
    const r = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'stream' });

    res.setHeader('Content-Disposition', `attachment; filename="${file.name}"`);
    res.setHeader('Content-Type', file.mimeType || 'application/octet-stream');
    r.data.pipe(res);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error descargando archivo');
  }
});

// DELETE /delete/:tipo/:name
app.delete('/delete/:tipo/:name', async (req, res) => {
  const tipo = req.params.tipo;
  const name = req.params.name;

  try {
    const drive = getDrive();
    const q = `name='${name.replace(/'/g, "\\'")}' and appProperties has { key='tipo' and value='${tipo}' } and trashed=false`;
    const list = await drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 });
    const file = list.data.files && list.data.files[0];
    if (!file) return res.status(404).json({ message: 'Archivo no encontrado' });

    await drive.files.delete({ fileId: file.id });
    res.json({ message: 'Archivo eliminado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Error eliminando archivo' });
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Visit /auth to obtain a refresh token (first-run)');
});
