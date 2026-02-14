<template>
  <form class="todo-form" @submit.prevent="handleSubmit">
    <input
      v-model="newTodoText"
      type="text"
      placeholder="What needs to be done?"
      class="todo-input"
      autofocus
    />
    <select v-model="selectedPriority" class="todo-priority-select">
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
    </select>
    <button type="submit" class="todo-add-btn" :disabled="!newTodoText.trim()">
      Add
    </button>
  </form>
</template>

<script setup lang="ts">
import type { Priority } from '~/composables/useTodos'

const emit = defineEmits<{
  add: [text: string, priority: Priority]
}>()

const newTodoText = ref('')
const selectedPriority = ref<Priority>('medium')

function handleSubmit() {
  const text = newTodoText.value.trim()
  if (!text) return
  emit('add', text, selectedPriority.value)
  newTodoText.value = ''
  selectedPriority.value = 'medium'
}
</script>

<style scoped>
.todo-form {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.todo-input {
  flex: 1;
  padding: 0.75rem 1rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 1rem;
  transition: border-color 0.2s;
  background: var(--color-surface);
}

.todo-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

.todo-input::placeholder {
  color: var(--color-text-secondary);
}

.todo-priority-select {
  padding: 0.75rem 0.5rem;
  border: 2px solid var(--color-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: border-color 0.2s;
}

.todo-priority-select:focus {
  outline: none;
  border-color: var(--color-primary);
}

.todo-add-btn {
  padding: 0.75rem 1.5rem;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: var(--radius);
  font-weight: 600;
  transition: background-color 0.2s;
}

.todo-add-btn:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.todo-add-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
