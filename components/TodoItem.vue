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
    </div>
    <div class="todo-actions">
      <select
        :value="todo.priority"
        class="priority-badge"
        :class="`priority-${todo.priority}`"
        title="Change priority"
        @change="handlePriorityChange"
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
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
}>()

const isEditing = ref(false)
const editText = ref('')
const editInput = ref<HTMLInputElement | null>(null)

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

function handlePriorityChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('updatePriority', props.todo.id, target.value as Priority)
}
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
  transition: all var(--transition-base);
}

.todo-item:hover {
  background: var(--color-glass-hover);
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset);
  transform: translateY(-1px);
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
  background: rgba(255, 255, 255, 0.4);
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
  box-shadow: 0 0 12px var(--color-primary-glow);
}

.todo-text {
  word-break: break-word;
  cursor: default;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.todo-edit-input {
  flex: 1;
  padding: 0.375rem 0.625rem;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  font-size: inherit;
  background: rgba(255, 255, 255, 0.6);
  color: var(--color-text);
  box-shadow: var(--shadow-glow);
  transition: all var(--transition-base);
}

.todo-edit-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.8);
}

.todo-actions {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  margin-left: 0.75rem;
  flex-shrink: 0;
}

.priority-badge {
  padding: 0.2rem 0.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  border: 1px solid;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  text-align: center;
  line-height: 1.4;
  transition: all var(--transition-fast);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.priority-badge:focus {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.priority-high {
  color: var(--color-priority-high);
  background-color: var(--color-priority-high-bg);
  border-color: rgba(224, 64, 96, 0.25);
}

.priority-medium {
  color: var(--color-priority-medium);
  background-color: var(--color-priority-medium-bg);
  border-color: rgba(232, 160, 32, 0.25);
}

.priority-low {
  color: var(--color-priority-low);
  background-color: var(--color-priority-low-bg);
  border-color: rgba(45, 27, 78, 0.1);
}

.btn-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  color: var(--color-text-secondary);
  line-height: 1;
}

.btn-action:hover {
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-text);
}

.btn-delete:hover {
  background: var(--color-danger-glass);
  color: var(--color-danger);
}

.btn-edit:hover {
  background: var(--color-primary-glow);
  color: var(--color-primary);
}
</style>
