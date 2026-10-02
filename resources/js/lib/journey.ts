import type { Option, OrderStatusValue } from '@/types';

/**
 * The parcel journey shown by JourneyConveyor: four stations from the
 * customer's phone to the receiver's door.
 */

export type JourneyStage = 'order' | 'counter' | 'van' | 'door';

/**
 * active: moving normally; issue: a delivery attempt failed; ended: stopped
 * early (returned or cancelled); complete: delivered.
 */
export type JourneyTone = 'active' | 'issue' | 'ended' | 'complete';

/**
 * How a station is drawn: idle in the plain "How it works" picture; done,
 * current or upcoming when the conveyor shows an order's progress.
 */
export type JourneyStageState = 'idle' | 'done' | 'current' | 'upcoming';

export type JourneyPosition = {
    /** The station the parcel is at, or null when the order was cancelled. */
    stage: JourneyStage | null;
    tone: JourneyTone;
};

export const JOURNEY_STAGES: readonly JourneyStage[] = [
    'order',
    'counter',
    'van',
    'door',
];

export const JOURNEY_STAGE_COPY: Record<
    JourneyStage,
    { title: string; short: string; description: string }
> = {
    order: {
        title: 'Create order online',
        short: 'Ordered',
        description:
            'Add the receiver and parcel details. Get a price, a KT- tracking number and your nearest branch.',
    },
    counter: {
        title: 'Drop off at a branch',
        short: 'At the branch',
        description:
            'Staff weigh your parcel at the counter. Pay by cash or card and keep your receipt.',
    },
    van: {
        title: 'We deliver',
        short: 'Delivery',
        description:
            'A Kotak driver collects it from the branch on the scheduled day and drives it to the door.',
    },
    door: {
        title: 'Track every step',
        short: 'Delivered',
        description:
            'Follow each scan with your KT- number. At the door we record who received it, with a photo.',
    },
};

const POSITIONS: Record<OrderStatusValue, JourneyPosition> = {
    created: { stage: 'order', tone: 'active' },
    dropped_off: { stage: 'counter', tone: 'active' },
    paid: { stage: 'counter', tone: 'active' },
    assigned: { stage: 'van', tone: 'active' },
    picked_up: { stage: 'van', tone: 'active' },
    delivered: { stage: 'door', tone: 'complete' },
    delivery_failed: { stage: 'van', tone: 'issue' },
    returned_to_sender: { stage: 'van', tone: 'ended' },
    cancelled: { stage: null, tone: 'ended' },
};

/** Where an order with this status is on the journey. */
export function journeyPosition(status: OrderStatusValue): JourneyPosition {
    return POSITIONS[status];
}

/** The stage each status first reaches (used to date the stations). */
const STAGE_REACHED_BY: Partial<Record<OrderStatusValue, JourneyStage>> = {
    created: 'order',
    dropped_off: 'counter',
    assigned: 'van',
    picked_up: 'van',
    delivered: 'door',
};

/**
 * When each stage was first reached, from a status history (oldest first,
 * as StatusEvent[] and TrackingEvent[] arrive). Pass it to JourneyConveyor
 * as `times`.
 */
export function journeyTimes(
    events: readonly { status: Option<OrderStatusValue>; created_at: string }[],
): Partial<Record<JourneyStage, string>> {
    const times: Partial<Record<JourneyStage, string>> = {};

    for (const event of events) {
        const stage = STAGE_REACHED_BY[event.status.value];

        if (stage && !times[stage]) {
            times[stage] = event.created_at;
        }
    }

    return times;
}
