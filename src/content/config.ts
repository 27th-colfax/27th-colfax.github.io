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
		headerImage: z.string().optional(),
		locationAddress: z.string().optional(),
		locationName: z.string().optional(),
		locationMap: z.string().optional(),
		locationLink: z.string().optional(),
		locationWebsite: z.string().optional(),
		start: z.string(),
		end: z.string(),
		frequency: z.object({
			days: z.number().optional(),
			weekly: z.object({
				days: z.array(z.string()).optional(),
				weeks: z.number().optional(),
			}).optional(),
			monthly: z.object({
				months: z.number().optional(),
				days: z.array(z.number()).optional(),
				weekdays: z.array(
					z.object({
						weekday: z.string().optional(),
						week: z.number().optional(),
					})
				).optional(),
			}).optional(),
			years: z.number().optional()
		}).optional(),
		count: z.number().optional(),
	}),
})

export const collections = { blog, events };
