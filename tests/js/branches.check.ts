/**
 * A dependency-free self-check for resources/js/lib/branches.ts (opening
 * hours, "open now" and distances). Run it with:
 * node --experimental-strip-types --no-warnings tests/js/branches.check.ts
 */
import assert from 'node:assert/strict';
import {
    branchAnchor,
    distanceKm,
    formatDistance,
    openStatus,
    parseOpeningHours,
} from '../../resources/js/lib/branches.ts';

/** A moment in Kuala Lumpur time (UTC+8), e.g. at('2026-09-29', '14:05'). */
const at = (date: string, time: string): Date =>
    new Date(`${date}T${time}:00+08:00`);

// 29 Sep 2026 is a Tuesday; 4 Oct 2026 is a Sunday.
const tuesday = '2026-09-29';
const saturday = '2026-10-03';
const sunday = '2026-10-04';

const checks: [string, () => void][] = [
    [
        'the seeded opening hours are read',
        () => {
            const hours = parseOpeningHours(
                'Mon-Sat 9:00-21:00, Sun 10:00-18:00',
            );

            assert.deepEqual(
                hours?.map((period) => [period.days, period.hours]),
                [
                    ['Mon–Sat', '9:00–21:00'],
                    ['Sun', '10:00–18:00'],
                ],
            );
            assert.deepEqual(
                parseOpeningHours('Daily 10:00-22:00')?.map((p) => p.days),
                ['Daily'],
            );
            assert.deepEqual(
                parseOpeningHours('Mon-Fri 8:30-20:00, Sat 9:00-17:00')?.map(
                    (p) => p.hours,
                ),
                ['8:30–20:00', '9:00–17:00'],
            );
            assert.deepEqual(
                parseOpeningHours('Sat & Sun 9am-1pm')?.map((p) => [
                    p.days,
                    p.hours,
                ]),
                [['Sat & Sun', '9:00–13:00']],
            );
        },
    ],
    [
        'anything else is left as typed',
        () => {
            assert.equal(parseOpeningHours('Call ahead'), null);
            assert.equal(parseOpeningHours('Mon-Sat 9:00-21:00, Sun'), null);
            assert.equal(parseOpeningHours(''), null);
            assert.equal(parseOpeningHours(null), null);
        },
    ],
    [
        'open now and when it next opens',
        () => {
            const hours = parseOpeningHours(
                'Mon-Sat 9:00-21:00, Sun 10:00-18:00',
            ) as NonNullable<ReturnType<typeof parseOpeningHours>>;

            assert.deepEqual(openStatus(hours, at(tuesday, '14:05')), {
                open: true,
                label: 'Open now',
                detail: 'until 21:00',
            });
            assert.equal(
                openStatus(hours, at(tuesday, '08:15')).detail,
                'opens 9:00',
            );
            assert.equal(
                openStatus(hours, at(saturday, '21:00')).detail,
                'opens tomorrow 10:00',
            );
            assert.equal(openStatus(hours, at(sunday, '17:59')).open, true);

            const weekdays = parseOpeningHours(
                'Mon-Fri 8:30-20:00',
            ) as NonNullable<ReturnType<typeof parseOpeningHours>>;

            assert.equal(
                openStatus(weekdays, at(saturday, '10:00')).detail,
                'opens Mon 8:30',
            );
        },
    ],
    [
        'distances',
        () => {
            // Petaling Jaya SS2 to Mid Valley is about 6 km.
            const km = distanceKm(
                { latitude: 3.1185, longitude: 101.6225 },
                { latitude: 3.1178, longitude: 101.6772 },
            );

            assert.ok(km > 5.9 && km < 6.2, `got ${km}`);
            assert.equal(formatDistance(km), '6.1 km');
            assert.equal(formatDistance(12.6), '13 km');
            assert.equal(formatDistance(0.05), 'Under 0.1 km');
            assert.equal(branchAnchor({ code: 'PJ-SS2' }), 'branch-pj-ss2');
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
    console.log(`\nAll ${checks.length} branch checks passed.`);
}
