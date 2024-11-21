import { DateTime } from "luxon";

import './Calendar.css';
import { useEffect, useMemo, useState } from "react";

const Tile = ({ active, day, events }) => {
    return <div className={active ? 'tile' : 'tile background'}>
        {day}
        {
            events.map((event) => {
                let queryParams = {
                    day: event.data.start.toFormat('yyyy-MM-dd')
                };

                // remove undefined and null values
                const queryString = new URLSearchParams(
                    Object.fromEntries(Object.entries(queryParams).filter(([_, v]) => v != null))
                ).toString();


                return <a href={`/event/${event.slug}?${queryString}`} key={`${event.slug}-${event.data.start.toFormat("yyyy-MM-dd")}`}>{event.data.title}</a>
            })
        }
    </div>
}

const getWeekDay = (weekday) => {
    switch (weekday) {
        case 'monday': return 1;
        case 'tuesday': return 2;
        case 'wednesday': return 3;
        case 'thursday': return 4;
        case 'friday': return 5;
        case 'saturday': return 6;
        case 'sunday': return 7;
    }
}

const eventForDate = ({
    date,
    event,
}) => {
    const start = DateTime.fromISO(event.data.start);
    const startDate = start.startOf('day')
    const end = DateTime.fromISO(event.data.end);

    const dateOffset = date.diff(startDate)

    return {
        ...event,
        data: {
            ...event.data,
            start: start.plus(dateOffset),
            end: end.plus(dateOffset),
        }
    }
}

const matchesConfiguration = ({
    event,
    date,
}) => {
    const startDate = DateTime.fromISO(event.data.start).startOf('day');

    if (date.equals(startDate)) {
        return true
    }

    if (event.data.frequency != null) {
        const frequency = event.data.frequency
        const count = event.data.count

        if (frequency.days != null) {
            const answer = matchesDayConfiguration({
                date,
                startDate,
                daysInterval: frequency.days,
                count,
            })
            if (answer != null) {
                return answer
            }
        } else if (frequency.weekly != null) {
            const answer = matchesWeekConfiguration({
                date,
                startDate,
                weeksInterval: frequency.weekly.weeks,
                daysOfWeek: frequency.weekly.days,
                count,
            })
            if (answer != null) {
                return answer
            }
        } else if (frequency.monthly != null) {
            if (frequency.monthly.weekdays != null) {
                const answer = matchesMonthWeekdayConfiguration({
                    date,
                    startDate,
                    weekdays: frequency.monthly.weekdays,
                    monthsInterval: frequency.monthly.months,
                    count,
                })
                if (answer != null) {
                    return answer
                }
            }
            else {
                const answer = matchesMonthDayConfiguration({
                    date,
                    startDate,
                    monthsInterval: frequency.monthly.months,
                    days: frequency.monthly.days,
                    count,
                })
                if (answer != null) {
                    return answer
                }
            }
        } else if (frequency.years != null) {
            matchesYearConfiguration({
                date,
                startDate,
                years: frequency.yearly,
                count,
            })
        }
    }
}

const matchesDayConfiguration = ({
    date,
    startDate,
    daysInterval: rawDaysInterval,
    count,
}) => {
    const daysInterval = rawDaysInterval ?? 1
    const elapsed = Math.floor(date.diff(startDate, ['days']).days / daysInterval)
    if (count != null && elapsed >= count) {
        return false
    }
    const offset = { days: Math.max(elapsed * daysInterval, 0) }
    const offsetStartDate = startDate.plus(offset)

    if (date.equals(offsetStartDate)) {
        return true
    }
}

const matchesWeekConfiguration = ({
    date,
    startDate,
    weeksInterval: rawWeeksInterval,
    daysOfWeek: rawDaysOfWeek,
    count,
}) => {
    const weeksInterval = rawWeeksInterval ?? 1
    const daysOfWeek = rawDaysOfWeek?.map(getWeekDay) ?? [startDate.weekday]

    const startWeek = startDate.startOf('week')
    const dateWeek = date.startOf('week')

    const intervalsElapsed = Math.floor(dateWeek.diff(startWeek, ['weeks']).weeks / weeksInterval)

    const intervalWeek = startWeek.plus({ weeks: intervalsElapsed * weeksInterval })

    const daysThroughInterval = date.diff(intervalWeek, ['days']).days + 1

    const startDateAdjustment = daysOfWeek.filter((dayOfWeek) => dayOfWeek < startDate.weekday).length
    const daysElapsedInCurrentWeek = daysOfWeek.filter((dayOfWeek) => dayOfWeek <= daysThroughInterval).length
    const intervalsDays = daysOfWeek.length * intervalsElapsed
    const daysElapsed = intervalsDays + daysElapsedInCurrentWeek - startDateAdjustment

    if (count != null && daysElapsed > count) {
        return false
    }

    const offsetWeekStart = startDate.startOf('week').plus({ weeks: intervalsElapsed * weeksInterval })

    return daysOfWeek.some((dayOfWeek) => {
        const weekday = offsetWeekStart.plus({ days: dayOfWeek - 1 })
        return date.equals(weekday) && weekday > startDate
    })
}

const matchesMonthWeekdayConfiguration = ({
    date,
    startDate,
    monthsInterval: rawMonthsInterval,
    weekdays,
    count,
}) => {
    const monthsInterval = rawMonthsInterval ?? 1
    const defaultWeek = Math.floor(startDate.day / 7)

    const startMonth = startDate.startOf('month')
    const dateMonth = date.startOf('month')

    const weekDayOffsets = weekdays.length == 0 ? [
        (7 * defaultWeek) + (startDate.weekday - dateMonth.weekday + 7) % 7
    ] : weekdays.map(({ week, weekday }) => {
        return (7 * (week ?? defaultWeek)) + ((weekday == null ? startDate.weekday : getWeekDay(weekday)) - dateMonth.weekday + 7) % 7
    })

    const intervalsElapsed = Math.ceil(-startDate.diff(dateMonth, ["months"]).months / monthsInterval)

    const intervalMonth = startMonth.plus({ months: intervalsElapsed * monthsInterval })

    const daysThroughInterval = date.diff(intervalMonth, ['days']).days + 1

    const startDateAdjustment = weekDayOffsets.filter((weekday) => weekday < startDate.day).length
    const daysElapsedInCurrentInterval = weekDayOffsets.filter((weekday) => weekday <= daysThroughInterval).length
    const intervalsDays = weekDayOffsets.length * intervalsElapsed
    const daysElapsed = intervalsDays + daysElapsedInCurrentInterval - startDateAdjustment

    // TODO: check this is working
    if (count != null && daysElapsed > count) {
        return false
    }

    const offsetMonth = startMonth.plus({ months: intervalsElapsed * monthsInterval })

    return weekDayOffsets.some((weekDayOffset) => {
        const monthDate = offsetMonth.plus({ days: weekDayOffset })

        return date.equals(monthDate) && monthDate > startDate
    })
}

const matchesMonthDayConfiguration = ({
    date,
    startDate,
    days: rawDays,
    monthsInterval: rawMonthsInterval,
    count,
}) => {
    const monthsInterval = rawMonthsInterval ?? 1

    // when given the 10th day of a month 2nd is selected for some reason
    const days = rawDays ?? [startDate.day]

    const startMonth = startDate.startOf('month')
    const dateMonth = date.startOf('month')

    const intervalsElapsed = Math.ceil(-startDate.diff(dateMonth, ["months"]).months / monthsInterval)

    const intervalMonth = startMonth.plus({ months: intervalsElapsed * monthsInterval })

    const daysThroughInterval = date.diff(intervalMonth, ['days']).days + 1

    // logic on these needs to be checked
    const startDateAdjustment = days.filter((day) => day < startDate.day).length
    const daysElapsedInCurrentInterval = days.filter((day) => day <= daysThroughInterval).length
    const intervalsDays = days.length * intervalsElapsed
    const daysElapsed = intervalsDays + daysElapsedInCurrentInterval - startDateAdjustment

    // TODO: check this is working
    if (count != null && daysElapsed > count) {
        return false
    }

    const offsetMonthStart = startDate.startOf('month').plus({ months: intervalsElapsed * monthsInterval })

    return days.some((day) => {
        const monthDay = offsetMonthStart.plus({ days: day - 1 })
        return date.equals(monthDay) && monthDay > startDate
    })
}

const matchesYearConfiguration = ({
    date,
    startDate,
    years: rawYears,
    count,
}) => {
    const years = rawYears ?? 1

    const elapsed = Math.floor(date.diff(startDate, ['years']).years / years)
    if (count != null && elapsed >= count) {
        return false
    }
    const offset = { years: Math.max(elapsed * years, 0) }
    const offsetStartDate = startDate.plus(offset)

    if (date.equals(offsetStartDate)) {
        return true
    }
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
        if (!queryDate.equals(targetDate)) {
            const url = new URL(window.location.href);
            url.searchParams.set('date', targetDate.toFormat("yyyy-MM-dd"));
            window.history.pushState(null, '', url.toString());
        }
    }, [now, targetDate])

    useEffect(() => {
        const listener = (event) => {
            const key = event.key;
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
                date, event,
            })
        }).map((event) => {
            return eventForDate({
                date, event,
            })
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
