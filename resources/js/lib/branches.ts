import type { Branch } from '@/types';

/**
 * Branch helpers for the public pages: opening hours, "open now" and
 * distances for the nearest-branch sort.
 *
 * Opening hours are free text typed by admins, such as
 * "Mon-Sat 9:00-21:00, Sun 10:00-18:00" or "Daily 10:00-22:00".
 * parseOpeningHours() understands that common form. For anything else it
 * returns null, and pages show the text exactly as typed.
 *
 * This file only has type imports, so `node tests/js/branches.check.ts`
 * can run it without a bundler.
 */

/** Same zone as TIME_ZONE in lib/format.ts: every branch is in Malaysia. */
const TIME_ZONE = 'Asia/Kuala_Lumpur';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const ALL_WEEK = [0, 1, 2, 3, 4, 5, 6];

/*
|--------------------------------------------------------------------------
| Opening hours
|--------------------------------------------------------------------------
*/

export type OpeningPeriod = {
    /** The days as shown, e.g. "Mon–Sat", "Sun" or "Daily". */
    days: string;
    /** The weekdays it covers: 0 = Sunday … 6 = Saturday. */
    weekdays: number[];
    /** Minutes after midnight, or null when closed on those days. */
    opens: number | null;
    closes: number | null;
    /** The hours as shown, e.g. "9:00–21:00" or "Closed". */
    hours: string;
};

const TIME = String.raw`(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)?`;
const PERIOD = new RegExp(
    String.raw`^(.+?)\s*:?\s+${TIME}\s*(?:-|–|—|to)\s*${TIME}$`,
    'i',
);
const CLOSED = /^(.+?)\s*:?\s+closed$/i;

function dayIndex(token: string): number | null {
    const match = /^([a-z]{3})[a-z]*\.?$/i.exec(token.trim());

    if (!match) {
        return null;
    }

    const index = DAYS.findIndex(
        (day) => day.toLowerCase() === match[1].toLowerCase(),
    );

    return index === -1 ? null : index;
}

/** "Mon-Sat", "Daily", "Sat & Sun", "Weekends" → the days and their label. */
function parseDays(text: string): { days: string; weekdays: number[] } | null {
    const value = text.trim().replace(/\s+/g, ' ');
    const lower = value.toLowerCase();

    if (['daily', 'every day', 'everyday', 'mon-sun'].includes(lower)) {
        return { days: 'Daily', weekdays: [...ALL_WEEK] };
    }

    if (lower === 'weekdays') {
        return { days: 'Mon–Fri', weekdays: [1, 2, 3, 4, 5] };
    }

    if (lower === 'weekends') {
        return { days: 'Sat & Sun', weekdays: [6, 0] };
    }

    const range = /^(\S+)\s*(?:-|–|—|to)\s*(\S+)$/i.exec(value);

    if (range) {
        const from = dayIndex(range[1]);
        const to = dayIndex(range[2]);

        if (from === null || to === null) {
            return null;
        }

        const weekdays: number[] = [];

        for (let day = from; ; day = (day + 1) % 7) {
            weekdays.push(day);

            if (day === to) {
                break;
            }
        }

        return {
            days: weekdays.length === 7 ? 'Daily' : `${DAYS[from]}–${DAYS[to]}`,
            weekdays,
        };
    }

    const list = value.split(/\s*(?:&|\/|\band\b)\s*/i);
    const weekdays = list.map(dayIndex);

    if (weekdays.some((day) => day === null)) {
        return null;
    }

    return {
        days: weekdays.map((day) => DAYS[day as number]).join(' & '),
        weekdays: weekdays as number[],
    };
}

/** "9", "09:00", "9.30", "9pm" → minutes after midnight. */
function toMinutes(
    hours: string,
    minutes: string | undefined,
    meridiem: string | undefined,
): number | null {
    let hour = Number(hours);
    const minute = minutes === undefined ? 0 : Number(minutes);

    if (meridiem) {
        if (hour < 1 || hour > 12) {
            return null;
        }

        hour = (hour % 12) + (meridiem.toLowerCase() === 'pm' ? 12 : 0);
    }

    if (hour > 24 || minute > 59) {
        return null;
    }

    return hour * 60 + minute;
}

/** 540 → "9:00", 1260 → "21:00". */
export function formatClock(minutes: number): string {
    const value = minutes % (24 * 60);

    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

/**
 * "Mon-Sat 9:00-21:00, Sun 10:00-18:00" → one period per part, or null
 * when any part is not in that form.
 */
export function parseOpeningHours(
    text: string | null | undefined,
): OpeningPeriod[] | null {
    const parts = (text ?? '')
        .split(/[,;\n]/)
        .map((part) => part.trim())
        .filter(Boolean);

    if (parts.length === 0) {
        return null;
    }

    const periods: OpeningPeriod[] = [];

    for (const part of parts) {
        const closed = CLOSED.exec(part);

        if (closed) {
            const days = parseDays(closed[1]);

            if (!days) {
                return null;
            }

            periods.push({
                ...days,
                opens: null,
                closes: null,
                hours: 'Closed',
            });

            continue;
        }

        const match = PERIOD.exec(part);
        const days = match ? parseDays(match[1]) : null;

        if (!match || !days) {
            return null;
        }

        const opens = toMinutes(match[2], match[3], match[4]);
        const closes = toMinutes(match[5], match[6], match[7]);

        if (opens === null || closes === null) {
            return null;
        }

        periods.push({
            ...days,
            opens,
            // Hours past midnight ("18:00-02:00") close the next day.
            closes: closes <= opens ? closes + 24 * 60 : closes,
            hours: `${formatClock(opens)}–${formatClock(closes)}`,
        });
    }

    return periods;
}

/** The period that covers a weekday (the first one listed wins). */
export function periodOn(
    periods: readonly OpeningPeriod[],
    weekday: number,
): OpeningPeriod | null {
    return periods.find((period) => period.weekdays.includes(weekday)) ?? null;
}

const clockParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
});

/** The weekday (0 = Sunday) and minutes after midnight in Kuala Lumpur. */
export function kualaLumpurClock(now: Date): {
    weekday: number;
    minutes: number;
} {
    const parts: Record<string, string> = {};

    for (const part of clockParts.formatToParts(now)) {
        parts[part.type] = part.value;
    }

    return {
        weekday: DAYS.indexOf(parts.weekday),
        minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
    };
}

export type OpenStatus = {
    open: boolean;
    /** "Open now" or "Closed now". */
    label: string;
    /** "until 21:00", "opens 10:00", "opens tomorrow 9:00", "opens Mon 9:00". */
    detail: string | null;
};

/** Whether a branch is open at `now`, and when that changes. */
export function openStatus(
    periods: readonly OpeningPeriod[],
    now: Date,
): OpenStatus {
    const { weekday, minutes } = kualaLumpurClock(now);
    const today = periodOn(periods, weekday);

    // Still open from yesterday's late hours ("18:00-02:00").
    const yesterday = periodOn(periods, (weekday + 6) % 7);

    if (
        yesterday &&
        yesterday.closes !== null &&
        minutes < yesterday.closes - 24 * 60
    ) {
        return {
            open: true,
            label: 'Open now',
            detail: `until ${formatClock(yesterday.closes)}`,
        };
    }

    if (today && today.opens !== null && today.closes !== null) {
        if (minutes >= today.opens && minutes < today.closes) {
            return {
                open: true,
                label: 'Open now',
                detail: `until ${formatClock(today.closes)}`,
            };
        }

        if (minutes < today.opens) {
            return {
                open: false,
                label: 'Closed now',
                detail: `opens ${formatClock(today.opens)}`,
            };
        }
    }

    for (let ahead = 1; ahead <= 7; ahead++) {
        const day = (weekday + ahead) % 7;
        const next = periodOn(periods, day);

        if (next && next.opens !== null) {
            const when = ahead === 1 ? 'tomorrow' : DAYS[day];

            return {
                open: false,
                label: 'Closed now',
                detail: `opens ${when} ${formatClock(next.opens)}`,
            };
        }
    }

    return { open: false, label: 'Closed', detail: null };
}

/*
|--------------------------------------------------------------------------
| Distances
|--------------------------------------------------------------------------
*/

export type Coordinates = {
    latitude: number;
    longitude: number;
};

/** Straight-line distance in kilometres (haversine). */
export function distanceKm(from: Coordinates, to: Coordinates): number {
    const radians = (degrees: number): number => (degrees * Math.PI) / 180;
    const dLat = radians(to.latitude - from.latitude);
    const dLng = radians(to.longitude - from.longitude);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(radians(from.latitude)) *
            Math.cos(radians(to.latitude)) *
            Math.sin(dLng / 2) ** 2;

    return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const oneDecimalKm = new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

const wholeKm = new Intl.NumberFormat('en-MY', { maximumFractionDigits: 0 });

/** 2.43 → "2.4 km", 12.6 → "13 km". */
export function formatDistance(km: number): string {
    if (km < 0.1) {
        return 'Under 0.1 km';
    }

    return `${km < 10 ? oneDecimalKm.format(km) : wholeKm.format(km)} km`;
}

/*
|--------------------------------------------------------------------------
| Links
|--------------------------------------------------------------------------
*/

/** The id of a branch's card on the branches page, e.g. "branch-pj-ss2". */
export function branchAnchor(branch: Pick<Branch, 'code'>): string {
    return `branch-${branch.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

/** Driving directions in Google Maps (opens outside Kotak). */
export function directionsUrl(branch: Coordinates): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${branch.latitude},${branch.longitude}`;
}

/** An address or a pin in Google Maps (opens outside Kotak). */
export function mapSearchUrl(place: string | Coordinates): string {
    const query =
        typeof place === 'string'
            ? place
            : `${place.latitude},${place.longitude}`;

    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
