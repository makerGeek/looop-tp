<template>
  <li class="todo-item" :class="{ completed: todo.completed }">
    <div class="todo-content">
      <label class="todo-checkbox-wrapper">
        <input
          type="checkbox"
          :checked="todo.completed"
          class="todo-checkbox-input"
          @change="$emit('toggle', todo.id)"
        />
        <span class="todo-checkbox-custom" />
      </label>
      <div class="todo-text-group">
        <span v-if="!isEditing" class="todo-text" @dblclick="startEdit">
          {{ todo.text }}
        </span>
        <input
          v-else
          ref="editInput"
          v-model="editText"
          type="text"
          class="todo-edit-input"
          @keyup.enter="saveEdit"
          @keyup.escape="cancelEdit"
          @blur="saveEdit"
        />
        <div v-if="todo.tags.length > 0" class="todo-tags">
          <span
            v-for="tag in todo.tags"
            :key="tag"
            class="todo-tag"
          >
            {{ tag }}
            <button
              type="button"
              class="todo-tag-remove"
              title="Remove tag"
              @click="$emit('removeTag', todo.id, tag)"
            >×</button>
          </span>
        </div>
        <span
          v-if="todo.deadline && !todo.completed"
          class="todo-deadline"
          :class="deadlineClass"
          :title="deadlineFullDate"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {{ deadlineLabel }}
        </span>
        <span
          v-else-if="todo.deadline && todo.completed"
          class="todo-deadline deadline-completed"
          :title="deadlineFullDate"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {{ deadlineLabel }}
        </span>
      </div>
    </div>
    <div class="todo-actions">
      <PrioritySelector
        :model-value="todo.priority"
        size="sm"
        @update:model-value="(val: Priority) => $emit('updatePriority', todo.id, val)"
      />
      <div v-if="isAddingTag" class="inline-tag-input-wrapper">
        <input
          ref="tagInput"
          v-model="newTag"
          type="text"
          class="inline-tag-input"
          placeholder="Tag..."
          @keyup.enter="saveTag"
          @keyup.escape="cancelAddTag"
          @blur="saveTag"
        />
      </div>
      <button
        v-if="!isEditing && !isAddingTag"
        class="btn-action btn-tag"
        title="Add tag"
        @click="startAddTag"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
      </button>
      <input
        type="date"
        class="deadline-picker"
        :value="deadlineDateValue"
        title="Set deadline"
        @change="handleDeadlineChange"
      />
      <button
        v-if="!isEditing"
        class="btn-action btn-edit"
        title="Edit todo"
        @click="startEdit"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button
        class="btn-action btn-delete"
        title="Delete todo"
        @click="$emit('remove', todo.id)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { Todo, Priority } from '~/composables/useTodos'

const props = defineProps<{
  todo: Todo
}>()

const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  edit: [id: string, text: string]
  updatePriority: [id: string, priority: Priority]
  addTag: [id: string, tag: string]
  removeTag: [id: string, tag: string]
  updateDeadline: [id: string, deadline: number | null]
}>()

const isEditing = ref(false)
const editText = ref('')
const editInput = ref<HTMLInputElement | null>(null)
const isAddingTag = ref(false)
const newTag = ref('')
const tagInput = ref<HTMLInputElement | null>(null)

function startEdit() {
  isEditing.value = true
  editText.value = props.todo.text
  nextTick(() => {
    editInput.value?.focus()
  })
}

function saveEdit() {
  const trimmed = editText.value.trim()
  if (trimmed && trimmed !== props.todo.text) {
    emit('edit', props.todo.id, trimmed)
  }
  isEditing.value = false
}

function cancelEdit() {
  isEditing.value = false
}

function startAddTag() {
  isAddingTag.value = true
  newTag.value = ''
  nextTick(() => {
    tagInput.value?.focus()
  })
}

function saveTag() {
  const trimmed = newTag.value.trim()
  if (trimmed) {
    emit('addTag', props.todo.id, trimmed)
  }
  isAddingTag.value = false
  newTag.value = ''
}

function cancelAddTag() {
  isAddingTag.value = false
  newTag.value = ''
}

function handleDeadlineChange(event: Event) {
  const target = event.target as HTMLInputElement
  const deadline = target.value
    ? new Date(target.value + 'T23:59:59').getTime()
    : null
  emit('updateDeadline', props.todo.id, deadline)
}

const deadlineDateValue = computed(() => {
  if (!props.todo.deadline) return ''
  const d = new Date(props.todo.deadline)
  return d.toISOString().split('T')[0]
})

const deadlineFullDate = computed(() => {
  if (!props.todo.deadline) return ''
  return new Date(props.todo.deadline).toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
})

const deadlineLabel = computed(() => {
  if (!props.todo.deadline) return ''
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const deadlineDay = new Date(props.todo.deadline)
  const deadlineDayStart = new Date(deadlineDay.getFullYear(), deadlineDay.getMonth(), deadlineDay.getDate()).getTime()
  const diffDays = Math.round((deadlineDayStart - todayStart) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`
  if (diffDays === 0) return 'Due today'
  if (diffDays === 1) return 'Due tomorrow'
  if (diffDays <= 7) return `Due in ${diffDays}d`
  return deadlineDay.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
})

const deadlineClass = computed(() => {
  if (!props.todo.deadline) return ''
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const deadlineDay = new Date(props.todo.deadline)
  const deadlineDayStart = new Date(deadlineDay.getFullYear(), deadlineDay.getMonth(), deadlineDay.getDate()).getTime()
  const diffDays = Math.round((deadlineDayStart - todayStart) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'deadline-overdue'
  if (diffDays === 0) return 'deadline-today'
  if (diffDays <= 2) return 'deadline-soon'
  return 'deadline-normal'
})
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.875rem 1rem;
  background: var(--color-glass);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-glass), var(--shadow-glass-inset);
  transition: transform var(--transition-spring),
              box-shadow var(--transition-base),
              background var(--transition-base),
              border-color var(--transition-base),
              filter var(--transition-base);
  will-change: transform, box-shadow, filter;
}

.todo-item:hover {
  background: var(--color-glass-hover);
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset),
              var(--color-highlight);
  transform: translateY(-2px) scale(var(--glass-hover-scale));
  border-color: var(--color-glass-border-strong);
  filter: brightness(var(--glass-hover-brightness));
}

.todo-item:active {
  transform: translateY(0) scale(var(--glass-active-scale));
  box-shadow: var(--shadow-glass), var(--shadow-glass-inset);
  transition-duration: 0.1s;
}

.todo-item.completed {
  opacity: 0.7;
}

.todo-item.completed .todo-text {
  text-decoration: line-through;
  color: var(--color-text-secondary);
}

.todo-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

/* Custom checkbox */
.todo-checkbox-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: pointer;
}

.todo-checkbox-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}

.todo-checkbox-custom {
  width: 1.375rem;
  height: 1.375rem;
  border-radius: 50%;
  border: 2px solid var(--color-glass-border-strong);
  background: var(--color-surface-btn);
  transition: all var(--transition-base);
  position: relative;
}

.todo-checkbox-input:checked + .todo-checkbox-custom {
  background: linear-gradient(135deg, var(--color-primary), #9775d4);
  border-color: transparent;
  box-shadow: 0 2px 8px var(--color-primary-glow);
}

.todo-checkbox-input:checked + .todo-checkbox-custom::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -55%) rotate(45deg);
  width: 5px;
  height: 9px;
  border: solid white;
  border-width: 0 2px 2px 0;
}

.todo-checkbox-wrapper:hover .todo-checkbox-custom {
  border-color: var(--color-primary);
  box-shadow: 0 0 16px var(--color-primary-glow);
  transform: scale(1.15);
}

.todo-checkbox-wrapper:active .todo-checkbox-custom {
  transform: scale(0.9);
  transition-duration: 0.1s;
}

.todo-text-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.todo-text {
  word-break: break-word;
  cursor: default;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.todo-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.todo-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.1rem 0.4rem;
  background: var(--color-primary-glow);
  border: 1px solid var(--color-primary-tint-border);
  border-radius: 9999px;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--color-primary);
  transition: all var(--transition-fast);
}

.todo-tag:hover {
  background: var(--color-primary-tint-hover);
  transform: scale(1.05);
}

.todo-tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.75rem;
  height: 0.75rem;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.todo-tag-remove:hover {
  background: var(--color-primary-tint-strong);
  color: var(--color-primary-hover);
}

.todo-deadline {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  font-weight: 500;
  line-height: 1;
  padding: 0.15rem 0.4rem;
  border-radius: 9999px;
  width: fit-content;
  transition: all var(--transition-fast);
}

.deadline-normal {
  color: var(--color-text-secondary);
  background: var(--color-surface-muted);
}

.deadline-soon {
  color: var(--color-priority-medium);
  background: var(--color-priority-medium-bg);
}

.deadline-today {
  color: var(--color-priority-high);
  background: var(--color-priority-high-bg);
  font-weight: 600;
}

.deadline-overdue {
  color: var(--color-danger);
  background: var(--color-danger-glass);
  font-weight: 700;
}

.deadline-completed {
  color: var(--color-text-secondary);
  background: var(--color-surface-muted-subtle);
  text-decoration: line-through;
  opacity: 0.6;
}

.todo-edit-input {
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: inherit;
  background: var(--color-input-bg-hover);
  color: var(--color-text);
  box-shadow: var(--shadow-glow);
  transition: all var(--transition-base);
}

.todo-edit-input:focus {
  outline: none;
  background: var(--color-input-bg-focus);
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.75rem;
  flex-shrink: 0;
}

.deadline-picker {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-sm);
  background: var(--color-glass);
  cursor: pointer;
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  font-size: 0;
  appearance: none;
  -webkit-appearance: none;
}

.deadline-picker:hover {
  border-color: var(--color-glass-border-strong);
  background: var(--color-surface-btn-hover);
  transform: scale(1.1);
}

.deadline-picker:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.deadline-picker::-webkit-calendar-picker-indicator {
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity var(--transition-fast);
}

.deadline-picker:hover::-webkit-calendar-picker-indicator {
  opacity: 0.8;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast),
              transform var(--transition-spring);
  color: var(--color-text-secondary);
  line-height: 1;
}

.btn-action:hover {
  background: var(--color-surface-btn-hover);
  color: var(--color-text);
  transform: scale(1.15);
}

.btn-action:active {
  transform: scale(0.9);
  transition-duration: 0.1s;
}

.btn-delete:hover {
  background: var(--color-danger-glass);
  color: var(--color-danger);
  box-shadow: 0 0 12px var(--color-danger-tint-glow);
}

.btn-tag:hover {
  background: var(--color-primary-glow);
  color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-primary-glow);
}

.inline-tag-input-wrapper {
  display: flex;
}

.inline-tag-input {
  width: 5rem;
  padding: 0.2rem 0.5rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  background: var(--color-input-bg-hover);
  color: var(--color-text);
  box-shadow: var(--shadow-glow);
  transition: all var(--transition-base);
}

.inline-tag-input:focus {
  outline: none;
  background: var(--color-input-bg-focus);
}

.btn-edit:hover {
  background: var(--color-primary-glow);
  color: var(--color-primary);
  box-shadow: 0 0 12px var(--color-primary-glow);
}
</style>
