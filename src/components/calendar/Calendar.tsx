import { DateTime } from "luxon";

import './Calendar.css';
import { useEffect, useMemo, useState } from "react";
import { eventForDate, matchesConfiguration, type CalendarEvent, type RawCalendarEvent } from "./helpers";

const Tile = ({ active, day, events }: {
    active: boolean,
    day: number,
    events: {
        slug: string,
        title: string,
        data: CalendarEvent
    }[],
}) => {
    return <div className={active ? 'tile' : 'tile background'}>
        {day}
        {
            events.map((event) => {
                let queryParams = {
                    date: event.data.start.toFormat('yyyy-MM-dd')
                };

                // remove undefined and null values
                const queryString = new URLSearchParams(
                    Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v != null))
                ).toString();

                return <a href={`/event/${event.slug}?${queryString}`} key={`${event.slug}-${event.data.start.toFormat("yyyy-MM-dd")}`}>{event.title}</a>
            })
        }
    </div>
}

const Calendar = ({ events: allEvents }: {
    events: {
        slug: string,
        title: string,
        data: RawCalendarEvent
    }[]
}) => {
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

    const [targetDate, setTargetDate] = useState<DateTime>(queryDate)

    useEffect(() => {
        if (!queryDate.equals(targetDate)) {
            const url = new URL(window.location.href);
            url.searchParams.set('date', targetDate.toFormat("yyyy-MM-dd"));
            window.history.pushState(null, '', url.toString());
        }
    }, [now, targetDate])

    useEffect(() => {
        const listener = (keyEvent: KeyboardEvent) => {
            const key = keyEvent.key;
            if (key === 'ArrowRight') {
                setTargetDate((currentDate) => currentDate.plus({ months: 1 }))
            } else if (key === 'ArrowLeft') {
                setTargetDate((currentDate) => currentDate.minus({ months: 1 }))
            }
        }
        window.addEventListener('keydown', listener);
        () => window.removeEventListener('keydown', listener)
    }, [])

    const monthStart = targetDate.startOf("month");
    const monthEnd = targetDate.endOf("month");

    const dayOffset = monthStart.weekday;
    const daysInMonth = monthEnd.day;
    const weeks = Math.ceil((monthEnd.day + dayOffset) / 7);

    const events = Array.from({ length: weeks * 7 }).flatMap((_, i) => {
        const date = monthStart.plus({ days: i - dayOffset })
        return allEvents.filter((event) => {
            return matchesConfiguration({
                date, event: event.data,
            })
        }).map((event) => {
            return {
                slug: event.slug,
                title: event.title,
                data: eventForDate({
                    date, event: event.data,
                })
            }
        })
    })

    return (
        <div>
            <div className="calendar-date-selector">
                <button onClick={() => setTargetDate((currentDate) => currentDate.minus({ months: 1 }))}>{'<'}</button>
                <div>{targetDate.year} {targetDate.monthLong}</div>
                <button onClick={() => setTargetDate((currentDate) => currentDate.plus({ months: 1 }))}>{'>'}</button>
            </div>
            <div className="calendar">
                <div>Sunday</div>
                <div>Monday</div>
                <div>Tuesday</div>
                <div>Wednesday</div>
                <div>Thursday</div>
                <div>Friday</div>
                <div>Saturday</div>
                {
                    Array.from({ length: weeks * 7 }).map((_, i) => {
                        const active = i >= dayOffset && daysInMonth > i - dayOffset
                        const tileDate = monthStart.plus({ days: i - dayOffset })

                        const tileEvents = events.filter((event) => (
                            tileDate <= event.data.start.startOf('day') && tileDate >= event.data.end.startOf('day')
                        ))

                        return <Tile key={i} day={tileDate.day} active={active} events={tileEvents} />
                    })
                }
            </div>
        </div>
    );
};

export default Calendar
