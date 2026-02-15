<template>
  <div
    class="priority-selector"
    :class="[`priority-selector--${size}`, `priority-selector--active-${modelValue}`]"
    role="radiogroup"
    aria-label="Priority"
  >
    <div class="priority-selector__track">
      <div
        class="priority-selector__indicator"
        :class="`priority-selector__indicator--${modelValue}`"
        :style="indicatorStyle"
      />
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        role="radio"
        :aria-checked="modelValue === option.value"
        class="priority-selector__option"
        :class="{
          'priority-selector__option--active': modelValue === option.value,
          [`priority-selector__option--${option.value}`]: true,
        }"
        @click="$emit('update:modelValue', option.value)"
      >
        <span class="priority-selector__label">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Priority } from '~/composables/useTodos'

const props = withDefaults(defineProps<{
  modelValue: Priority
  size?: 'sm' | 'default'
}>(), {
  size: 'default',
})

defineEmits<{
  'update:modelValue': [value: Priority]
}>()

const options: { value: Priority; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Med' },
  { value: 'high', label: 'High' },
]

const indicatorStyle = computed(() => {
  const index = options.findIndex(o => o.value === props.modelValue)
  return {
    transform: `translateX(${index * 100}%)`,
  }
})
</script>

<style scoped>
.priority-selector {
  display: inline-flex;
  align-items: center;
}

.priority-selector__track {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-glass);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  border: 1px solid var(--color-glass-border);
  border-radius: 9999px;
  padding: 3px;
  gap: 0;
  box-shadow: var(--shadow-glass-inset);
  transition: border-color var(--transition-base),
              box-shadow var(--transition-base);
}

.priority-selector__track:hover {
  border-color: var(--color-glass-border-strong);
  box-shadow: var(--shadow-glass-inset),
              0 2px 12px rgba(0, 0, 0, 0.06);
}

/* Sliding indicator pill */
.priority-selector__indicator {
  position: absolute;
  top: 3px;
  left: 3px;
  width: calc(100% / 3 - 2px);
  height: calc(100% - 6px);
  border-radius: 9999px;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
              background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
  z-index: 0;
  border: 1px solid transparent;
}

.priority-selector__indicator--low {
  background: var(--color-priority-low-bg);
  border-color: var(--color-priority-low-border);
  box-shadow: 0 2px 8px rgba(45, 27, 78, 0.06),
              inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

.priority-selector__indicator--medium {
  background: var(--color-priority-medium-bg);
  border-color: var(--color-priority-medium-border);
  box-shadow: 0 2px 8px rgba(232, 160, 32, 0.12),
              inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

.priority-selector__indicator--high {
  background: var(--color-priority-high-bg);
  border-color: var(--color-danger-tint-border);
  box-shadow: 0 2px 8px rgba(224, 64, 96, 0.12),
              inset 0 1px 1px rgba(255, 255, 255, 0.3);
}

/* Options */
.priority-selector__option {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text-secondary);
  transition: color var(--transition-base),
              transform var(--transition-fast);
  user-select: none;
  -webkit-user-select: none;
  white-space: nowrap;
  line-height: 1;
}

.priority-selector__option:hover:not(.priority-selector__option--active) {
  color: var(--color-text);
}

.priority-selector__option:active {
  transform: scale(0.95);
  transition-duration: 0.1s;
}

.priority-selector__option:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
  border-radius: 9999px;
}

/* Active text colors */
.priority-selector__option--active.priority-selector__option--low {
  color: var(--color-priority-low);
  font-weight: 700;
}

.priority-selector__option--active.priority-selector__option--medium {
  color: var(--color-priority-medium);
  font-weight: 700;
}

.priority-selector__option--active.priority-selector__option--high {
  color: var(--color-priority-high);
  font-weight: 700;
}

/* Default size */
.priority-selector--default .priority-selector__option {
  padding: 0.4rem 0.875rem;
  font-size: 0.8125rem;
}

.priority-selector--default .priority-selector__track {
  min-height: 2.25rem;
}

/* Small size (for TodoItem inline) */
.priority-selector--sm .priority-selector__option {
  padding: 0.2rem 0.5rem;
  font-size: 0.675rem;
}

.priority-selector--sm .priority-selector__track {
  padding: 2px;
  min-height: 1.5rem;
}

.priority-selector--sm .priority-selector__indicator {
  top: 2px;
  left: 2px;
  width: calc(100% / 3 - 1.33px);
  height: calc(100% - 4px);
}

.priority-selector__label {
  position: relative;
  z-index: 1;
}
</style>
