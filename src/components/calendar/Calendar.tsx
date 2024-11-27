import { DateTime } from "luxon";

import './Calendar.css';
import { useEffect, useMemo, useState } from "react";
import { eventCanceled, eventForDate, eventMissed, matchesConfiguration, type RawCalendarEvent } from "./helpers";

const Tile = ({ active, day, events }: {
    active: boolean,
    day: number,
    events: {
        slug: string,
        title: string,
        interval: {
            start: DateTime,
            end: DateTime,
        }
    }[],
}) => {
    return <div className={active ? 'tile' : 'tile background'}>
        {day}
        {
            events.map((event) => {
                const date = event.interval.start.toFormat('yyyy-MM-dd')

                return <a href={`/event/${date}/${event.slug}`} key={`${event.slug}-${event.interval.start.toFormat("yyyy-MM-dd")}`}>{event.title}</a>
            })
        }
    </div>
}

const useInitialMonth = (events: RawCalendarEvent[]) => {
    return useMemo(() => {
        const now = DateTime.now().startOf('day')
        const nextMonthEnd = now.plus({ months: 1 }).endOf('month')
        const searchDays = nextMonthEnd.diff(now, ['days']).days
        return (Array.from({ length: searchDays }, (_, i) => now.plus({ days: i })).find((searchDay) => {
            return events.some((event) => (
                matchesConfiguration({
                    date: searchDay, event: event,
                })
            ))
        }) ?? now).startOf('month')
    }, [])
}

const useEvents = ({ weeks, monthStart, dayOffset, events}: {
    weeks: number;
    monthStart: DateTime;
    dayOffset: number;
    events: {
        slug: string;
        title: string;
        data: RawCalendarEvent;
    }[]
}) => {
    return useMemo(() => {
        return Array.from({ length: weeks * 7 }).flatMap((_, i) => {
            const date = monthStart.plus({ days: i - dayOffset })
            return events.filter((event) => {
                return matchesConfiguration({
                    date, event: event.data,
                })
                    && !eventMissed({ date, missedDates: event.data.series?.missedDates })
                    && !eventCanceled({ date, canceledDates: event.data.series?.canceledDates })
            }).map((event) => {
                return {
                    slug: event.slug,
                    title: event.title,
                    interval: eventForDate({
                        date, originalInterval: {
                            start: event.data.start,
                            end: event.data.end
                        },
                    }),
                }
            })
        })
    }, [weeks, monthStart, dayOffset, events])
}


const Calendar = ({ events: allEvents }: {
    events: {
        slug: string,
        title: string,
        data: RawCalendarEvent
    }[]
}) => {
    const initialMonth = useInitialMonth(allEvents.map((event) => event.data))

    const urlParams = new URLSearchParams(window.location.search);
    const rawQueryDate = urlParams.get('date');
    const queryDate = useMemo(() => {
        if (rawQueryDate == null) {
            return initialMonth
        }

        const queryParamDate = DateTime.fromFormat(rawQueryDate, "yyyy-MM-dd")
        if (!queryParamDate.isValid) {
            return initialMonth
        }

        return queryParamDate;
    }, [rawQueryDate])

    const [targetDate, setTargetDate] = useState<DateTime>(queryDate)

    useEffect(() => {
        if (!queryDate.equals(targetDate)) {
            const url = new URL(window.location.href);
            if (targetDate.equals(initialMonth)) {
                url.searchParams.delete('date');
            } else {
                url.searchParams.set('date', targetDate.toFormat("yyyy-MM-dd"));

            }
            window.history.replaceState(null, '', url.toString());
        }
    }, [queryDate, targetDate])

    useEffect(() => {
        const listener = (keyEvent: KeyboardEvent) => {
            if (keyEvent.altKey) {
                return
            }
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

    const events = useEvents({
        weeks,
        monthStart,
        dayOffset,
        events: allEvents,
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
                            tileDate <= event.interval.start.startOf('day') && tileDate >= event.interval.end.startOf('day')
                        ))

                        return <Tile key={i} day={tileDate.day} active={active} events={tileEvents} />
                    })
                }
            </div>
        </div>
    );
};

export default Calendar
