<template>
  <div class="todo-list-container">
    <div v-if="todos.length > 0" class="todo-stats">
      <span class="stat">
        {{ pendingCount }} pending
      </span>
      <span class="stat-separator">·</span>
      <span class="stat">
        {{ completedCount }} completed
      </span>
      <button
        v-if="completedCount > 0"
        class="btn-clear"
        @click="$emit('clearCompleted')"
      >
        Clear completed
      </button>
    </div>

    <TransitionGroup
      v-if="todos.length > 0"
      name="list"
      tag="ul"
      class="todo-list"
    >
      <TodoItem
        v-for="todo in todos"
        :key="todo.id"
        :todo="todo"
        @toggle="$emit('toggle', $event)"
        @remove="$emit('remove', $event)"
        @edit="(id, text) => $emit('edit', id, text)"
      />
    </TransitionGroup>

    <div v-else class="todo-empty">
      <p class="empty-icon">🎉</p>
      <p class="empty-text">No todos yet. Add one above!</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Todo } from '~/composables/useTodos'

defineProps<{
  todos: Todo[]
  completedCount: number
  pendingCount: number
}>()

defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  edit: [id: string, text: string]
  clearCompleted: []
}>()
</script>

<style scoped>
.todo-stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  font-size: 0.875rem;
  color: var(--color-text-secondary);
}

.stat-separator {
  color: var(--color-border);
}

.btn-clear {
  margin-left: auto;
  padding: 0.25rem 0.75rem;
  background: none;
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  color: var(--color-text-secondary);
  font-size: 0.8rem;
  transition: all 0.2s;
}

.btn-clear:hover {
  border-color: var(--color-danger);
  color: var(--color-danger);
  background-color: #fef2f2;
}

.todo-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.todo-empty {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.75rem;
}

.empty-text {
  font-size: 1.1rem;
}

/* Transition animations */
.list-enter-active,
.list-leave-active {
  transition: all 0.3s ease;
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.list-move {
  transition: transform 0.3s ease;
}
</style>
