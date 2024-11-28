import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import { SITE_TITLE, SITE_DESCRIPTION } from '../consts';
import { getAllEvents } from '../components/calendar';

export async function GET(context) {
	const blog = await getCollection('blog');

	const blogItems = blog.map((post) => ({
		...post.data,
		link: `/blog/${post.slug}/`,
	}))

	const events = await getAllEvents()

	const eventsItems = events.map((event) => ({
		link: `/event/${event.params.date}/${event.params.slug}`,
		pubDate: event.props.interval.start.startOf('day').toISO(),
		title: event.props.title,
		description: event.props.description,
	}))

	const items = [...blogItems, ...eventsItems]

	return rss({
		title: SITE_TITLE,
		description: SITE_DESCRIPTION,
		site: context.site,
		items,
	});
}
