<script setup lang="ts">
import { Form, Head, usePage } from '@inertiajs/vue3';
import { MailWarning } from '@lucide/vue';
import { computed } from 'vue';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/DeleteUser.vue';
import FormRow from '@/components/admin/FormRow.vue';
import FormSection from '@/components/admin/FormSection.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { send } from '@/routes/verification';

const page = usePage();
const user = computed(() => page.props.auth.user);

const inputClass = 'h-11 rounded-lg bg-white text-base md:text-[15px]';
</script>

<template>
    <Head title="Profile settings" />

    <!-- The same card as the admin forms: Save changes at the top right,
         a row per field. -->
    <Form
        v-bind="ProfileController.update.form()"
        :options="{ preserveScroll: true }"
        v-slot="{ errors, processing, clearErrors }"
    >
        <FormSection
            title="Profile"
            description="Your name, email address and mobile number."
        >
            <template #actions>
                <Button
                    type="submit"
                    :disabled="processing"
                    class="h-11 rounded-lg px-5 text-[15px] font-bold"
                    data-test="update-profile-button"
                >
                    <Spinner v-if="processing" />
                    Save changes
                </Button>
            </template>

            <FormRow label="Full name" for="name">
                <Input
                    id="name"
                    name="name"
                    :default-value="user.name"
                    required
                    autocomplete="name"
                    placeholder="Full name"
                    :class="inputClass"
                    :aria-invalid="errors.name ? true : undefined"
                    :aria-describedby="errors.name ? 'name-error' : undefined"
                />
                <InputError
                    id="name-error"
                    :message="errors.name"
                    class="mt-1.5"
                />
            </FormRow>

            <FormRow label="Email address" for="email">
                <Input
                    id="email"
                    type="email"
                    name="email"
                    :default-value="user.email"
                    required
                    autocomplete="username"
                    placeholder="you@example.com"
                    :class="inputClass"
                    :aria-invalid="errors.email ? true : undefined"
                    :aria-describedby="errors.email ? 'email-error' : undefined"
                />
                <InputError
                    id="email-error"
                    :message="errors.email"
                    class="mt-1.5"
                />
            </FormRow>

            <FormRow label="Mobile number" for="phone">
                <PhoneInput
                    id="phone"
                    name="phone"
                    kind="mobile"
                    :default-value="user.phone"
                    required
                    :error="errors.phone"
                    @update:model-value="clearErrors('phone')"
                />
            </FormRow>

            <FormRow
                v-if="page.props.mustVerifyEmail && !user.email_verified_at"
                attached
            >
                <Notice
                    tone="warning"
                    :icon="MailWarning"
                    title="Your email address is not verified yet"
                >
                    <p>
                        Check your inbox for the verification link.
                        <TextLink :href="send()" as="button">
                            Send it again
                        </TextLink>
                    </p>
                    <p
                        v-if="page.props.status === 'verification-link-sent'"
                        role="status"
                        class="mt-1 font-semibold text-status-delivered"
                    >
                        A new verification link is on its way to your inbox.
                    </p>
                </Notice>
            </FormRow>
        </FormSection>
    </Form>

    <!-- The server only lets customers delete their own account. -->
    <DeleteUser v-if="user.role.value === 'customer'" />
    <FormSection
        v-else
        title="Closing your account"
        description="Staff, driver and admin accounts are deactivated by an administrator instead of being deleted, so parcel records stay complete. Ask an admin if you are leaving."
    />
</template>
