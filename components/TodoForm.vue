<template>
  <form class="todo-form" @submit.prevent="handleSubmit">
    <input
      v-model="newTodoText"
      type="text"
      placeholder="What needs to be done?"
      class="todo-input"
      autofocus
    />
    <button type="submit" class="todo-add-btn" :disabled="!newTodoText.trim()">
      Add
    </button>
  </form>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  add: [text: string]
}>()

const newTodoText = ref('')

function handleSubmit() {
  const text = newTodoText.value.trim()
  if (!text) return
  emit('add', text)
  newTodoText.value = ''
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
