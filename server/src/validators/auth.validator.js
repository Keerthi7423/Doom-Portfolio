import { z } from 'zod';

export const loginSchema = z.object({
  body: z
    .object({
      email: z
        .string()
        .email('Please provide a valid email address')
        .trim()
        .toLowerCase(),
      password: z
        .string()
        .min(8, 'Password must be at least 8 characters'),
    })
    .strict(), // Rejects unexpected extra fields
});
