import type { LucideIcon } from '@lucide/vue';
import {
    CircleX,
    ClipboardCheck,
    FilePlus2,
    PackageCheck,
    Receipt,
    Store,
    TriangleAlert,
    Truck,
    Undo2,
} from '@lucide/vue';
import type { Option, OrderStatusValue } from '@/types';

/**
 * How each order status looks everywhere: its icon and colour pair. A
 * status is never shown by colour alone; StatusChip always pairs the icon
 * with the label.
 */

export type StatusTone =
    | 'neutral'
    | 'paid'
    | 'transit'
    | 'delivered'
    | 'failed'
    | 'returned';

export type StatusMeta = {
    label: string;
    icon: LucideIcon;
    tone: StatusTone;
};

export const STATUS_META: Record<OrderStatusValue, StatusMeta> = {
    created: { label: 'Created', icon: FilePlus2, tone: 'neutral' },
    dropped_off: { label: 'Dropped Off', icon: Store, tone: 'neutral' },
    paid: { label: 'Paid', icon: Receipt, tone: 'paid' },
    assigned: { label: 'Assigned', icon: ClipboardCheck, tone: 'neutral' },
    picked_up: { label: 'Picked Up', icon: Truck, tone: 'transit' },
    delivered: { label: 'Delivered', icon: PackageCheck, tone: 'delivered' },
    delivery_failed: {
        label: 'Delivery Failed',
        icon: TriangleAlert,
        tone: 'failed',
    },
    returned_to_sender: {
        label: 'Returned to Sender',
        icon: Undo2,
        tone: 'returned',
    },
    cancelled: { label: 'Cancelled', icon: CircleX, tone: 'neutral' },
};

/** Text, background and border classes for each tone (all 4.5:1 or better). */
export const STATUS_TONE_CLASSES: Record<StatusTone, string> = {
    neutral: 'bg-status-neutral-tint text-status-neutral border-transparent',
    paid: 'bg-status-paid-tint text-status-paid border-transparent',
    transit: 'bg-brand-tint text-brand-strong border-transparent',
    delivered:
        'bg-status-delivered-tint text-status-delivered border-transparent',
    failed: 'bg-status-failed-tint text-status-failed border-transparent',
    returned: 'bg-white text-status-neutral border-status-returned-edge',
};

/** Accepts a status value or the { value, label } option the server sends. */
export function statusValue(
    status: OrderStatusValue | Option<OrderStatusValue>,
): OrderStatusValue {
    return typeof status === 'string' ? status : status.value;
}

export function statusMeta(
    status: OrderStatusValue | Option<OrderStatusValue>,
): StatusMeta {
    const meta = STATUS_META[statusValue(status)];

    return typeof status === 'string' ? meta : { ...meta, label: status.label };
}
