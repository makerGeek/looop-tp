<template>
  <li class="todo-item" :class="{ completed: todo.completed }">
    <div class="todo-content">
      <input
        type="checkbox"
        :checked="todo.completed"
        class="todo-checkbox"
        @change="$emit('toggle', todo.id)"
      />
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
      <button
        v-if="!isEditing"
        class="btn-icon btn-edit"
        title="Edit todo"
        @click="startEdit"
      >
        ✏️
      </button>
      <button
        class="btn-icon btn-delete"
        title="Delete todo"
        @click="$emit('remove', todo.id)"
      >
        🗑️
      </button>
    </div>
  </li>
</template>

<script setup lang="ts">
import type { Todo } from '~/composables/useTodos'

const props = defineProps<{
  todo: Todo
}>()

const emit = defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  edit: [id: string, text: string]
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
</script>

<style scoped>
.todo-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--color-surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-sm);
  transition: transform 0.15s, box-shadow 0.15s;
}

.todo-item:hover {
  box-shadow: var(--shadow-md);
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

.todo-checkbox {
  width: 1.25rem;
  height: 1.25rem;
  accent-color: var(--color-primary);
  cursor: pointer;
  flex-shrink: 0;
}

.todo-text {
  word-break: break-word;
  cursor: default;
}

.todo-edit-input {
  flex: 1;
  padding: 0.25rem 0.5rem;
  border: 2px solid var(--color-primary);
  border-radius: 4px;
  font-size: inherit;
}

.todo-edit-input:focus {
  outline: none;
}

.todo-actions {
  display: flex;
  gap: 0.25rem;
  margin-left: 0.5rem;
  flex-shrink: 0;
}

.btn-icon {
  background: none;
  border: none;
  padding: 0.25rem;
  font-size: 1rem;
  border-radius: 4px;
  transition: background-color 0.2s;
  line-height: 1;
}

.btn-icon:hover {
  background-color: var(--color-border);
}

.btn-delete:hover {
  background-color: #fee2e2;
}
</style>
