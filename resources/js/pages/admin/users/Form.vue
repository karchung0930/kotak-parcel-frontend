<script setup lang="ts">
import { Head, Link, useForm, usePage } from '@inertiajs/vue3';
import { Lock, Mail } from '@lucide/vue';
import { computed, nextTick } from 'vue';
import FormField from '@/components/admin/FormField.vue';
import FormSection from '@/components/admin/FormSection.vue';
import SwitchField from '@/components/admin/SwitchField.vue';
import ChoiceCard from '@/components/ChoiceCard.vue';
import InputError from '@/components/InputError.vue';
import NativeSelect from '@/components/NativeSelect.vue';
import Notice from '@/components/Notice.vue';
import PageHeader from '@/components/PageHeader.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { formatDate } from '@/lib/format';
import { create, edit, index, store, update } from '@/routes/admin/users';
import type { AdminUsersFormPageProps, RoleValue } from '@/types';

const props = defineProps<AdminUsersFormPageProps>();

const page = usePage();

/** Admins cannot change their own role or deactivate themselves (the server checks too). */
const isSelf = computed(
    () => props.user !== null && props.user.id === page.props.auth.user.id,
);

const title = computed(() =>
    props.user ? `Edit ${props.user.name}` : 'Add a user',
);

const description = computed(() => {
    const user = props.user;

    if (!user) {
        return 'Create an account for a staff member, driver or admin. They choose their own password.';
    }

    return [
        user.role.label,
        `joined ${formatDate(user.created_at)}`,
        user.email_verified_at ? null : 'email not verified',
    ]
        .filter(Boolean)
        .join(' · ');
});

const breadcrumbs = computed(() => [
    { title: 'Users', href: index() },
    {
        title: props.user ? props.user.name : 'Add a user',
        href: props.user ? edit(props.user.id) : create(),
    },
]);

const ROLE_DESCRIPTIONS: Record<RoleValue, string> = {
    customer: 'Sends parcels and follows them on the website.',
    staff: 'Weighs parcels and takes payment at one branch counter.',
    admin: 'Runs dispatch and manages orders, users and branches.',
    driver: 'Collects parcels from branches and delivers them, from a phone.',
};

const form = useForm({
    name: props.user?.name ?? '',
    email: props.user?.email ?? '',
    /** E.164 ("+60123456789"); PhoneInput shows it as "12-345 6789". */
    phone: props.user?.phone ?? '',
    role: props.user?.role.value ?? ('staff' as RoleValue),
    branch_id: props.user?.branch?.id ?? (null as number | null),
    vehicle_plate: props.user?.vehicle_plate ?? '',
    is_active: props.user?.is_active ?? true,
});

const errors = computed(() => form.errors as Partial<Record<string, string>>);

const needsBranch = computed(
    () => form.role === 'staff' || form.role === 'admin',
);
const needsVehicle = computed(() => form.role === 'driver');

/** The user's branch when it has since been deactivated (it is not in the list). */
const inactiveBranch = computed(() => {
    const current = props.user?.branch;

    return current && !props.branches.some((branch) => branch.id === current.id)
        ? current
        : null;
});

/** The notes read out with the role choice and the active switch. */
function describedBy(...ids: (string | false)[]): string | undefined {
    return ids.filter(Boolean).join(' ') || undefined;
}

const roleDescribedBy = computed(() =>
    describedBy(
        isSelf.value && 'user-role-locked',
        !!errors.value.role && 'user-role-error',
    ),
);

const activeDescribedBy = computed(() =>
    describedBy(
        isSelf.value && 'user-active-locked',
        !!errors.value.is_active && 'user-active-error',
    ),
);

function focusFirstError(): void {
    void nextTick(() =>
        document
            .querySelector<HTMLElement>('main [aria-invalid="true"]')
            ?.focus(),
    );
}

function submit(): void {
    // A branch is kept only for staff and admins, a vehicle only for drivers.
    form.transform((data) => ({
        ...data,
        branch_id: needsBranch.value ? data.branch_id : null,
        vehicle_plate: needsVehicle.value ? data.vehicle_plate : null,
    }));

    form.submit(props.user ? update(props.user.id) : store(), {
        preserveScroll: true,
        onError: focusFirstError,
    });
}
</script>

<template>
    <Head :title="title" />

    <div class="max-w-5xl space-y-6">
        <PageHeader
            :title="title"
            :breadcrumbs="breadcrumbs"
            :description="description"
        />

        <form class="space-y-6" novalidate @submit.prevent="submit">
            <FormSection
                title="Account"
                description="Who this is and how to reach them."
            >
                <FormField
                    id="user-name"
                    label="Full name"
                    :error="errors.name"
                >
                    <template #default="{ describedby, invalid }">
                        <Input
                            id="user-name"
                            v-model="form.name"
                            required
                            autocomplete="off"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            class="h-11 rounded-lg bg-white text-base md:text-[15px]"
                        />
                    </template>
                </FormField>

                <div class="grid gap-5 sm:grid-cols-2">
                    <FormField
                        id="user-email"
                        label="Email address"
                        :error="errors.email"
                    >
                        <template #default="{ describedby, invalid }">
                            <Input
                                id="user-email"
                                v-model="form.email"
                                type="email"
                                required
                                autocomplete="off"
                                spellcheck="false"
                                :aria-describedby="describedby"
                                :aria-invalid="invalid"
                                class="h-11 rounded-lg bg-white text-base md:text-[15px]"
                            />
                        </template>
                    </FormField>

                    <!-- PhoneInput shows the phone error itself. -->
                    <FormField id="user-phone" label="Mobile number">
                        <PhoneInput
                            id="user-phone"
                            v-model="form.phone"
                            kind="mobile"
                            required
                            autocomplete="off"
                            :error="errors.phone"
                            class="rounded-lg"
                            @update:model-value="form.clearErrors('phone')"
                        />
                    </FormField>
                </div>

                <Notice v-if="!user" tone="brand" :icon="Mail">
                    {{ form.name.trim() || 'They' }} will get an email
                    {{ form.email.trim() ? `at ${form.email.trim()}` : '' }}
                    with a link to choose a password. Nobody else ever sees it.
                </Notice>
            </FormSection>

            <FormSection
                title="Role and work"
                description="What they can do in Kotak, and where."
            >
                <fieldset
                    :disabled="isSelf"
                    :aria-describedby="roleDescribedBy"
                    class="min-w-0"
                >
                    <legend class="text-sm leading-5 font-bold text-ink">
                        Role
                    </legend>
                    <div class="mt-2 grid gap-2 sm:grid-cols-2">
                        <ChoiceCard
                            v-for="role in roles"
                            :key="role.value"
                            v-model="form.role"
                            name="role"
                            :value="role.value"
                            :title="role.label"
                            :hint="ROLE_DESCRIPTIONS[role.value]"
                            :aria-invalid="errors.role ? true : undefined"
                        />
                    </div>
                    <p
                        v-if="isSelf"
                        id="user-role-locked"
                        class="mt-2 flex items-start gap-1.5 text-[13px] leading-5 text-balance text-muted-foreground"
                    >
                        <Lock
                            aria-hidden="true"
                            class="mt-[3px] size-3.5 flex-none"
                        />
                        You cannot change your own role.
                    </p>
                    <InputError
                        id="user-role-error"
                        :message="errors.role"
                        class="mt-2"
                    />
                </fieldset>

                <FormField
                    v-if="needsBranch"
                    id="user-branch"
                    label="Branch"
                    :optional="form.role === 'admin'"
                    :hint="
                        form.role === 'admin'
                            ? 'Counter work by this admin is recorded against it.'
                            : 'The counter this person works at.'
                    "
                    :error="errors.branch_id"
                >
                    <template #default="{ describedby, invalid }">
                        <NativeSelect
                            id="user-branch"
                            v-model="form.branch_id"
                            :required="form.role === 'staff'"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                        >
                            <option
                                :value="null"
                                :disabled="form.role === 'staff'"
                            >
                                {{
                                    form.role === 'staff'
                                        ? 'Choose a branch'
                                        : 'No branch'
                                }}
                            </option>
                            <option
                                v-if="inactiveBranch"
                                :value="inactiveBranch.id"
                                disabled
                            >
                                {{ inactiveBranch.name }} (deactivated)
                            </option>
                            <option
                                v-for="branch in branches"
                                :key="branch.id"
                                :value="branch.id"
                            >
                                {{ branch.name }} · {{ branch.city }}
                            </option>
                        </NativeSelect>
                    </template>
                </FormField>

                <FormField
                    v-if="needsVehicle"
                    id="user-plate"
                    label="Vehicle plate"
                    hint="As printed on the van, e.g. WXY 4821."
                    :error="errors.vehicle_plate"
                >
                    <template #default="{ describedby, invalid }">
                        <Input
                            id="user-plate"
                            v-model="form.vehicle_plate"
                            required
                            maxlength="16"
                            autocomplete="off"
                            autocapitalize="characters"
                            spellcheck="false"
                            :aria-describedby="describedby"
                            :aria-invalid="invalid"
                            class="h-11 max-w-60 rounded-lg bg-white font-mono text-base font-bold tracking-[0.04em] uppercase md:text-[15px]"
                        />
                    </template>
                </FormField>
            </FormSection>

            <FormSection
                title="Access"
                description="Accounts are never deleted, so their history stays complete."
            >
                <SwitchField
                    id="user-active"
                    v-model="form.is_active"
                    label="Can sign in"
                    description="A deactivated account is signed out and cannot sign in again until it is reactivated."
                    on-label="Active"
                    off-label="Deactivated"
                    :disabled="isSelf"
                    :describedby="activeDescribedBy"
                >
                    <p
                        v-if="isSelf"
                        id="user-active-locked"
                        class="mt-2 flex items-start gap-1.5 text-[13px] leading-5 text-pretty text-muted-foreground sm:text-balance"
                    >
                        <Lock
                            aria-hidden="true"
                            class="mt-[3px] size-3.5 flex-none"
                        />
                        You cannot deactivate your own account.
                    </p>
                    <p
                        v-else-if="user?.role.value === 'driver'"
                        class="mt-2 text-[13px] leading-5 text-pretty text-muted-foreground sm:text-balance"
                    >
                        A driver with deliveries in progress cannot be
                        deactivated or moved to another role. Reassign their
                        deliveries on the dispatch board first.
                    </p>
                </SwitchField>
                <InputError
                    id="user-active-error"
                    :message="errors.is_active"
                />
            </FormSection>

            <div
                class="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end"
            >
                <Button
                    variant="outline"
                    as-child
                    class="h-12 rounded-lg px-5 text-[15px] font-bold"
                >
                    <Link :href="index()">Cancel</Link>
                </Button>
                <Button
                    type="submit"
                    :disabled="form.processing"
                    class="h-12 rounded-lg px-6 text-[15px] font-bold"
                >
                    <Spinner v-if="form.processing" />
                    {{ user ? 'Save changes' : 'Create account' }}
                </Button>
            </div>
        </form>
    </div>
</template>
