<script setup lang="ts">
import { computed } from 'vue';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useInitials } from '@/composables/useInitials';
import { formatBranchName } from '@/lib/format';
import type { User } from '@/types';

/** Avatar (initials) with the user's name and, optionally, email or role. */
type Props = {
    user: User;
    showEmail?: boolean;
    showRole?: boolean;
};

const props = withDefaults(defineProps<Props>(), {
    showEmail: false,
    showRole: false,
});

const { getInitials } = useInitials();

const showAvatar = computed(
    () => props.user.avatar && props.user.avatar !== '',
);
</script>

<template>
    <Avatar class="h-8 w-8 overflow-hidden rounded-full">
        <AvatarImage v-if="showAvatar" :src="user.avatar!" :alt="user.name" />
        <AvatarFallback
            class="rounded-full bg-brand-tint text-[12px] font-bold text-brand-strong"
        >
            {{ getInitials(user.name) }}
        </AvatarFallback>
    </Avatar>

    <div class="grid min-w-0 flex-1 text-left text-sm leading-tight">
        <span class="truncate font-bold text-ink">{{ user.name }}</span>
        <span v-if="showEmail" class="truncate text-xs text-muted-foreground">{{
            user.email
        }}</span>
        <!-- The branch gets a line of its own (two if it must, wrapping
             after its dash), as the card is too narrow for "Branch Staff ·
             Petaling Jaya - SS2". Plain text, so the clamp still counts
             its lines. -->
        <template v-if="showRole">
            <span class="truncate text-xs text-muted-foreground">
                {{ user.role.label }}
            </span>
            <span
                v-if="user.branch_name"
                class="line-clamp-2 text-xs text-muted-foreground"
            >
                {{ formatBranchName(user.branch_name) }}
            </span>
        </template>
    </div>
</template>
