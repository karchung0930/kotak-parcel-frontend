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

/** A no-break space: the words on either side stay on one line. */
const NBSP = '\u00a0';

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
|
| A number keeps its unit on its line: Intl puts a no-break space after
| "RM", and the weights use one before "kg".
|
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

    return `${oneDecimal.format(grams / 1000)}${NBSP}kg`;
}

/**
 * 500 → "0.5 kg", 1000 → "1 kg", 2250 → "2.25 kg": a weight as people
 * write it, for weight bands and limits.
 */
export function formatKg(grams: number | null | undefined): string {
    if (grams === null || grams === undefined || !Number.isFinite(grams)) {
        return EMPTY;
    }

    return `${Number((grams / 1000).toFixed(3))}${NBSP}kg`;
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

/**
 * (40, 30, 25, 5000) → "40 × 30 × 25 ÷ 5000": how a size (volumetric)
 * weight is worked out, or "L × W × H ÷ 5000" while a side is missing.
 * No-break spaces keep the box size together and the divisor with its
 * sign, so in a box too narrow for all of it the sum wraps only before
 * the "÷". `whole` keeps all of it on one line, for a short formula after
 * other words ("Size weight = L × W × H ÷ 5000"), where the text wraps
 * before the formula instead.
 */
export function formatVolumeSum(
    lengthCm: number | null | undefined,
    widthCm: number | null | undefined,
    heightCm: number | null | undefined,
    divisor: number,
    { whole = false }: { whole?: boolean } = {},
): string {
    const sides = [lengthCm, widthCm, heightCm];
    const box = sides.every((side) => side && Number.isFinite(side))
        ? sides.join(' × ')
        : 'L × W × H';

    return `${box.replaceAll(' ', NBSP)}${whole ? NBSP : ' '}÷${NBSP}${divisor}`;
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
| The parts of a date are joined with no-break spaces, so a date never ends
| a line after its day or month, wherever it is shown; a time after it may
| still go to the next line.
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
    `${parts.day}${NBSP}${MONTHS[parts.month - 1]}`;

const fullDate = (parts: DateParts): string =>
    `${shortDate(parts)}${NBSP}${parts.year}`;

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

    const date = fullDate(parts);

    return parts.hour === null ? date : `${date}, ${time(parts)}`;
}

/** "29 Sep 2026". */
export function formatDate(value: string | Date | null | undefined): string {
    const parts = toParts(value);

    return parts ? fullDate(parts) : EMPTY;
}

/** "Tue, 29 Sep 2026". */
export function formatWeekdayDate(
    value: string | Date | null | undefined,
): string {
    const parts = toParts(value);

    return parts
        ? `${WEEKDAYS[parts.weekday]},${NBSP}${fullDate(parts)}`
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
 * Any hyphen or dash counts, such as the non-breaking one in emails.
 */
export function normalizeTrackingNumber(
    input: string | null | undefined,
): string | null {
    const value = (input ?? '')
        .replace(/[\s\u2010-\u2015\u2212-]+/g, '')
        .toUpperCase();

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
 * Text read off a label by the camera (OCR), tidied for the tracking-number
 * search: upper case, any dash as "-", spaces and tabs removed, and the
 * letters OCR mixes up with the ones Crockford leaves out mapped to them
 * (O → 0, I and L → 1, U → V). Line breaks stay, so text from two lines of
 * a label is never joined into one number.
 */
function tidyReadText(text: string): string {
    return text
        .toUpperCase()
        .replace(/[‐-―−]/g, '-')
        .replace(/[^\S\n]+/g, '')
        .replace(/O/g, '0')
        .replace(/[IL]/g, '1')
        .replace(/U/g, 'V');
}

const READ_NUMBER = /KT-?([0-9ABCDEFGHJKMNPQRSTVWXYZ]{8})/;

const READ_PREFIX = /KT-?([0-9ABCDEFGHJKMNPQRSTVWXYZ]{0,8})/;

/**
 * The first tracking number in text read off a label by the camera, as
 * "KT-7Q4M92XD", or null: "Tracking number\nKT-7Q4M 92XD" → "KT-7Q4M92XD".
 * Where more characters follow, the first 8 after "KT" count.
 */
export function readTrackingNumber(
    text: string | null | undefined,
): string | null {
    const match = READ_NUMBER.exec(tidyReadText(text ?? ''));

    return match ? `KT-${match[1]}` : null;
}

/**
 * As much of a tracking number as the camera read, to start the typed
 * entry with: "KT-7Q4M" from "kt 7q4m", or "" when no "KT" was read.
 */
export function readPartialTrackingNumber(
    text: string | null | undefined,
): string {
    const match = READ_PREFIX.exec(tidyReadText(text ?? ''));

    return match ? `KT-${match[1]}` : '';
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
 * A mailto: link for an email address. The part before the @ may hold
 * "?", "&", "=" or "%" (all valid in an address, and a receiver's address
 * is the customer's own text), which a mail app would read as extra
 * fields, such as a Bcc or a ready-made subject, so it is percent-encoded.
 */
export function mailtoHref(email: string): string {
    const at = email.lastIndexOf('@');

    if (at < 0) {
        return `mailto:${encodeURIComponent(email)}`;
    }

    return `mailto:${encodeURIComponent(email.slice(0, at))}${email.slice(at)}`;
}

/*
|--------------------------------------------------------------------------
| Addresses
|--------------------------------------------------------------------------
|
| A postcode never ends or starts a line on its own. A short town stays
| whole with it ("47500 Subang Jaya"); a long one, which customers may type
| ("43900 Bandar Baru Salak Tinggi"), keeps only the word next to the
| postcode and wraps between its other words, so it never pushes a card or
| the page sideways.
|
*/

/**
 * The longest town (or town word) kept on one line with its postcode: 19
 * characters with it, so "47300 Petaling Jaya" and "Kota Kinabalu 88300"
 * stay whole, and it still fits the narrowest place a town is shown (the
 * destination beside its label on a customer's order, on a 320px phone).
 */
const SHORT_TOWN = 13;

function joinPostcode(
    postcode: string,
    city: string,
    postcodeFirst: boolean,
): string {
    const code = postcode.trim();
    const words = city.trim().split(/\s+/).filter(Boolean);

    if (code === '' || words.length === 0) {
        return [...words, code].filter(Boolean).join(' ');
    }

    const town = words.join(words.join(' ').length <= SHORT_TOWN ? NBSP : ' ');
    const next = postcodeFirst ? words[0] : words[words.length - 1];
    const space = next.length <= SHORT_TOWN ? NBSP : ' ';

    return postcodeFirst ? `${code}${space}${town}` : `${town}${space}${code}`;
}

/** ("47500", "Subang Jaya") → "47500 Subang Jaya": an address's town line. */
export function formatPostcodeCity(postcode: string, city: string): string {
    return joinPostcode(postcode, city, true);
}

/**
 * ("Subang Jaya", "47500") → "Subang Jaya 47500": where a parcel goes, town
 * first, as lists and the driver's run sheet show it.
 */
export function formatDeliveryArea(city: string, postcode: string): string {
    return joinPostcode(postcode, city, false);
}

/*
|--------------------------------------------------------------------------
| Branch names and receipt numbers
|--------------------------------------------------------------------------
*/

/**
 * A branch name split after its dash: "Cheras - Taman Connaught" →
 * ["Cheras - ", "Taman Connaught"], with a no-break space before the dash.
 * A short town keeps its words together too (the same limit as beside a
 * postcode), so "Petaling Jaya - SS2" never breaks inside "Petaling Jaya".
 * Shown with the second part kept whole where it fits (BranchName.vue), a
 * long name wraps after the dash: never before it, and never leaving its
 * last word alone. A name without a dash is all second part.
 */
export function branchNameParts(name: string): [string, string] {
    const dash = name.lastIndexOf(' - ');

    if (dash < 0) {
        return ['', name];
    }

    const town = name.slice(0, dash);
    const head =
        town.length <= SHORT_TOWN ? town.split(/\s+/).join(NBSP) : town;

    return [`${head}${NBSP}- `, name.slice(dash + 3)];
}

/**
 * The longest area after a branch's dash kept whole in plain text: it
 * still fits the narrowest box a branch name is shown in as text (the
 * user card in the menu, on a 320px phone).
 */
const SHORT_AREA = 24;

/**
 * A branch name as plain text that breaks where BranchName.vue does, for
 * text not built in a template: a sentence passed to a dialog, or a
 * line-clamped box (where an inline-block would count as a single line).
 * "Kuala Lumpur - Bandar Sri Permaisuri" wraps after its dash; only a
 * longer area may wrap between its words.
 */
export function formatBranchName(name: string): string {
    const [head, area] = branchNameParts(name);

    return head !== '' && area.length <= SHORT_AREA
        ? head + area.split(/\s+/).join(NBSP)
        : head + area;
}

/**
 * "RCPT-20261003-00000025" → ["RCPT-", "20261003-", "00000025"]: a receipt
 * number in the pieces it may break between, after a hyphen and never
 * inside the date or the number (ReceiptNumber.vue). Joined, the pieces
 * are the number again.
 */
export function receiptNumberParts(value: string): string[] {
    return value === '' ? [] : value.split(/(?<=-)/);
}

/**
 * "nur.izzati_hassan@mail.example.com" → ["nur", ".izzati", "_hassan@",
 * "mail", ".example", ".com"]: an email address in the pieces it may break
 * between, as style guides break addresses: after the @, and before a dot,
 * underscore or plus, not at a hyphen, which would read as a hyphenated
 * word (EmailAddress.vue keeps each piece whole). Joined, the pieces are
 * the address again.
 */
export function emailAddressParts(value: string): string[] {
    return value === '' ? [] : value.split(/(?=[._+])|(?<=@)/);
}

/*
|--------------------------------------------------------------------------
| Text from the server
|--------------------------------------------------------------------------
*/

const WEEKDAY_NAME =
    '(?:Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)';
const MONTH_NAME =
    '(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|June?|July?|Aug(?:ust)?|Sep(?:t(?:ember)?)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)';

/** A tracking number, a date ("Sun, 4 Oct 2026", "6 October") or "RM 18.00". */
const KEEP_TOGETHER = new RegExp(
    [
        String.raw`(?<tracking>\bKT-[0-9A-Z]{8}\b)`,
        String.raw`(?<date>\b(?:${WEEKDAY_NAME},\s+)?\d{1,2}\s+${MONTH_NAME}(?:\s+\d{4})?\b)`,
        String.raw`(?<money>\bRM\s?\d[\d,]*(?:\.\d{2})?\b)`,
    ].join('|'),
    'g',
);

/** What a piece of text that must stay on one line is. */
export type KeptKind = 'tracking' | 'date' | 'money';

/** A piece of a sentence: `kind` is null for the text that may wrap. */
export type TextPart = { text: string; kind: KeptKind | null };

/**
 * A sentence the server wrote, such as a toast or a history note, split
 * into the pieces that must stay on one line (tracking numbers, dates and
 * amounts) and the text around them. KeepTogether.vue shows the pieces
 * unbroken, so "KT-7Q4M92XD is scheduled with Ravi on 6 Oct 2026." can
 * wrap between words but never inside the number or the date.
 */
export function keepTogetherParts(text: string): TextPart[] {
    const parts: TextPart[] = [];
    let last = 0;

    for (const match of text.matchAll(KEEP_TOGETHER)) {
        if (match.index > last) {
            parts.push({ text: text.slice(last, match.index), kind: null });
        }

        const kind: KeptKind = match.groups?.tracking
            ? 'tracking'
            : match.groups?.date
              ? 'date'
              : 'money';

        parts.push({ text: match[0], kind });
        last = match.index + match[0].length;
    }

    if (last < text.length) {
        parts.push({ text: text.slice(last), kind: null });
    }

    return parts;
}
