import { getCollection } from "astro:content";
import ical, { ICalCalendarMethod } from "ical-generator";
import { DateTime } from "luxon";
import { eventCanceled, eventForDate, eventMissed, matchesConfiguration, type RawCalendarEvent } from "../../../components/calendar";
import type { APIRoute } from "astro";

export async function getStaticPaths() {
    const events = await getCollection("events");

    const oldestEventDate = events
        .map((event) => DateTime.fromISO(event.data.start))
        .reduce((a, b) => (a < b ? a : b));
    const startDate = oldestEventDate.startOf("month").startOf("day");
    const endDate = DateTime.now()
        .plus({ years: 1 })
        .startOf("day")
        .endOf("year");

    const days = Math.ceil(endDate.diff(startDate, ["day"]).days);

    return Array.from({ length: days }).flatMap((_, i) => {
        const date = startDate.plus({ days: i });
        const formattedDate = date.toFormat("yyyy-MM-dd");
        return events
            .filter((event) => {
                return matchesConfiguration({
                    date,
                    event: event.data as RawCalendarEvent,
                });
            })
            .map((rawEvent) => {
                const { slug, data: rawData, render } = rawEvent;
                const { start, end, series, ...data } = rawData;

                const interval = eventForDate({
                    date,
                    originalInterval: { start, end },
                });

                const canceled = eventCanceled({
                    date,
                    canceledDates: series?.canceledDates,
                });
                const missed = eventMissed({
                    date,
                    missedDates: series?.missedDates,
                });

                return {
                    params: { slug, date: formattedDate },
                    props: {
                        ...data,
                        slug,
                        date: formattedDate,
                        interval,
                        canceled,
                        missed,
                        render,
                    },
                };
            });
    });
}

export const GET: APIRoute = ({ props }) => {
    const {
        title,
        description,
        place,
        interval: { start, end },
    } = props;

    const calendar = ical({ name: title });

    // A method is required for outlook to display event as an invitation
    calendar.method(ICalCalendarMethod.REQUEST);

    calendar.createEvent({
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
    });

    const calendarString = calendar.toString();


    return new Response(calendarString, { headers: { "Content-Type": "text/calendar"}})
}
