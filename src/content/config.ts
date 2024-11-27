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
		place: z.object({
			name: z.string().optional(),
			address: z.string().optional(),
			website: z.string().optional(),
			location: z.object({
				latitude: z.number(),
				longitude: z.number(),
			}).optional(),
			phone: z.string().optional(),
			map: z.string().optional(),
		}).optional(),
		start: z.string(),
		end: z.string(),
		series: z.object({
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
			}),
			count: z.number().optional(),
			end: z.string().optional(),
			// dates that are intentionally being left out (not subtracted from count)
			canceledDates: z.array(z.string()).optional(),
			// dates that are accidentally left out (still subtracted from count)
			missedDates: z.array(z.string()).optional(),
		}).optional(),
	}),
})

export const collections = { blog, events };
