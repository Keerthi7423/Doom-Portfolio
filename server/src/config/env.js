import dotenv from 'dotenv';
import { z } from 'zod';

// 1. Load the raw .env file into Node's process.env
dotenv.config();

// 2. Define the exact contract of what environment variables MUST exist
const envSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  PORT: z
    .coerce
    .number()
    .default(5000),
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required to connect to MongoDB Atlas'),
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173,http://localhost:3000'),
  ACCESS_TOKEN_SECRET: z
    .string()
    .min(16, 'ACCESS_TOKEN_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_EXPIRY: z.string().default('30m'),
  REFRESH_TOKEN_SECRET: z
    .string()
    .min(16, 'REFRESH_TOKEN_SECRET must be at least 16 characters'),
  REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
});

// 3. Validate process.env against our schema
const parsedEnv = envSchema.safeParse(process.env);

// 4. Fail-Fast guard: If validation fails, halt the server immediately
if (!parsedEnv.success) {
  console.error('❌ Configuration error: Invalid or missing environment variables:');
  parsedEnv.error.issues.forEach((issue) => {
    console.error(`   - [${issue.path.join('.')}]: ${issue.message}`);
  });
  process.exit(1);
}

// 5. Export the clean, validated configuration
export const config = parsedEnv.data;
