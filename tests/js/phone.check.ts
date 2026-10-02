/**
 * A self-check for resources/js/lib/phone.ts (libphonenumber-js).
 * Run with `npm run test:js` (Node strips the TypeScript types).
 */
import assert from 'node:assert/strict';
import {
    FOREIGN_PHONE_MESSAGE,
    formatPhoneInput,
    isValidPhone,
    PHONE_MESSAGES,
    phoneError,
    toE164,
    toNationalDisplay,
} from '../../resources/js/lib/phone.ts';

/** Type a number one character at a time, as the input does. */
function typed(text: string): string {
    let value = '';

    for (const character of text) {
        value = formatPhoneInput(value + character);
    }

    return value;
}

const checks: [string, () => void][] = [
    [
        'valid Malaysian mobile numbers',
        () => {
            for (const number of [
                '12-345 6789',
                '0123456789',
                '011-2345 6789',
                '60123456789',
                '+60 12-345 6789',
                '019 400 0001',
            ]) {
                assert.equal(isValidPhone(number, 'mobile'), true, number);
                assert.equal(phoneError(number, 'mobile'), null, number);
            }
        },
    ],
    [
        'landlines are only taken where any number is',
        () => {
            assert.equal(isValidPhone('03-7877 1203', 'mobile'), false);
            assert.equal(
                phoneError('03-7877 1203', 'mobile'),
                PHONE_MESSAGES.mobile,
            );
            assert.equal(isValidPhone('03-7877 1203', 'any'), true);
            assert.equal(isValidPhone('3-7877 1203', 'any'), true);
            assert.equal(phoneError('09-748 1234', 'any'), null);
        },
    ],
    [
        'invalid and foreign numbers',
        () => {
            assert.equal(phoneError('012345', 'mobile'), PHONE_MESSAGES.mobile);
            assert.equal(
                phoneError('12345678901234', 'any'),
                PHONE_MESSAGES.any,
            );
            assert.equal(
                phoneError('not a phone', 'mobile'),
                PHONE_MESSAGES.mobile,
            );
            // 1-300 numbers are neither mobiles nor landlines.
            assert.equal(
                phoneError('1-300-88-1234', 'any'),
                PHONE_MESSAGES.any,
            );
            assert.equal(
                phoneError('+65 9123 4567', 'mobile'),
                FOREIGN_PHONE_MESSAGE,
            );
            assert.equal(
                phoneError('+65 9123 4567', 'any'),
                FOREIGN_PHONE_MESSAGE,
            );
            assert.equal(phoneError('   ', 'mobile'), null);
        },
    ],
    [
        'E.164 for the server',
        () => {
            assert.equal(toE164('12-345 6789'), '+60123456789');
            assert.equal(toE164('012-345 6789'), '+60123456789');
            assert.equal(toE164('+60 11 2345 6789'), '+601123456789');
            assert.equal(toE164('3-7877 1203', 'any'), '+60378771203');
            // What the field does not take is sent as typed, for the server to reject.
            assert.equal(toE164('3-7877 1203', 'mobile'), '3-7877 1203');
            assert.equal(toE164(' +65 9123 4567 '), '+65 9123 4567');
            assert.equal(toE164(''), '');
        },
    ],
    [
        'as-you-type formatting',
        () => {
            assert.equal(typed('123456789'), '12-345 6789');
            assert.equal(typed('1123456789'), '11-2345 6789');
            assert.equal(typed('0123456789'), '012-345 6789');
            assert.equal(typed('378771203'), '3-7877 1203');
            assert.equal(typed('+60123456789'), '+60 12 345 6789');
            assert.equal(formatPhoneInput('12'), '12');
            assert.equal(formatPhoneInput('123'), '12-3');
            assert.equal(formatPhoneInput('12a3'), '12-3');
            assert.equal(formatPhoneInput(''), '');
            assert.equal(formatPhoneInput('+'), '+');
            assert.equal(
                formatPhoneInput('1'.repeat(20)).replace(/\D/g, '').length,
                15,
            );
        },
    ],
    [
        'the national number shown after +60',
        () => {
            assert.equal(toNationalDisplay('+60123456789'), '12-345 6789');
            assert.equal(toNationalDisplay('+601123456789'), '11-2345 6789');
            assert.equal(toNationalDisplay('012-345 6789'), '12-345 6789');
            assert.equal(toNationalDisplay('+60 12 345 6789'), '12-345 6789');
            assert.equal(toNationalDisplay('+60378771203'), '3-7877 1203');
            assert.equal(toNationalDisplay('+65 9123 4567'), '+65 9123 4567');
            assert.equal(toNationalDisplay('1234'), '12-34');
            assert.equal(toNationalDisplay(null), '');
        },
    ],
];

let failed = 0;

for (const [name, check] of checks) {
    try {
        check();
        console.log(`  ok  ${name}`);
    } catch (error) {
        failed++;
        console.error(`  FAIL ${name}\n${String(error)}`);
    }
}

if (failed > 0) {
    process.exitCode = 1;
} else {
    console.log(`\nAll ${checks.length} phone checks passed.`);
}
