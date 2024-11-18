import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	// Type-check frontmatter using a schema
	schema: z.object({
		title: z.string(),
		description: z.string(),
		// Transform string to Date object
		pubDate: z.coerce.date(),
		updatedDate: z.coerce.date().optional(),
		heroImage: z.string().optional(),
	}),
});

const events = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		location: z.string(),
		date: z.coerce.date(),
		published: z.coerce.date().optional(),
		updated: z.coerce.date().optional(),
	}),
})

export const collections = { blog, events };
