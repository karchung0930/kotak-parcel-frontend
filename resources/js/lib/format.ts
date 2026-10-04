/**
 * Display helpers shared by every page.
 *
 * The server sends money as integer sen, weights as integer grams,
 * dimensions as whole centimetres and timestamps as ISO 8601 UTC strings.
 * Everything is shown the Malaysian way, in Kuala Lumpur time, whatever the
 * visitor's own time zone is.
 *
 * This file has no imports so that `npm run test:format` can run it in Node.
 */

export const TIME_ZONE = 'Asia/Kuala_Lumpur';

/** Shown in place of a missing value. */
export const EMPTY = '—';

const MONTHS = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/*
|--------------------------------------------------------------------------
| Money, weight and size
|--------------------------------------------------------------------------
*/

const money = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
});

const oneDecimal = new Intl.NumberFormat('en-MY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
});

/** 1800 → "RM 18.00". */
export function formatMoney(sen: number | null | undefined): string {
    if (sen === null || sen === undefined || !Number.isFinite(sen)) {
        return EMPTY;
    }

    return money.format(sen / 100);
}

/** 6000 → "6.0 kg". */
export function formatWeight(grams: number | null | undefined): string {
    if (grams === null || grams === undefined || !Number.isFinite(grams)) {
        return EMPTY;
    }

    return `${oneDecimal.format(grams / 1000)} kg`;
}

/**
 * 500 → "0.5 kg", 1000 → "1 kg", 2250 → "2.25 kg": a weight as people
 * write it, for weight bands and limits.
 */
export function formatKg(grams: number | null | undefined): string {
    if (grams === null || grams === undefined || !Number.isFinite(grams)) {
        return EMPTY;
    }

    return `${Number((grams / 1000).toFixed(3))} kg`;
}

/** (40, 30, 25) → "40 × 30 × 25 cm". */
export function formatDimensions(
    lengthCm: number | null | undefined,
    widthCm: number | null | undefined,
    heightCm: number | null | undefined,
): string {
    if (!lengthCm || !widthCm || !heightCm) {
        return EMPTY;
    }

    return `${lengthCm} × ${widthCm} × ${heightCm} cm`;
}

/** 2.44 → "2.4", 3 → "3.0": one decimal, e.g. days in statistics. */
export function formatDecimal(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return EMPTY;
    }

    return oneDecimal.format(value);
}

/** 96.4 → "96.4%", 100 → "100%": at most one decimal. */
export function formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined || !Number.isFinite(value)) {
        return EMPTY;
    }

    return `${oneDecimal.format(value).replace(/\.0$/, '')}%`;
}

/** (1, 'parcel') → "1 parcel", (3, 'parcel') → "3 parcels". */
export function pluralize(
    count: number,
    singular: string,
    plural = `${singular}s`,
): string {
    return `${count} ${count === 1 ? singular : plural}`;
}

/*
|--------------------------------------------------------------------------
| Dates and times (Asia/Kuala_Lumpur)
|--------------------------------------------------------------------------
|
| Built from parts with fixed English month names, so the output is the
| same in every browser ("29 Sep 2026, 14:05", never "29 Sept 2026").
|
*/

type DateParts = {
    year: number;
    month: number;
    day: number;
    weekday: number;
    hour: number | null;
    minute: number | null;
};

const zonedParts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
});

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Split a timestamp into its Kuala Lumpur date and time. A plain
 * "YYYY-MM-DD" date (like scheduled_for) is a calendar day with no time.
 */
function toParts(value: string | Date | null | undefined): DateParts | null {
    if (value === null || value === undefined || value === '') {
        return null;
    }

    if (typeof value === 'string') {
        const dateOnly = DATE_ONLY.exec(value);

        if (dateOnly) {
            const [year, month, day] = dateOnly.slice(1).map(Number);

            return {
                year,
                month,
                day,
                weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
                hour: null,
                minute: null,
            };
        }
    }

    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
        return null;
    }

    const parts: Record<string, number> = {};

    for (const part of zonedParts.formatToParts(date)) {
        if (part.type !== 'literal') {
            parts[part.type] = Number(part.value);
        }
    }

    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        weekday: new Date(
            Date.UTC(parts.year, parts.month - 1, parts.day),
        ).getUTCDay(),
        hour: parts.hour,
        minute: parts.minute,
    };
}

const pad = (value: number): string => String(value).padStart(2, '0');

const shortDate = (parts: DateParts): string =>
    `${parts.day} ${MONTHS[parts.month - 1]}`;

const time = (parts: DateParts): string =>
    parts.hour === null || parts.minute === null
        ? ''
        : `${pad(parts.hour)}:${pad(parts.minute)}`;

/** "29 Sep 2026, 14:05" (a date-only value gives "29 Sep 2026"). */
export function formatDateTime(
    value: string | Date | null | undefined,
): string {
    const parts = toParts(value);

    if (!parts) {
        return EMPTY;
    }

    const date = `${shortDate(parts)} ${parts.year}`;

    return parts.hour === null ? date : `${date}, ${time(parts)}`;
}

/** "29 Sep 2026". */
export function formatDate(value: string | Date | null | undefined): string {
    const parts = toParts(value);

    return parts ? `${shortDate(parts)} ${parts.year}` : EMPTY;
}

/** "Tue, 29 Sep 2026". */
export function formatWeekdayDate(
    value: string | Date | null | undefined,
): string {
    const parts = toParts(value);

    return parts
        ? `${WEEKDAYS[parts.weekday]}, ${shortDate(parts)} ${parts.year}`
        : EMPTY;
}

/** "29 Sep". */
export function formatShortDate(
    value: string | Date | null | undefined,
): string {
    const parts = toParts(value);

    return parts ? shortDate(parts) : EMPTY;
}

/** "29 Sep, 14:05". */
export function formatShortDateTime(
    value: string | Date | null | undefined,
): string {
    const parts = toParts(value);

    if (!parts) {
        return EMPTY;
    }

    return parts.hour === null
        ? shortDate(parts)
        : `${shortDate(parts)}, ${time(parts)}`;
}

/** "14:05" (24-hour, Kuala Lumpur time). */
export function formatTime(value: string | Date | null | undefined): string {
    const parts = toParts(value);

    return parts && parts.hour !== null ? time(parts) : EMPTY;
}

/** The Kuala Lumpur calendar day of a timestamp, as "YYYY-MM-DD". */
export function toLocalDate(
    value: string | Date | null | undefined,
): string | null {
    const parts = toParts(value);

    return parts ? `${parts.year}-${pad(parts.month)}-${pad(parts.day)}` : null;
}

/** Today in Kuala Lumpur, as "YYYY-MM-DD". */
export function todayInKualaLumpur(now: Date = new Date()): string {
    return toLocalDate(now) as string;
}

/**
 * A moment in Kuala Lumpur time as "YYYY-MM-DDTHH:mm", the value of an
 * <input type="datetime-local">, which the server reads as Malaysia time.
 */
export function toLocalDateTime(
    value: string | Date | null | undefined,
): string | null {
    const parts = toParts(value);

    if (!parts || parts.hour === null || parts.minute === null) {
        return null;
    }

    return `${toLocalDate(value)}T${time(parts)}`;
}

/*
|--------------------------------------------------------------------------
| Tracking numbers
|--------------------------------------------------------------------------
|
| Mirrors App\Support\TrackingNumber: "KT" plus 8 Crockford base32
| characters (no I, L, O or U), shown as "KT-7Q4M92XD".
|
*/

const TRACKING_CODE = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/;

/**
 * "kt-7q4m 92xd" → "KT7Q4M92XD", or null when the input cannot be a
 * tracking number. Commonly confused letters map to digits (O → 0, I/L → 1).
 */
export function normalizeTrackingNumber(
    input: string | null | undefined,
): string | null {
    const value = (input ?? '').replace(/[\s-]+/g, '').toUpperCase();

    if (!value.startsWith('KT')) {
        return null;
    }

    const code = value.slice(2).replace(/O/g, '0').replace(/[IL]/g, '1');

    return TRACKING_CODE.test(code) ? `KT${code}` : null;
}

/** Any accepted form → "KT-7Q4M92XD". Unrecognised input is returned trimmed. */
export function formatTrackingNumber(input: string | null | undefined): string {
    const normalized = normalizeTrackingNumber(input);

    return normalized
        ? `KT-${normalized.slice(2)}`
        : (input ?? '').trim().toUpperCase();
}

/**
 * What a search box sends: "kt 7q4m 92xd" and the bare "7Q4M92XD" (a scan
 * or a typed code without the prefix) both become "KT-7Q4M92XD". Anything
 * else is sent trimmed, so the page can say that nothing matched.
 */
export function toTrackingQuery(typed: string): string {
    const value = typed.trim();
    const normalized =
        normalizeTrackingNumber(value) ?? normalizeTrackingNumber(`KT${value}`);

    return normalized ? `KT-${normalized.slice(2)}` : value;
}

/*
|--------------------------------------------------------------------------
| Phone numbers
|--------------------------------------------------------------------------
*/

/**
 * Malaysian numbers in E.164, as libphonenumber groups them: mobiles, Klang
 * Valley landlines, other peninsular landlines, Sabah and Sarawak landlines.
 */
const MALAYSIAN_PHONE = [
    /^\+60(1\d)(\d{3,4})(\d{4})$/,
    /^\+60(3)(\d{4})(\d{4})$/,
    /^\+60([4-79])(\d{3})(\d{4})$/,
    /^\+60(8\d)(\d{3})(\d{3,4})$/,
];

/**
 * "+60124583310" → "+60 12-458 3310", "+60378771203" → "+60 3-7877 1203";
 * other numbers are returned unchanged.
 */
export function formatPhone(phone: string | null | undefined): string {
    if (!phone) {
        return EMPTY;
    }

    for (const pattern of MALAYSIAN_PHONE) {
        const match = pattern.exec(phone);

        if (match) {
            return `+60 ${match[1]}-${match[2]} ${match[3]}`;
        }
    }

    return phone;
}

/** A tel: link for a phone number in any display form. */
export function telHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

/**
 * A branch name split after its dash: "Cheras - Taman Connaught" →
 * ["Cheras - ", "Taman Connaught"], with a no-break space before the dash.
 * Shown with the second part unbroken (BranchName.vue), a long name wraps
 * after the dash: never before it, and never leaving its last word alone.
 * A name without a dash is all second part.
 */
export function branchNameParts(name: string): [string, string] {
    const dash = name.lastIndexOf(' - ');

    return dash < 0
        ? ['', name]
        : [`${name.slice(0, dash)}\u00a0- `, name.slice(dash + 3)];
}
