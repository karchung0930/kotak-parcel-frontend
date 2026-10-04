<script setup lang="ts">
import { Form, Head, usePage } from '@inertiajs/vue3';
import { MailWarning } from '@lucide/vue';
import { computed } from 'vue';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/DeleteUser.vue';
import Heading from '@/components/Heading.vue';
import InputError from '@/components/InputError.vue';
import Notice from '@/components/Notice.vue';
import PhoneInput from '@/components/PhoneInput.vue';
import TextLink from '@/components/TextLink.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { send } from '@/routes/verification';

const page = usePage();
const user = computed(() => page.props.auth.user);

const labelClass = 'text-[13.5px] leading-[19px] font-semibold text-ink';
const inputClass = 'h-11 text-base md:text-[15px]';
</script>

<template>
    <Head title="Profile settings" />

    <div class="space-y-6">
        <Heading
            variant="small"
            title="Profile"
            description="Your name, email address and mobile number."
        />

        <Form
            v-bind="ProfileController.update.form()"
            :options="{ preserveScroll: true }"
            class="space-y-5"
            v-slot="{ errors, processing, clearErrors }"
        >
            <!-- Email and mobile share a row only when the card (a
                 @container) is at least 32rem wide: in a narrower card a
                 half-width mobile field cuts the number off -->
            <div class="grid gap-5 @lg:grid-cols-2">
                <div class="grid gap-1.5 @lg:col-span-2">
                    <Label for="name" :class="labelClass">Full name</Label>
                    <Input
                        id="name"
                        name="name"
                        :default-value="user.name"
                        required
                        autocomplete="name"
                        placeholder="Full name"
                        :class="inputClass"
                        :aria-invalid="errors.name ? true : undefined"
                        :aria-describedby="
                            errors.name ? 'name-error' : undefined
                        "
                    />
                    <InputError id="name-error" :message="errors.name" />
                </div>

                <div class="grid content-start gap-1.5">
                    <Label for="email" :class="labelClass">Email address</Label>
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
                        :aria-describedby="
                            errors.email ? 'email-error' : undefined
                        "
                    />
                    <InputError id="email-error" :message="errors.email" />
                </div>

                <div class="grid content-start gap-1.5">
                    <Label for="phone" :class="labelClass">Mobile number</Label>
                    <PhoneInput
                        id="phone"
                        name="phone"
                        kind="mobile"
                        :default-value="user.phone"
                        required
                        :error="errors.phone"
                        @update:model-value="clearErrors('phone')"
                    />
                </div>
            </div>

            <Notice
                v-if="page.props.mustVerifyEmail && !user.email_verified_at"
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

            <div class="flex items-center gap-4 border-t border-line-soft pt-5">
                <Button
                    :disabled="processing"
                    class="h-11 px-6 font-bold"
                    data-test="update-profile-button"
                >
                    <Spinner v-if="processing" />
                    Save changes
                </Button>
            </div>
        </Form>
    </div>

    <!-- The server only lets customers delete their own account. -->
    <DeleteUser v-if="user.role.value === 'customer'" />
    <Heading
        v-else
        variant="small"
        title="Closing your account"
        description="Staff, driver and admin accounts are deactivated by an administrator instead of being deleted, so parcel records stay complete. Ask an admin if you are leaving."
    />
</template>
