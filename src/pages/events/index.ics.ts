import ical, { ICalCalendarMethod } from "ical-generator";
import { getAllEvents } from "../../components/calendar";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
    return await getAllEvents()
}

export const GET: APIRoute = async () => {
    const events = await getAllEvents()

    const calendar = ical({ name: '27th Colfax Events' });

    // A method is required for outlook to display event as an invitation
    calendar.method(ICalCalendarMethod.REQUEST);

    calendar.events(events
        .filter(({ props: { canceled, missed } }) => (
            !canceled && !missed)
        )
        .map(({ props: {
            title,
            description,
            place,
            interval: { start, end },
        } }) => ({
            start: start.toJSDate(),
            end: end.toJSDate(),
            summary: title,
            description: description,
            location:
                place?.address ??
                place?.map ??
                (place?.location == null
                    ? null
                    : `geo:${place?.location?.latitude},${place?.location?.latitude}`),
            url: place?.website,
        })));

    const calendarString = calendar.toString();


    return new Response(calendarString, { headers: { "Content-Type": "text/calendar" } })
}
