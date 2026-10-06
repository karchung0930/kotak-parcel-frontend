<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import FormRow from '@/components/admin/FormRow.vue';
import FormSection from '@/components/admin/FormSection.vue';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { Props as ManagePasskeysProps } from '@/components/ManagePasskeys.vue';
import ManagePasskeys from '@/components/ManagePasskeys.vue';
import type { Props as ManageTwoFactorProps } from '@/components/ManageTwoFactor.vue';
import ManageTwoFactor from '@/components/ManageTwoFactor.vue';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

const props = defineProps<Props>();

const inputClass = 'h-11 rounded-lg bg-white text-base md:text-[15px]';
</script>

<template>
    <Head title="Security settings" />

    <!-- A card per thing to save, like the admin forms: the button at the
         top right, a row per field, all fields one width. -->
    <Form
        v-bind="SecurityController.update.form()"
        :options="{
            preserveScroll: true,
        }"
        reset-on-success
        :reset-on-error="[
            'password',
            'password_confirmation',
            'current_password',
        ]"
        v-slot="{ errors, processing }"
    >
        <FormSection
            title="Password"
            description="Use a long password that you don't use for any other site."
        >
            <template #actions>
                <Button
                    type="submit"
                    :disabled="processing"
                    class="h-11 rounded-lg px-5 text-[15px] font-bold"
                    data-test="update-password-button"
                >
                    <Spinner v-if="processing" />
                    Update password
                </Button>
            </template>
            <FormRow label="Current password" for="current_password">
                <PasswordInput
                    id="current_password"
                    name="current_password"
                    autocomplete="current-password"
                    placeholder="Current password"
                    :class="inputClass"
                    :aria-invalid="errors.current_password ? true : undefined"
                    :aria-describedby="
                        errors.current_password
                            ? 'current_password-error'
                            : undefined
                    "
                />
                <InputError
                    id="current_password-error"
                    :message="errors.current_password"
                    class="mt-1.5"
                />
            </FormRow>
            <FormRow label="New password" for="password">
                <PasswordInput
                    id="password"
                    name="password"
                    autocomplete="new-password"
                    placeholder="New password"
                    :passwordrules="props.passwordRules"
                    :class="inputClass"
                    :aria-invalid="errors.password ? true : undefined"
                    :aria-describedby="
                        errors.password ? 'password-error' : undefined
                    "
                />
                <InputError
                    id="password-error"
                    :message="errors.password"
                    class="mt-1.5"
                />
            </FormRow>
            <FormRow label="Confirm new password" for="password_confirmation">
                <PasswordInput
                    id="password_confirmation"
                    name="password_confirmation"
                    autocomplete="new-password"
                    placeholder="Type it again"
                    :passwordrules="props.passwordRules"
                    :class="inputClass"
                    :aria-invalid="
                        errors.password_confirmation ? true : undefined
                    "
                    :aria-describedby="
                        errors.password_confirmation
                            ? 'password_confirmation-error'
                            : undefined
                    "
                />
                <InputError
                    id="password_confirmation-error"
                    :message="errors.password_confirmation"
                    class="mt-1.5"
                />
            </FormRow>
        </FormSection>
    </Form>

    <ManageTwoFactor
        :canManageTwoFactor="canManageTwoFactor"
        :requiresConfirmation="requiresConfirmation"
        :twoFactorEnabled="twoFactorEnabled"
    />

    <ManagePasskeys
        :canManagePasskeys="canManagePasskeys"
        :passkeys="passkeys"
    />
</template>
