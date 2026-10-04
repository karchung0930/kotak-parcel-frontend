/**
 * A dependency-free self-check for resources/js/lib/format.ts (prices are
 * checked in pricing.check.ts). Run with `npm run test:format` (Node strips
 * the TypeScript types).
 */
import assert from 'node:assert/strict';
import {
    branchNameParts,
    formatBranchName,
    formatDate,
    formatDateTime,
    formatDecimal,
    formatDeliveryArea,
    formatDimensions,
    formatKg,
    formatMoney,
    formatPercent,
    formatPhone,
    formatPostcodeCity,
    formatShortDate,
    formatShortDateTime,
    formatTime,
    formatTrackingNumber,
    formatVolumeSum,
    formatWeekdayDate,
    formatWeight,
    keepTogetherParts,
    normalizeTrackingNumber,
    pluralize,
    receiptNumberParts,
    telHref,
    toLocalDate,
    toLocalDateTime,
    todayInKualaLumpur,
    toTrackingQuery,
} from '../../resources/js/lib/format.ts';

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
            // A no-break space keeps "kg" on the line of its number.
            assert.equal(formatWeight(6000), '6.0\u00a0kg');
            assert.equal(formatWeight(4200), '4.2\u00a0kg');
            assert.equal(formatWeight(12000), '12.0\u00a0kg');
            assert.equal(formatWeight(undefined), '—');
            // Weight bands, as people write them.
            assert.equal(formatKg(500), '0.5\u00a0kg');
            assert.equal(formatKg(1000), '1\u00a0kg');
            assert.equal(formatKg(2250), '2.25\u00a0kg');
            assert.equal(formatKg(30000), '30\u00a0kg');
            assert.equal(formatKg(null), '—');
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
        'size weight sum, wrapping only before the divisor',
        () => {
            // The box size stays together and the divisor keeps its sign:
            // the one plain space is before the "÷".
            assert.equal(
                formatVolumeSum(40, 30, 25, 5000),
                '40\u00a0×\u00a030\u00a0×\u00a025 ÷\u00a05000',
            );
            assert.deepEqual(formatVolumeSum(120, 100, 80, 6000).split(' '), [
                '120\u00a0×\u00a0100\u00a0×\u00a080',
                '÷\u00a06000',
            ]);
            // Kept whole after other words, which wrap before it instead.
            const whole = formatVolumeSum(null, null, null, 5000, {
                whole: true,
            });
            assert.equal(
                whole,
                formatVolumeSum(null, null, null, 5000).replace(' ', ' '),
            );
            assert.ok(!whole.includes(' '));
            // A missing side shows the formula instead.
            assert.equal(
                formatVolumeSum(40, null, 25, 5000),
                'L\u00a0×\u00a0W\u00a0×\u00a0H ÷\u00a05000',
            );
            assert.equal(
                formatVolumeSum(Number.NaN, 30, 25, 5000),
                'L\u00a0×\u00a0W\u00a0×\u00a0H ÷\u00a05000',
            );
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
            // 06:05 UTC is 14:05 in Kuala Lumpur (UTC+8). No-break spaces
            // keep each date on one line; the time may go to the next.
            const paid = '2026-09-29T06:05:00Z';

            assert.equal(formatDateTime(paid), '29\u00a0Sep\u00a02026, 14:05');
            assert.equal(formatDate(paid), '29\u00a0Sep\u00a02026');
            assert.equal(
                formatWeekdayDate(paid),
                'Tue,\u00a029\u00a0Sep\u00a02026',
            );
            assert.equal(formatShortDate(paid), '29\u00a0Sep');
            assert.equal(formatShortDateTime(paid), '29\u00a0Sep, 14:05');
            assert.equal(formatTime(paid), '14:05');
            // 20:30 UTC is already the next day in Kuala Lumpur.
            assert.equal(toLocalDate('2026-09-29T20:30:00Z'), '2026-09-30');
            assert.equal(formatTime('2026-09-29T16:00:00Z'), '00:00');
            assert.equal(todayInKualaLumpur(new Date(paid)), '2026-09-29');
            // The value of a datetime-local input, in Kuala Lumpur time.
            assert.equal(toLocalDateTime(paid), '2026-09-29T14:05');
            assert.equal(
                toLocalDateTime('2026-10-31T16:00:00Z'),
                '2026-11-01T00:00',
            );
            assert.equal(toLocalDateTime('2026-09-30'), null);
        },
    ],
    [
        'calendar dates have no time zone shift',
        () => {
            assert.equal(
                formatWeekdayDate('2026-09-30'),
                'Wed,\u00a030\u00a0Sep\u00a02026',
            );
            assert.equal(formatDateTime('2026-09-30'), '30\u00a0Sep\u00a02026');
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
        'branch names split after the dash, which keeps to the word before',
        () => {
            assert.deepEqual(branchNameParts('Cheras - Taman Connaught'), [
                'Cheras\u00a0- ',
                'Taman Connaught',
            ]);
            // A short town keeps its words together as well, as beside a
            // postcode; a long one may still wrap between them.
            assert.deepEqual(branchNameParts('Petaling Jaya - SS2'), [
                'Petaling\u00a0Jaya\u00a0- ',
                'SS2',
            ]);
            assert.deepEqual(branchNameParts('Shah Alam - Seksyen 13'), [
                'Shah\u00a0Alam\u00a0- ',
                'Seksyen 13',
            ]);
            assert.deepEqual(
                branchNameParts('Bandar Baru Salak Tinggi - Pusat'),
                ['Bandar Baru Salak Tinggi\u00a0- ', 'Pusat'],
            );
            // Hyphenated words are not dashes.
            assert.deepEqual(branchNameParts('Kota Kinabalu-Likas'), [
                '',
                'Kota Kinabalu-Likas',
            ]);
            assert.deepEqual(branchNameParts('Mid Valley'), ['', 'Mid Valley']);
            // As plain text, for a sentence or a line-clamped box.
            assert.equal(
                formatBranchName('Petaling Jaya - SS2'),
                'Petaling\u00a0Jaya\u00a0- SS2',
            );
            // There the area stays whole too, unless it is long.
            assert.equal(
                formatBranchName('Cheras - Taman Connaught'),
                'Cheras\u00a0- Taman\u00a0Connaught',
            );
            assert.equal(
                formatBranchName('Kuala Lumpur - Bandar Sri Permaisuri'),
                'Kuala\u00a0Lumpur\u00a0- Bandar\u00a0Sri\u00a0Permaisuri',
            );
            assert.equal(
                formatBranchName('Shah Alam - Kawasan Perindustrian Hicom'),
                'Shah\u00a0Alam\u00a0- Kawasan Perindustrian Hicom',
            );
            assert.equal(formatBranchName('Mid Valley'), 'Mid Valley');
        },
    ],
    [
        'receipt numbers break only after a hyphen',
        () => {
            assert.deepEqual(receiptNumberParts('RCPT-20261003-00000025'), [
                'RCPT-',
                '20261003-',
                '00000025',
            ]);
            assert.deepEqual(receiptNumberParts('RCPT20261003'), [
                'RCPT20261003',
            ]);
            assert.deepEqual(receiptNumberParts(''), []);
            // Nothing is added or lost: the pieces join into the number.
            for (const value of ['RCPT-20261003-00000025', 'A--B-', '-X']) {
                assert.equal(receiptNumberParts(value).join(''), value);
            }
        },
    ],
    [
        'a postcode stays on the line of its town',
        () => {
            // A short town stays whole with its postcode.
            assert.equal(
                formatPostcodeCity('47500', 'Subang Jaya'),
                '47500\u00a0Subang\u00a0Jaya',
            );
            assert.equal(
                formatPostcodeCity(' 59200 ', 'Kuala  Lumpur'),
                '59200\u00a0Kuala\u00a0Lumpur',
            );
            assert.equal(
                formatDeliveryArea('George Town', '10200'),
                'George\u00a0Town\u00a010200',
            );
            assert.equal(
                formatPostcodeCity('47300', 'Petaling Jaya'),
                '47300\u00a0Petaling\u00a0Jaya',
            );
            assert.equal(
                formatDeliveryArea('Kota Kinabalu', '88300'),
                'Kota\u00a0Kinabalu\u00a088300',
            );
            // A longer town keeps only the word next to the postcode, and
            // may wrap between its other words.
            assert.equal(
                formatDeliveryArea('Seri Kembangan', '43300'),
                'Seri Kembangan\u00a043300',
            );
            assert.equal(
                formatPostcodeCity('43900', 'Bandar Baru Salak Tinggi'),
                '43900\u00a0Bandar Baru Salak Tinggi',
            );
            assert.equal(
                formatDeliveryArea('Bandar Baru Salak Tinggi', '43900'),
                'Bandar Baru Salak Tinggi\u00a043900',
            );
            assert.equal(
                formatDeliveryArea(
                    'Taman Tun Dr Ismail, Kuala Lumpur',
                    '60000',
                ),
                'Taman Tun Dr Ismail, Kuala Lumpur\u00a060000',
            );
            // A town typed as one long word does not take the postcode with it.
            assert.equal(
                formatDeliveryArea('Bandarbarusalaktinggi', '43900'),
                'Bandarbarusalaktinggi 43900',
            );
            assert.equal(formatPostcodeCity('47500', ' '), '47500');

            // The longest town a customer can type (100 characters) never
            // becomes one unbreakable run.
            const city = 'Kampung Baru Sungai Buloh '.repeat(4).slice(0, 100);
            const longestRun = (text: string): number =>
                Math.max(...text.split(' ').map((run) => run.length));

            assert.equal(city.length, 100);
            assert.ok(longestRun(formatPostcodeCity('47000', city)) <= 19);
            assert.ok(longestRun(formatDeliveryArea(city, '47000')) <= 19);
        },
    ],
    [
        'server text keeps tracking numbers, dates and amounts whole',
        () => {
            const kept = (text: string): string[] =>
                keepTogetherParts(text)
                    .filter((part) => part.kind !== null)
                    .map((part) => part.text);

            assert.deepEqual(
                keepTogetherParts(
                    'KT-00000017 is scheduled with Ahmad Faizal on 6 Oct 2026.',
                ),
                [
                    { text: 'KT-00000017', kind: 'tracking' },
                    {
                        text: ' is scheduled with Ahmad Faizal on ',
                        kind: null,
                    },
                    { text: '6 Oct 2026', kind: 'date' },
                    { text: '.', kind: null },
                ],
            );
            assert.deepEqual(kept('Not dropped off by 29 September 2026.'), [
                '29 September 2026',
            ]);
            assert.deepEqual(kept('Rates scheduled for 12 Oct 2026, 09:00.'), [
                '12 Oct 2026',
            ]);
            assert.deepEqual(kept('Expected on Sun, 4 Oct 2026.'), [
                'Sun, 4 Oct 2026',
            ]);
            assert.deepEqual(
                keepTogetherParts('The final price is RM 1,234.50.'),
                [
                    { text: 'The final price is ', kind: null },
                    { text: 'RM 1,234.50', kind: 'money' },
                    { text: '.', kind: null },
                ],
            );
            // A rate card's name, as titles show it.
            assert.deepEqual(kept('Withdraw Rates from 1 November 2026?'), [
                '1 November 2026',
            ]);
            // Dates the formatters wrote (no-break spaces) are found too.
            assert.deepEqual(kept(`Due ${formatShortDate('2026-10-06')}`), [
                '6\u00a0Oct',
            ]);
            // Nothing to keep: one plain part, and none for empty text.
            assert.deepEqual(keepTogetherParts('Draft saved.'), [
                { text: 'Draft saved.', kind: null },
            ]);
            assert.deepEqual(keepTogetherParts(''), []);
            assert.deepEqual(kept('Branch KT-1 and 12 Market Street'), []);
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
