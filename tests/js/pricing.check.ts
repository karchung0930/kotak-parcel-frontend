/**
 * A dependency-free self-check for resources/js/lib/pricing.ts. The cases in
 * fixtures/pricing-cases.json are shared with the backend, whose
 * PriceCalculatorTest runs them through App\Support\PriceCalculator, so the
 * live estimate and the server's price never drift apart. Run it with:
 * node --experimental-strip-types --no-warnings tests/js/pricing.check.ts
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
    billedWeightGrams,
    chargedByVolume,
    estimatePrice,
    homeZone,
    kgToGrams,
    lowestExtraKgSen,
    lowestPriceSen,
    quote,
    ringgitToSen,
    routeLabel,
    routeName,
    senToRinggit,
    volumetricWeightGrams,
    zoneFor,
} from '../../resources/js/lib/pricing.ts';
import type { PriceQuote } from '../../resources/js/lib/pricing.ts';
import type {
    MalaysianStateValue,
    PriceList,
} from '../../resources/js/types/domain.ts';

type Case = {
    name: string;
    card: string;
    origin: MalaysianStateValue;
    destination: MalaysianStateValue;
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
    quote: PriceQuote;
};

const fixture = JSON.parse(
    readFileSync(
        new URL('./fixtures/pricing-cases.json', import.meta.url),
        'utf8',
    ),
) as { cards: Record<string, PriceList>; cases: Case[] };

const flat = fixture.cards.flat;
const zoned = fixture.cards.zoned;

const checks: [string, () => void][] = [
    ...fixture.cases.map((item): [string, () => void] => [
        `shared case: ${item.name}`,
        () => {
            assert.deepEqual(
                quote(
                    fixture.cards[item.card],
                    item.origin,
                    item.destination,
                    item.weightG,
                    item.lengthCm,
                    item.widthCm,
                    item.heightCm,
                ),
                item.quote,
            );
        },
    ]),
    [
        'volumetric weight uses the card divisor, rounded up',
        () => {
            assert.equal(volumetricWeightGrams(5000, 33, 27, 19), 3386);
            assert.equal(volumetricWeightGrams(6000, 33, 27, 19), 2822);
            assert.equal(volumetricWeightGrams(5000, 40, 30, 25), 6000);
        },
    ],
    [
        'estimates wait for the route and every size',
        () => {
            const size = {
                weightG: kgToGrams('4.2'),
                lengthCm: 40,
                widthCm: 30,
                heightCm: 25,
            };
            const priced = estimatePrice(
                flat,
                { origin: 'Selangor', destination: 'Kuala Lumpur' },
                size,
            );

            assert.equal(priced?.priceSen, 1800);
            assert.equal(
                estimatePrice(
                    flat,
                    { origin: 'Selangor', destination: null },
                    size,
                ),
                null,
            );
            assert.equal(
                estimatePrice(
                    flat,
                    { origin: null, destination: 'Kuala Lumpur' },
                    size,
                ),
                null,
            );
            assert.equal(
                estimatePrice(
                    flat,
                    { origin: 'Selangor', destination: 'Johor' },
                    { weightG: 1000, lengthCm: 10 },
                ),
                null,
            );
        },
    ],
    [
        'a card without a route for the states gives no quote',
        () => {
            const westOnly = { ...zoned, routes: zoned.routes.slice(0, 1) };

            assert.equal(
                quote(westOnly, 'Selangor', 'Sabah', 1000, 10, 10, 10),
                null,
            );
        },
    ],
    [
        'the billed weight and how the parcel was charged',
        () => {
            const byBand = quote(zoned, 'Selangor', 'Sabah', 1600, 35, 25, 10);
            const bySize = quote(flat, 'Selangor', 'Johor', 4200, 40, 30, 25);

            assert.ok(byBand && bySize);
            assert.equal(billedWeightGrams(byBand), 2000);
            assert.equal(chargedByVolume(byBand), false);
            assert.equal(billedWeightGrams(bySize), 6000);
            assert.equal(chargedByVolume(bySize), true);
        },
    ],
    [
        'zones, route labels and "from" prices',
        () => {
            const west = zoneFor(zoned, 'Kuala Lumpur');
            const east = zoneFor(zoned, 'Labuan');

            assert.ok(west && east);
            assert.equal(
                routeLabel(west, east),
                'Peninsular Malaysia → East Malaysia',
            );
            assert.equal(routeLabel(east, east), 'Within East Malaysia');
            assert.equal(routeName('Sarawak', 'Sarawak'), 'Within Sarawak');
            assert.equal(routeName('Sabah', 'Sarawak'), 'Sabah → Sarawak');
            // In the editor two zones can share a name for a while.
            assert.equal(routeName('West', 'West', false), 'West → West');
            assert.equal(lowestPriceSen(zoned), 800);
            assert.equal(lowestPriceSen(zoned, 'east-malaysia'), 900);
            assert.equal(lowestExtraKgSen(zoned), 200);
        },
    ],
    [
        'the home zone is where most branches are, whatever the zone order',
        () => {
            const eastFirst = { ...zoned, zones: [...zoned.zones].reverse() };

            assert.equal(
                homeZone(eastFirst, ['Selangor', 'Kuala Lumpur', 'Sabah'])
                    ?.code,
                'peninsular-malaysia',
            );
            assert.equal(homeZone(eastFirst, ['Sabah'])?.code, 'east-malaysia');
            // A tie goes to the first zone listed.
            assert.equal(
                homeZone(zoned, ['Sabah', 'Selangor'])?.code,
                'peninsular-malaysia',
            );

            // Without branches: the first zone that has states.
            const emptyFirst = {
                ...zoned,
                zones: [
                    { code: 'nowhere', name: 'Nowhere', states: [] },
                    ...zoned.zones,
                ],
            };

            assert.equal(homeZone(emptyFirst, [])?.code, 'peninsular-malaysia');
        },
    ],
    [
        'public cards have no id, so neither do their quotes',
        () => {
            const { id: _id, name: _name, ...publicCard } = flat;

            assert.equal(
                quote(publicCard, 'Selangor', 'Johor', 1000, 10, 10, 10)
                    ?.rateCardId,
                null,
            );
        },
    ],
    [
        'kilograms and ringgit typed by people',
        () => {
            assert.equal(kgToGrams('0,5'), 500);
            assert.ok(Number.isNaN(kgToGrams('heavy')));
            assert.equal(ringgitToSen('8.5'), 850);
            assert.equal(ringgitToSen('RM 12.00'), 1200);
            assert.equal(ringgitToSen('0'), 0);
            assert.ok(Number.isNaN(ringgitToSen('8.505')));
            assert.ok(Number.isNaN(ringgitToSen('-1')));
            assert.equal(senToRinggit(850), '8.50');
            assert.equal(senToRinggit(null), '');
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
    console.log(`\nAll ${checks.length} pricing checks passed.`);
}
