import type { InjectionKey } from 'vue';

/**
 * Set by FormSection: fields inside it lay out as rows, label and hint on
 * the left third and the control on the right two thirds (from md).
 */
export const formRowsKey: InjectionKey<boolean> = Symbol('formRows');

/**
 * The row grid shared by FormField, FormRow and SwitchField. Every row
 * aligns one way: the label column starts at the control's top, its first
 * line centred on a single-line (44px) control (the label's pt-3).
 */
export const rowGrid =
    'grid min-w-0 gap-x-8 gap-y-2.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]';
