import 'dotenv/config';
import app from './src/app.js';

const PORT: number = Number(process.env.PORT) || 3000;

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
});
