import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Drizzle Kit config — migrations against the local MySQL (see docker-compose.yml).
export default defineConfig({
  dialect: 'mysql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'mysql://bcm:bcm@localhost:3306/brickcity',
  },
});
