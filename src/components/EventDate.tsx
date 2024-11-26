import { DateTime } from "luxon";
import { eventForDate, type RawCalendarEvent } from "./calendar"

const EventDate = ({ event: rawEvent }: {
    event: RawCalendarEvent
}) => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawDate = urlParams.get('date') ?? '';
    const date = DateTime.fromFormat(rawDate, 'yyyy-MM-dd')
    const event = eventForDate({ date, event: rawEvent })
    const start = event.start
    const end = event.end

    return <div>
        {start.toLocaleString(DateTime.DATE_FULL)} - {end.toLocaleString(DateTime.DATE_FULL)}
    </div>
}

export default EventDate