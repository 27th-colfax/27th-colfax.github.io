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

const frequencyUnits = ['days', 'weeks', 'months', 'years']

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
        if (!queryDate.equals(targetDate)) {
            const url = new URL(window.location.href);
            url.searchParams.set('date', targetDate.toFormat("yyyy-MM-dd"));
            window.history.pushState(null, '', url.toString());
        }
    }, [now, targetDate])

    useEffect(() => {
        const listener = (event) => {
            const key = event.key; // "ArrowRight", "ArrowLeft", "ArrowUp", or "ArrowDown"
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
                        const events = allEvents.filter((event) => {
                            const startDate = DateTime.fromISO(event.data.start).startOf('day');
                            const endDate = DateTime.fromISO(event.data.end).endOf('day');
                            if (tileDate >= startDate && tileDate <= endDate) {
                                return true
                            }
                            const frequencies = event.data.frequency
                            const count = event.data.count
                            if (frequencies != null) {
                                return frequencyUnits.some((unit) => {
                                    const value = frequencies[unit]
                                    if (value == null) {
                                        return false
                                    }
                                    const iteration = Math.floor(tileDate.diff(startDate, [unit])[unit] / value)
                                    if (count != null && iteration >= event.data.count) {
                                        return false
                                    }
                                    const offset = { [unit]: Math.max(iteration * value, 0) }

                                    const offsetStartDate = startDate.plus(offset)
                                    const offsetEndDate = endDate.plus(offset)

                                    if (tileDate >= offsetStartDate && tileDate <= offsetEndDate) {
                                        return true
                                    }
                                })
                            }

                            return false
                        })
                        return <Tile key={i} day={tileDate.day} active={active} events={events} />
                    })
                }
            </div>
        </div>
    );
};

export default Calendar
