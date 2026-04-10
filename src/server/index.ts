import { createDb } from './db/client';
import { migrate } from './db/migrate';
import { createApp } from './routes';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  // Create and migrate database
  const db = createDb();
  await migrate(db.db);
  console.log('Database initialized');

  // Create Express app
  const app = createApp(db);

  // Serve static files in production
  if (process.env.NODE_ENV === 'production') {
    const clientDistPath = path.join(__dirname, '../../dist/client');
    app.use(express.static(clientDistPath));
    
    // For any non-API route, serve the index.html
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(clientDistPath, 'index.html'));
      }
    });
  }

  // Start server
  const port = process.env.PORT ?? 3001;
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
    console.log(`API available at http://localhost:${port}/api`);
    
    if (process.env.NODE_ENV === 'production') {
      console.log(`Static files served from dist/client`);
    }
  });
}

main().catch((error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});