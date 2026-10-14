import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z
    .object({
      title: z.string().min(3, 'Title must be at least 3 characters').max(100).trim(),
      slug: z.string().min(3).max(100).toLowerCase().trim(),
      tagline: z.string().min(10, 'Tagline must be at least 10 characters').max(200).trim(),
      description: z.string().min(20, 'Description must be at least 20 characters'),
      category: z.enum(['Full Stack', 'Systems', '3D / Creative', 'AI / ML', 'DevOps']),
      tags: z.array(z.string().trim()).min(1, 'Provide at least one tag'),
      coverImage: z.object({
        url: z.string().url('Must be a valid image URL'),
        publicId: z.string().min(1, 'Public ID is required'),
      }),
      liveUrl: z.string().url('Must be a valid URL').optional(),
      githubUrl: z.string().url('Must be a valid URL').optional(),
      featured: z.boolean().optional().default(false),
      order: z.number().int().optional().default(0),
    })
    .strict(),
});
