<script setup lang="ts">
import { Form, Head } from '@inertiajs/vue3';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
import PasswordInput from '@/components/PasswordInput.vue';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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

const labelClass = 'text-[13.5px] leading-[19px] font-semibold text-ink';
const inputClass = 'h-11 text-base md:text-[15px]';
</script>

<template>
    <Head title="Security settings" />

    <div class="space-y-6">
        <Heading
            variant="small"
            title="Password"
            description="Use a long password that you don't use for any other site."
        />

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
            class="space-y-5"
            v-slot="{ errors, processing }"
        >
            <div class="grid gap-1.5 sm:max-w-md">
                <Label for="current_password" :class="labelClass">
                    Current password
                </Label>
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
                />
            </div>

            <div class="grid gap-5 sm:grid-cols-2">
                <div class="grid content-start gap-1.5">
                    <Label for="password" :class="labelClass">
                        New password
                    </Label>
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
                    />
                </div>

                <div class="grid content-start gap-1.5">
                    <Label for="password_confirmation" :class="labelClass">
                        Confirm new password
                    </Label>
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
                    />
                </div>
            </div>

            <div class="flex items-center gap-4 border-t border-line-soft pt-5">
                <Button
                    :disabled="processing"
                    class="h-11 px-6 font-bold"
                    data-test="update-password-button"
                >
                    <Spinner v-if="processing" />
                    Update password
                </Button>
            </div>
        </Form>
    </div>

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
