/**
 * A dependency-free self-check for resources/js/lib/format.ts and pricing.ts.
 * Run with `npm run test:format` (Node strips the TypeScript types).
 */
import assert from 'node:assert/strict';
import {
    formatDate,
    formatDateTime,
    formatDecimal,
    formatDimensions,
    formatMoney,
    formatPercent,
    formatPhone,
    formatShortDate,
    formatShortDateTime,
    formatTime,
    formatTrackingNumber,
    formatWeekdayDate,
    formatWeight,
    normalizeTrackingNumber,
    pluralize,
    telHref,
    toLocalDate,
    todayInKualaLumpur,
    toTrackingQuery,
} from '../../resources/js/lib/format.ts';
import {
    estimatePrice,
    kgToGrams,
    priceForWeight,
} from '../../resources/js/lib/pricing.ts';

// config/kotak.php, as PriceCalculator::toArray() sends it.
const pricing = {
    base: 800,
    perKg: 200,
    divisor: 5000,
    maxWeightG: 30000,
    maxDimensionCm: 150,
};

const checks: [string, () => void][] = [
    [
        'money from sen',
        () => {
            // Intl puts a no-break space after RM, so amounts never wrap.
            assert.equal(formatMoney(1800), 'RM\u00A018.00');
            assert.equal(formatMoney(123450), 'RM\u00A01,234.50');
            assert.equal(formatMoney(0), 'RM\u00A00.00');
            assert.equal(formatMoney(null), '—');
        },
    ],
    [
        'weight from grams',
        () => {
            assert.equal(formatWeight(6000), '6.0 kg');
            assert.equal(formatWeight(4200), '4.2 kg');
            assert.equal(formatWeight(12000), '12.0 kg');
            assert.equal(formatWeight(undefined), '—');
        },
    ],
    [
        'dimensions and counts',
        () => {
            assert.equal(formatDimensions(40, 30, 25), '40 × 30 × 25 cm');
            assert.equal(formatDimensions(0, 30, 25), '—');
            assert.equal(pluralize(1, 'parcel'), '1 parcel');
            assert.equal(pluralize(3, 'parcel'), '3 parcels');
        },
    ],
    [
        'statistics with one decimal',
        () => {
            assert.equal(formatDecimal(2.44), '2.4');
            assert.equal(formatDecimal(3), '3.0');
            assert.equal(formatDecimal(0.05), '0.1');
            assert.equal(formatDecimal(null), '—');
            assert.equal(formatPercent(96.4), '96.4%');
            assert.equal(formatPercent(100), '100%');
            assert.equal(formatPercent(0), '0%');
            assert.equal(formatPercent(undefined), '—');
        },
    ],
    [
        'timestamps in Kuala Lumpur time',
        () => {
            // 06:05 UTC is 14:05 in Kuala Lumpur (UTC+8).
            const paid = '2026-09-29T06:05:00Z';

            assert.equal(formatDateTime(paid), '29 Sep 2026, 14:05');
            assert.equal(formatDate(paid), '29 Sep 2026');
            assert.equal(formatWeekdayDate(paid), 'Tue, 29 Sep 2026');
            assert.equal(formatShortDate(paid), '29 Sep');
            assert.equal(formatShortDateTime(paid), '29 Sep, 14:05');
            assert.equal(formatTime(paid), '14:05');
            // 20:30 UTC is already the next day in Kuala Lumpur.
            assert.equal(toLocalDate('2026-09-29T20:30:00Z'), '2026-09-30');
            assert.equal(formatTime('2026-09-29T16:00:00Z'), '00:00');
            assert.equal(todayInKualaLumpur(new Date(paid)), '2026-09-29');
        },
    ],
    [
        'calendar dates have no time zone shift',
        () => {
            assert.equal(formatWeekdayDate('2026-09-30'), 'Wed, 30 Sep 2026');
            assert.equal(formatDateTime('2026-09-30'), '30 Sep 2026');
            assert.equal(formatTime('2026-09-30'), '—');
            assert.equal(formatDate(null), '—');
            assert.equal(formatDate('not a date'), '—');
        },
    ],
    [
        'tracking numbers',
        () => {
            assert.equal(normalizeTrackingNumber('KT-7Q4M92XD'), 'KT7Q4M92XD');
            assert.equal(
                normalizeTrackingNumber(' kt 7q4m 92xd '),
                'KT7Q4M92XD',
            );
            // Crockford: O reads as 0, I and L as 1.
            assert.equal(normalizeTrackingNumber('KT-O1LIABCD'), 'KT0111ABCD');
            assert.equal(normalizeTrackingNumber('KT-7Q4M92X'), null);
            assert.equal(normalizeTrackingNumber('KT-7Q4M92XU'), null);
            assert.equal(normalizeTrackingNumber('7Q4M92XD'), null);
            assert.equal(formatTrackingNumber('kt7q4m92xd'), 'KT-7Q4M92XD');
            assert.equal(formatTrackingNumber(' abc '), 'ABC');
            // What the search boxes send: a bare scanned code gets its prefix.
            assert.equal(toTrackingQuery('kt 7q4m 92xd'), 'KT-7Q4M92XD');
            assert.equal(toTrackingQuery(' 7q4m92xd '), 'KT-7Q4M92XD');
            assert.equal(toTrackingQuery(' hello '), 'hello');
        },
    ],
    [
        'phone numbers',
        () => {
            assert.equal(formatPhone('+60124583310'), '+60 12-458 3310');
            assert.equal(formatPhone('+601123456789'), '+60 11-2345 6789');
            assert.equal(formatPhone('+60378771203'), '+60 3-7877 1203');
            assert.equal(formatPhone('+6097481234'), '+60 9-748 1234');
            assert.equal(formatPhone('+6082123456'), '+60 82-123 456');
            assert.equal(formatPhone('+6591234567'), '+6591234567');
            assert.equal(formatPhone('03-7877 1203'), '03-7877 1203');
            assert.equal(telHref('03-7877 1203'), 'tel:0378771203');
        },
    ],
    [
        'price estimates match PriceCalculator',
        () => {
            // 4.2 kg in a 40 × 30 × 25 cm box: 6.0 kg volumetric, RM 18.00.
            const estimate = estimatePrice(pricing, {
                weightG: kgToGrams('4.2'),
                lengthCm: 40,
                widthCm: 30,
                heightCm: 25,
            });

            assert.deepEqual(estimate, {
                actualG: 4200,
                volumetricG: 6000,
                chargeableG: 6000,
                chargedKg: 6,
                extraKg: 5,
                priceSen: 1800,
                byVolume: true,
            });
            assert.equal(priceForWeight(pricing, 1000), 800);
            assert.equal(priceForWeight(pricing, 5100), 1800);
            assert.equal(kgToGrams('0,5'), 500);
            assert.equal(
                estimatePrice(pricing, { weightG: 1000, lengthCm: 10 }),
                null,
            );
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
    console.log(`\nAll ${checks.length} format checks passed.`);
}
