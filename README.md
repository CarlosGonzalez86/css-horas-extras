# Node.js + Google Drive backend for CSS - Horas Extras

This backend implements endpoints used by the frontend to upload, list, download and delete files stored in Google Drive.

Features
- OAuth2 flow to obtain a refresh token (route: GET /auth -> consent screen -> /oauth2callback)
- Upload files to Google Drive with an appProperty `tipo` (talonario/cedula)
- List files by `tipo`
- Download files by `tipo` and name
- Delete files by `tipo` and name

Security
- No credentials are committed. Use environment variables or the /auth flow to obtain a refresh token.
- tokens.json is created at runtime (ignored by git).

Quick start
1. Create a Google Cloud project and enable the Drive API.
2. Create OAuth 2.0 Client ID credentials (Application type: Web). Set the authorized redirect URI to: http://localhost:3000/oauth2callback
3. Copy the client ID and client secret into a .env file (use .env.example as template).
4. Start the server: npm install && npm start
5. Visit http://localhost:3000/auth and complete the consent flow. The server will save the refresh token to tokens.json (and prints it).
6. Use the frontend (index.html) configured to point at http://localhost:3000 to upload/list/download files.

Files created by this commit
- server.js
- package.json
- .env.example
- README.md
- .gitignore

If you want, I can also add a small script to exchange a code manually or store the refresh token into .env automatically; right now the server persists the refresh token to tokens.json at runtime after authorization.
