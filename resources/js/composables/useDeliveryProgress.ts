import {
    computed,
    onBeforeUnmount,
    onMounted,
    readonly,
    shallowRef,
    watch,
} from 'vue';
import type { ComputedRef, DeepReadonly, ShallowRef } from 'vue';
import type { LiveState, ProgressChannel } from '@/lib/deliveryProgress';
import {
    ReloadGuard,
    createProgressListener,
    readProgressMessage,
} from '@/lib/deliveryProgress';
import { connectEcho, releaseEcho } from '@/lib/echo';
import { formatTime } from '@/lib/format';
import type { OrderStatusValue, StopProgress } from '@/types';

/** What a reload passes on to Inertia's router.reload(). */
export type ReloadCallbacks = {
    onFinish: (visit: { cancelled?: boolean; interrupted?: boolean }) => void;
};

/**
 * Keeps a parcel's stop up to date while its page is open: the track page
 * and the customer's order page. It starts from the numbers in the page's
 * props and then follows the messages on the parcel's channel (see
 * lib/deliveryProgress.ts). It asks the server for the page's props again
 * (`reload`) once each time the channel is subscribed (on opening, and
 * after a lost connection is back) and when the status moves on (delivered,
 * say); it never asks on a timer. Props fetched while a message arrived
 * never put back older numbers (ReloadGuard).
 *
 * `asOf` is the time of the last update ("09:42") while the connection is
 * down, so the page can say the count is no longer live; null while live.
 */
export function useDeliveryProgress(options: {
    /** Where to listen, from the props; null when the parcel is on no run. */
    channel: () => ProgressChannel | null;
    /** The status the page shows. */
    status: () => OrderStatusValue;
    /** The stop in the page's props. */
    progress: () => StopProgress | null;
    /** Fetch the page's props again, with an Inertia partial reload. */
    reload: (callbacks: ReloadCallbacks) => void;
}): {
    progress: DeepReadonly<ShallowRef<StopProgress | null>>;
    asOf: ComputedRef<string | null>;
} {
    const progress = shallowRef<StopProgress | null>(options.progress());
    const updatedAt = shallowRef(new Date());
    const state = shallowRef<LiveState>('connecting');
    const guard = new ReloadGuard();

    function show(value: StopProgress | null): void {
        progress.value = value;
        updatedAt.value = new Date();
    }

    // Fresh props (after a reload or a visit) take over from the messages,
    // unless a message arrived while they were fetched.
    watch(options.progress, (value) => {
        if (guard.acceptsProps()) {
            show(value);
        }
    });

    function reload(): void {
        const id = guard.start();

        options.reload({
            onFinish: (visit) => {
                if (
                    guard.finish(
                        id,
                        Boolean(visit.cancelled || visit.interrupted),
                    )
                ) {
                    reload();
                }
            },
        });
    }

    const listener = createProgressListener({
        connect: connectEcho,
        release: releaseEcho,
        onMessage: (message) => {
            guard.message();
            const read = readProgressMessage(options.status(), message);
            show(read.progress);

            if (read.reload) {
                reload();
            }
        },
        onResync: reload,
        onState: (value) => {
            state.value = value;
        },
    });

    // In the browser only: from mounting, and again when the channel changes.
    onMounted(() => void listener.listen(options.channel()));

    watch(
        () => {
            const channel = options.channel();

            return channel ? `${channel.private}:${channel.name}` : null;
        },
        () => void listener.listen(options.channel()),
    );

    onBeforeUnmount(() => listener.stop());

    return {
        progress: readonly(progress),
        asOf: computed(() =>
            state.value === 'offline' ? formatTime(updatedAt.value) : null,
        ),
    };
}
