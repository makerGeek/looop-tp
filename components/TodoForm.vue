<template>
  <form class="todo-form" @submit.prevent="handleSubmit">
    <div class="todo-form-row">
      <input
        v-model="newTodoText"
        type="text"
        placeholder="What needs to be done?"
        class="todo-input"
        autofocus
      />
    </div>
    <div class="todo-form-actions">
      <select v-model="selectedPriority" class="todo-priority-select">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <button type="submit" class="todo-add-btn" :disabled="!newTodoText.trim()">
        <span class="btn-icon">+</span>
        Add Task
      </button>
    </div>
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
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  padding: 1.25rem;
  background: var(--color-glass);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-glass), var(--shadow-glass-inset);
  transition: box-shadow var(--transition-base),
              border-color var(--transition-base),
              background var(--transition-base);
}

.todo-form:hover {
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset),
              0 0 0 1px rgba(255, 255, 255, 0.2);
  border-color: var(--color-glass-border-strong);
  background: var(--color-glass-hover);
}

.todo-form:focus-within {
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset),
              0 0 24px rgba(124, 92, 191, 0.1);
  border-color: rgba(124, 92, 191, 0.2);
}

.todo-form-row {
  display: flex;
}

.todo-input {
  flex: 1;
  padding: 0.875rem 1.125rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius);
  font-size: 1rem;
  transition: all var(--transition-base);
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-text);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.todo-input:hover {
  border-color: var(--color-glass-border-strong);
  background: rgba(255, 255, 255, 0.6);
}

.todo-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
  background: rgba(255, 255, 255, 0.7);
}

.todo-input::placeholder {
  color: var(--color-text-secondary);
}

.todo-form-actions {
  display: flex;
  gap: 0.5rem;
}

.todo-priority-select {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-base);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.todo-priority-select:hover {
  border-color: var(--color-glass-border-strong);
  background: rgba(255, 255, 255, 0.6);
  transform: translateY(-1px);
}

.todo-priority-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.todo-add-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 1.5rem;
  background: linear-gradient(135deg, var(--color-primary), #9775d4);
  color: var(--color-text-on-primary);
  border: none;
  border-radius: var(--radius);
  font-weight: 600;
  font-size: 0.9375rem;
  transition: transform var(--transition-spring),
              box-shadow var(--transition-base),
              background var(--transition-base),
              filter var(--transition-base);
  box-shadow: 0 2px 12px var(--color-primary-glow);
  letter-spacing: 0.01em;
}

.todo-add-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, var(--color-primary-hover), #8a68c8);
  box-shadow: 0 6px 24px var(--color-primary-glow),
              0 0 0 1px rgba(255, 255, 255, 0.2) inset;
  transform: translateY(-2px) scale(1.02);
  filter: brightness(1.08);
}

.todo-add-btn:active:not(:disabled) {
  transform: translateY(0) scale(0.97);
  box-shadow: 0 2px 8px var(--color-primary-glow);
  filter: brightness(0.95);
  transition-duration: 0.1s;
}

.todo-add-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
}

.btn-icon {
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 1;
}
</style>
