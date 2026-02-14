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
    <div class="todo-form-tags">
      <div class="tag-input-wrapper">
        <input
          v-model="tagInput"
          type="text"
          placeholder="Add tags..."
          class="tag-input"
          @keydown.enter.prevent="addTag"
          @keydown.tab.prevent="addTag"
        />
        <button
          v-if="tagInput.trim()"
          type="button"
          class="tag-add-btn"
          @click="addTag"
        >
          +
        </button>
      </div>
      <div v-if="selectedTags.length > 0" class="tag-list">
        <span
          v-for="tag in selectedTags"
          :key="tag"
          class="tag-badge"
        >
          {{ tag }}
          <button type="button" class="tag-remove-btn" @click="removeTag(tag)">×</button>
        </span>
      </div>
    </div>
    <div class="todo-form-actions">
      <select v-model="selectedPriority" class="todo-priority-select">
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>
      <input
        v-model="selectedDeadline"
        type="date"
        class="todo-deadline-input"
        :min="todayDate"
        title="Set deadline"
      />
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
  add: [text: string, priority: Priority, tags: string[], deadline: number | null]
}>()

const newTodoText = ref('')
const selectedPriority = ref<Priority>('medium')
const tagInput = ref('')
const selectedTags = ref<string[]>([])
const selectedDeadline = ref('')

const todayDate = computed(() => {
  const now = new Date()
  return now.toISOString().split('T')[0]
})

function addTag() {
  const tag = tagInput.value.trim()
  if (tag && !selectedTags.value.includes(tag)) {
    selectedTags.value.push(tag)
  }
  tagInput.value = ''
}

function removeTag(tag: string) {
  selectedTags.value = selectedTags.value.filter(t => t !== tag)
}

function handleSubmit() {
  const text = newTodoText.value.trim()
  if (!text) return
  const deadline = selectedDeadline.value
    ? new Date(selectedDeadline.value + 'T23:59:59').getTime()
    : null
  emit('add', text, selectedPriority.value, [...selectedTags.value], deadline)
  newTodoText.value = ''
  selectedPriority.value = 'medium'
  selectedTags.value = []
  tagInput.value = ''
  selectedDeadline.value = ''
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
              var(--color-highlight);
  border-color: var(--color-glass-border-strong);
  background: var(--color-glass-hover);
}

.todo-form:focus-within {
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset),
              0 0 24px var(--color-primary-tint-focus);
  border-color: var(--color-primary-tint-border);
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
  background: var(--color-input-bg);
  color: var(--color-text);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.todo-input:hover {
  border-color: var(--color-glass-border-strong);
  background: var(--color-input-bg-hover);
}

.todo-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
  background: var(--color-input-bg-focus);
}

.todo-input::placeholder {
  color: var(--color-text-secondary);
}

.todo-form-tags {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tag-input-wrapper {
  display: flex;
  gap: 0.375rem;
}

.tag-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius);
  font-size: 0.8125rem;
  background: rgba(255, 255, 255, 0.5);
  color: var(--color-text);
  transition: all var(--transition-base);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.tag-input:hover {
  border-color: var(--color-glass-border-strong);
  background: rgba(255, 255, 255, 0.6);
}

.tag-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
  background: rgba(255, 255, 255, 0.7);
}

.tag-input::placeholder {
  color: var(--color-text-secondary);
}

.tag-add-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  background: var(--color-input-bg);
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius-sm);
  color: var(--color-primary);
  font-size: 1rem;
  font-weight: 700;
  transition: all var(--transition-base);
  flex-shrink: 0;
}

.tag-add-btn:hover {
  background: var(--color-primary-glow);
  border-color: var(--color-primary);
  transform: scale(1.05);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.tag-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: var(--color-primary-glow);
  border: 1px solid var(--color-primary-tint-border);
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-primary);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  transition: all var(--transition-fast);
}

.tag-badge:hover {
  background: var(--color-primary-tint-hover);
  transform: scale(1.05);
}

.tag-remove-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.875rem;
  height: 0.875rem;
  background: none;
  border: none;
  color: var(--color-primary);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  border-radius: 50%;
  transition: all var(--transition-fast);
  cursor: pointer;
}

.tag-remove-btn:hover {
  background: var(--color-primary-tint-strong);
  color: var(--color-primary-hover);
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
  background: var(--color-input-bg);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-base);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.todo-priority-select:hover {
  border-color: var(--color-glass-border-strong);
  background: var(--color-input-bg-hover);
  transform: translateY(-1px);
}

.todo-priority-select:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: var(--shadow-glow);
}

.todo-deadline-input {
  padding: 0.625rem 0.75rem;
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius);
  font-size: 0.875rem;
  background: var(--color-input-bg);
  color: var(--color-text);
  cursor: pointer;
  transition: all var(--transition-base);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.todo-deadline-input:hover {
  border-color: var(--color-glass-border-strong);
  background: var(--color-input-bg-hover);
  transform: translateY(-1px);
}

.todo-deadline-input:focus {
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
              var(--color-highlight-inset);
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
