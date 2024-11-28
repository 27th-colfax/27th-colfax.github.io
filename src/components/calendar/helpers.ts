import { getCollection } from "astro:content";
import { DateTime } from "luxon";


const getWeekDay = (weekday: string) => {
    switch (weekday) {
        case 'monday': return 1;
        case 'tuesday': return 2;
        case 'wednesday': return 3;
        case 'thursday': return 4;
        case 'friday': return 5;
        case 'saturday': return 6;
        case 'sunday': return 7;
    }
    console.warn(`unknown week date of "${weekday}" defaulting to monday`)
    return 1
}

type EventSeries = {
    frequency: {
        days: number | undefined;
        weekly: {
            days: string[] | undefined;
            weeks: number | undefined;
        } | undefined;
        monthly: {
            months: number | undefined;
            days: number[] | undefined;
            weekdays: {
                weekday: string | undefined;
                week: number | undefined;
            }[] | undefined;
        } | undefined;
        years: number | undefined;
    } | undefined;
    count: number | undefined;
    end: DateTime | undefined,
    canceledDates: DateTime[] | undefined;
    missedDates: DateTime[] | undefined;
}

export type CalendarEvent = {
    start: DateTime;
    end: DateTime;
    series: EventSeries | undefined,
}


type RawEventSeries = {
    frequency: {
        days: number | undefined;
        weekly: {
            days: string[] | undefined;
            weeks: number | undefined;
        } | undefined;
        monthly: {
            months: number | undefined;
            days: number[] | undefined;
            weekdays: {
                weekday: string | undefined;
                week: number | undefined;
            }[] | undefined;
        } | undefined;
        years: number | undefined;
    } | undefined;
    count: number | undefined;
    end: string | undefined;
    canceledDates: string[] | undefined;
    missedDates: string[] | undefined;
}

export type RawCalendarEvent = {
    start: string,
    end: string,
    series: RawEventSeries | undefined,
}

export const eventForDate = ({
    date,
    originalInterval: { start: rawStart, end: rawEnd },
}: {
    date: DateTime
    originalInterval: {
        start: string,
        end: string,
    }
}): {
    start: DateTime,
    end: DateTime,
} => {

    const start = DateTime.fromISO(rawStart);
    const startDate = start.startOf('day')
    const end = DateTime.fromISO(rawEnd);

    const dateOffset = date.diff(startDate)

    return {
        start: start.plus(dateOffset),
        end: end.plus(dateOffset)
    }
}

export const eventCanceled = ({date, canceledDates}: {date: DateTime, canceledDates: string[] | undefined}) => {
    return canceledDates?.some((canceledDate) => {
        return DateTime.fromISO(canceledDate).equals(date)
    }) ?? false
}

export const eventMissed = ({date, missedDates}: {date: DateTime, missedDates: string[] | undefined}) => {
    return missedDates?.some((missedDate) => {
        return DateTime.fromISO(missedDate).equals(date)
    }) ?? false
}

export const matchesConfiguration = ({
    date,
    event,
}: {
    date: DateTime
    event: RawCalendarEvent
}) => {
    const startDate = DateTime.fromISO(event.start).startOf('day');

    if (date.equals(startDate)) {
        return true
    }

    if (event.series?.frequency != null) {
        const frequency = event.series.frequency
        const canceledCount = event.series.canceledDates == null ? 0 : event.series.canceledDates.filter((canceledDate) => (
            DateTime.fromISO(canceledDate) < date
        )).length
        const count = event.series.count == null ? undefined : event.series.count - canceledCount
        const rawSeriesEnd = event.series.end

        if (rawSeriesEnd != null) {
            const seriesEnd = DateTime.fromISO(rawSeriesEnd)
            if (seriesEnd < date) {
                return false
            }
        }

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
                years: frequency.years,
                count,
            })
        }
    }
    return false
}

const matchesDayConfiguration = ({
    date,
    startDate,
    daysInterval: rawDaysInterval,
    count,
}: {
    date: DateTime,
    startDate: DateTime,
    daysInterval: number,
    count: number | undefined,
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
}: {
    date: DateTime,
    startDate: DateTime,
    weeksInterval: number | undefined,
    daysOfWeek: string[] | undefined,
    count: number | undefined,
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
    weekdays,
    monthsInterval: rawMonthsInterval,
    count,
}: {
    date: DateTime,
    startDate: DateTime,
    weekdays: {
        weekday: string | undefined,
        week: number | undefined,
    }[],
    monthsInterval: number | undefined,
    count: number | undefined,
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
}: {
    date: DateTime,
    startDate: DateTime,
    days: number[] | undefined,
    monthsInterval: number | undefined,
    count: number | undefined,
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
}: {
    date: DateTime,
    startDate: DateTime,
    years: number,
    count: number | undefined,
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

export const getAllEvents = async () => {
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