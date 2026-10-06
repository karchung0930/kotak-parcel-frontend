import { useResizeObserver } from '@vueuse/core';
import type { Ref } from 'vue';
import { ref } from 'vue';

/**
 * Whether a sideways-scrolling box hides content past its right edge: the
 * box shows a fade there and a "more →" hint above while it does, and both
 * go once it is scrolled to the end. Call `measure` on the box's scroll.
 */
export function useScrollHint(scroller: Readonly<Ref<HTMLElement | null>>): {
    overflows: Ref<boolean>;
    moreRight: Ref<boolean>;
    measure: () => void;
} {
    const overflows = ref(false);
    const moreRight = ref(false);

    function measure(): void {
        const el = scroller.value;

        if (!el) {
            return;
        }

        overflows.value = el.scrollWidth > el.clientWidth + 1;
        moreRight.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    }

    useResizeObserver(scroller, measure);

    return { overflows, moreRight, measure };
}
