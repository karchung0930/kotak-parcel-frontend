import type { Component } from 'vue';
import { formatShortDate, formatShortDateTime } from '@/lib/format';
import type { OrderSummary, Pagination } from '@/types';

/**
 * What an admin can do next with a parcel on the dispatch board.
 *
 * assign: a paid parcel · reschedule: a failed delivery with attempts left ·
 * reassign: scheduled but not collected yet · return: a failed delivery
 * that used every attempt (it can only go back to the sender).
 */
export type DispatchAction = 'assign' | 'reschedule' | 'reassign' | 'return';

export const DISPATCH_ACTION_LABELS: Record<DispatchAction, string> = {
    assign: 'Assign',
    reschedule: 'Reschedule',
    reassign: 'Reassign',
    return: 'Return',
};

/** One parcel on the board, with what to show and do for it. */
export type QueueRow = {
    order: OrderSummary;
    action: DispatchAction | null;
    /** The short line under the status. */
    detail: string | null;
    /** Failed attempts so far, or null when unknown. */
    attempts: number | null;
};

/** A titled group of rows on the board (a queue, or one driver's round). */
export type QueueGroup = {
    key: string;
    title: string;
    icon: Component;
    tone: 'paid' | 'failed' | 'brand' | 'neutral';
    /** The rows to show, after the filters. */
    rows: QueueRow[];
    /** How many the group holds in all (every page, before the filters). */
    total: number;
    /** A van plate shown beside the title (drivers' rounds). */
    plate?: string | null;
    /** Page links when the group is paginated on its own (`only` reloads just its prop). */
    pagination?: { meta: Pagination<OrderSummary>['meta']; only: string[] };
};

export const QUEUE_TONE_TEXT: Record<QueueGroup['tone'], string> = {
    paid: 'text-status-paid',
    failed: 'text-status-failed',
    brand: 'text-brand-strong',
    neutral: 'text-ink',
};

/** The next step for a parcel, or null when there is nothing to do (e.g. in the van). */
export function dispatchAction(
    order: OrderSummary,
    maxFailedAttempts: number,
): DispatchAction | null {
    switch (order.status.value) {
        case 'paid':
            return 'assign';
        case 'assigned':
            return 'reassign';
        case 'delivery_failed':
            return (order.failed_attempts ?? 0) < maxFailedAttempts
                ? 'reschedule'
                : 'return';
        default:
            return null;
    }
}

/**
 * Why a delivery failed and when, or who has it and for which day. With
 * `withDriver` off (rows already grouped by driver) it says where the
 * parcel is instead.
 */
function detailOf(order: OrderSummary, withDriver: boolean): string | null {
    const attempt = order.latest_attempt;

    if (order.status.value === 'delivery_failed' && attempt) {
        return [
            attempt.failure_reason?.label ?? 'Not delivered',
            formatShortDateTime(attempt.attempted_at),
        ].join(', ');
    }

    if (
        order.status.value === 'assigned' ||
        order.status.value === 'picked_up'
    ) {
        if (!withDriver) {
            return order.status.value === 'picked_up'
                ? 'In the van'
                : 'Waiting at the branch';
        }

        return [order.driver?.name, formatShortDate(order.scheduled_for)]
            .filter(Boolean)
            .join(', ');
    }

    return null;
}

/** A parcel as a board row. A paid parcel has never been out, so it has no failed attempts. */
export function queueRow(
    order: OrderSummary,
    maxFailedAttempts: number,
    options: { withDriver?: boolean } = {},
): QueueRow {
    return {
        order,
        action: dispatchAction(order, maxFailedAttempts),
        detail: detailOf(order, options.withDriver ?? true),
        attempts:
            order.failed_attempts ?? (order.status.value === 'paid' ? 0 : null),
    };
}
