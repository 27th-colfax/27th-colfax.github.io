import { DateTime } from "luxon";

import './Calendar.css';
import { useEffect, useMemo, useState } from "react";

const Tile = ({ active, day, events }) => {

    return <div className={active ? 'tile' : 'tile background'}>
        {day}
        {
            events.map((event) => {
                return <div key={event.slug}>{event.data.title}</div>
            })
        }
    </div>
}

const Calendar = ({ events: allEvents }) => {
    const now = DateTime.now()

    const urlParams = new URLSearchParams(window.location.search);
    const rawQueryDate = urlParams.get('date');
    const queryDate = useMemo(() => {
        if (rawQueryDate == null) {
            return now
        }

        const queryParamDate = DateTime.fromFormat(rawQueryDate, "yyyy-MM-dd")
        if (!queryParamDate.isValid) {
            return now
        }

        return queryParamDate;
    }, [rawQueryDate])

    const [targetDate, setTargetDate] = useState(queryDate)

    useEffect(() => {
        console.log(now.equals(targetDate))
        if (!queryDate.equals(targetDate)) {
            const url = new URL(window.location.href);
            url.searchParams.set('date', targetDate.toFormat("yyyy-MM-dd"));
            window.history.pushState(null, '', url.toString());
        }
    }, [now, targetDate])

    const monthStart = targetDate.startOf("month");
    const monthEnd = targetDate.endOf("month");

    const dayOffset = monthStart.weekday - 1;
    const daysInMonth = monthEnd.day;
    const weeks = Math.ceil((monthEnd.day + dayOffset) / 7);

    return (
        <div>
            <div>
                <button onClick={() => setTargetDate((currentDate) => currentDate.minus({ months: 1 }))}>{'<'}</button>
                <div>{targetDate.monthLong}</div>
                <button onClick={() => setTargetDate((currentDate) => currentDate.plus({ months: 1 }))}>{'>'}</button>
            </div>
            <div className="calendar">
                {
                    Array.from({ length: weeks * 7 }).map((_, i) => {
                        const active = i >= dayOffset && daysInMonth > i - dayOffset
                        const tileDate = monthStart.plus({ days: i - dayOffset })
                        const events = allEvents.filter((event) => {
                            const date = DateTime.fromJSDate(event.data.date);
                            return tileDate.equals(date)
                        })
                        return <Tile key={i} day={tileDate.day} active={active} events={events} />
                    })
                }
            </div>
        </div>
    );
};

export default Calendar
