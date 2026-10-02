/**
 * Malaysian phone numbers, checked with Google's libphonenumber (the
 * libphonenumber-js port). The server checks them again with the PHP port
 * (App\Rules\MalaysianPhone) and stores them in E.164 form, e.g. "+60123456789".
 *
 * Metadata: the "mobile" build (its metadata is ~24 kB gzipped). It holds
 * the full libphonenumber patterns for mobile numbers, so isValid() is exact
 * for the account numbers (register, profile, admin user form), which must
 * be mobiles. A receiver may also give a landline; this build only knows the
 * possible lengths of those, so the browser accepts any landline of a
 * possible length and the server's full metadata makes the final call.
 * ("min" cannot tell a mobile from a landline, so the browser would pass
 * numbers the server rejects; "max" adds ~16 kB for checks the server
 * repeats anyway.) Only pages with a PhoneInput load it.
 *
 * No "@/" imports, so `npm run test:js` can run this file in Node.
 */
import {
    AsYouType,
    parsePhoneNumberFromString,
} from 'libphonenumber-js/mobile';
import type { PhoneNumber } from 'libphonenumber-js/mobile';

export const PHONE_COUNTRY = 'MY';
export const PHONE_CALLING_CODE = '60';

/**
 * Which numbers a field takes: "mobile" for account numbers, "any" (a
 * mobile or a landline) for a parcel's receiver.
 */
export type PhoneKind = 'mobile' | 'any';

/** The same messages the server gives (App\Rules\MalaysianPhone). */
export const PHONE_MESSAGES: Record<PhoneKind, string> = {
    mobile: 'Enter a valid Malaysian mobile number, e.g. 12-345 6789.',
    any: 'Enter a valid Malaysian mobile or landline number.',
};

export const FOREIGN_PHONE_MESSAGE =
    'Only Malaysian (+60) numbers can be used.';

/** E.164 allows at most 15 digits; anything longer is cut off while typing. */
const MAX_DIGITS = 15;

function parse(value: string): PhoneNumber | undefined {
    return parsePhoneNumberFromString(value, PHONE_COUNTRY);
}

function isMalaysian(phone: PhoneNumber): boolean {
    return phone.countryCallingCode === PHONE_CALLING_CODE;
}

/**
 * Whether a parsed number is one the field takes. With the "mobile"
 * metadata, isValid() means "a valid Malaysian mobile number". Landlines
 * start with 3 to 9 (numbers starting with 1 are mobiles or special
 * services, which isValid() already rules on).
 */
function isAccepted(phone: PhoneNumber, kind: PhoneKind): boolean {
    if (!isMalaysian(phone)) {
        return false;
    }

    if (phone.isValid()) {
        return true;
    }

    return (
        kind === 'any' &&
        /^[3-9]/.test(phone.nationalNumber) &&
        phone.isPossible()
    );
}

/** Whether the text is a Malaysian number the field takes. */
export function isValidPhone(
    value: string,
    kind: PhoneKind = 'mobile',
): boolean {
    const phone = parse(value.trim());

    return phone !== undefined && isAccepted(phone, kind);
}

/**
 * The problem with a typed number, or null when it is fine (or empty: the
 * server says when a required number is missing).
 */
export function phoneError(
    value: string,
    kind: PhoneKind = 'mobile',
): string | null {
    const text = value.trim();

    if (text === '') {
        return null;
    }

    const phone = parse(text);

    if (phone !== undefined && !isMalaysian(phone)) {
        return FOREIGN_PHONE_MESSAGE;
    }

    return phone !== undefined && isAccepted(phone, kind)
        ? null
        : PHONE_MESSAGES[kind];
}

/**
 * What a form sends: "12-345 6789", "012 345 6789" or "+60 12-345 6789" →
 * "+60123456789". Anything the field does not take is sent as typed, so the
 * server can say what is wrong with it.
 */
export function toE164(value: string, kind: PhoneKind = 'mobile'): string {
    const text = value.trim();
    const phone = parse(text);

    return phone !== undefined && isAccepted(phone, kind) ? phone.number : text;
}

/**
 * As-you-type formatting for the field after the fixed +60: "123456789" →
 * "12-345 6789". A typed trunk 0 is kept ("012-345 6789") and so is an
 * international number ("+60 12 345 6789"); toNationalDisplay() tidies both
 * once the field is left.
 */
export function formatPhoneInput(value: string): string {
    const plus = value.trimStart().startsWith('+');
    const digits = value.replace(/\D/g, '').slice(0, MAX_DIGITS);

    if (plus) {
        return new AsYouType().input(`+${digits}`);
    }

    if (digits === '') {
        return '';
    }

    // "0…" is a national number with its trunk prefix; "60…" starts with the
    // country code. libphonenumber formats both as they are.
    if (digits.startsWith('0') || digits.startsWith(PHONE_CALLING_CODE)) {
        return new AsYouType(PHONE_COUNTRY).input(digits);
    }

    // Malaysian formats only apply after the trunk 0, so format as if it had
    // been typed and drop it again.
    const formatted = new AsYouType(PHONE_COUNTRY).input(`0${digits}`);

    return formatted.startsWith('0') ? formatted.slice(1) : digits;
}

/**
 * A Malaysian number as shown after the fixed +60, without the trunk 0:
 * "+60123456789" or "012-345 6789" → "12-345 6789". Anything else is only
 * formatted as typed.
 */
export function toNationalDisplay(value: string | null | undefined): string {
    const text = (value ?? '').trim();
    const phone = parse(text);

    if (phone !== undefined && isMalaysian(phone) && phone.isPossible()) {
        return phone.formatNational().replace(/^0/, '');
    }

    return formatPhoneInput(text);
}
