<template>
  <div class="todo-list-container">
    <div v-if="todos.length > 0" class="todo-stats">
      <div class="todo-stats-info">
        <span class="stat">
          <span class="stat-value">{{ pendingCount }}</span> pending
        </span>
        <span class="stat-dot" />
        <span class="stat">
          <span class="stat-value">{{ completedCount }}</span> completed
        </span>
      </div>
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
        @update-priority="(id, priority) => $emit('updatePriority', id, priority)"
        @update-deadline="(id, deadline) => $emit('updateDeadline', id, deadline)"
      />
    </TransitionGroup>

    <div v-else class="todo-empty">
      <div class="empty-glass-orb">
        <span class="empty-icon">✦</span>
      </div>
      <p class="empty-title">All clear!</p>
      <p class="empty-text">Add your first task above to get started.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Todo, Priority } from '~/composables/useTodos'

defineProps<{
  todos: Todo[]
  completedCount: number
  pendingCount: number
}>()

defineEmits<{
  toggle: [id: string]
  remove: [id: string]
  edit: [id: string, text: string]
  updatePriority: [id: string, priority: Priority]
  updateDeadline: [id: string, deadline: number | null]
  clearCompleted: []
}>()
</script>

<style scoped>
.todo-stats {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  background: var(--color-glass);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
  border: 1px solid var(--color-glass-border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-glass), var(--shadow-glass-inset);
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  transition: box-shadow var(--transition-base),
              background var(--transition-base),
              border-color var(--transition-base);
}

.todo-stats:hover {
  background: var(--color-glass-hover);
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset);
  border-color: var(--color-glass-border-strong);
}

.todo-stats-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.stat {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stat-value {
  font-weight: 700;
  color: var(--color-text);
}

.stat-dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-text-secondary);
  opacity: 0.5;
}

.btn-clear {
  padding: 0.375rem 0.875rem;
  background: rgba(255, 255, 255, 0.4);
  border: 1px solid var(--color-glass-border);
  border-radius: 9999px;
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  font-weight: 500;
  transition: all var(--transition-base),
              transform var(--transition-spring);
  backdrop-filter: blur(var(--blur-sm));
  -webkit-backdrop-filter: blur(var(--blur-sm));
}

.btn-clear:hover {
  border-color: rgba(224, 64, 96, 0.3);
  color: var(--color-danger);
  background: var(--color-danger-glass);
  transform: translateY(-1px) scale(1.03);
  box-shadow: 0 4px 12px rgba(224, 64, 96, 0.12);
}

.btn-clear:active {
  transform: translateY(0) scale(0.97);
  transition-duration: 0.1s;
}

.todo-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Empty state */
.todo-empty {
  text-align: center;
  padding: 3.5rem 1.5rem;
  color: var(--color-text-secondary);
}

.empty-glass-orb {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4rem;
  height: 4rem;
  border-radius: 50%;
  background: var(--color-glass);
  backdrop-filter: blur(var(--blur-md));
  -webkit-backdrop-filter: blur(var(--blur-md));
  border: 1px solid var(--color-glass-border);
  box-shadow: var(--shadow-glass), var(--shadow-glass-inset);
  margin-bottom: 1rem;
  animation: orb-float 3s ease-in-out infinite, glass-breathe 4s ease-in-out infinite;
  transition: transform var(--transition-spring),
              box-shadow var(--transition-base);
}

.empty-glass-orb:hover {
  transform: scale(1.1);
  box-shadow: var(--shadow-glass-hover), var(--shadow-glass-inset),
              0 0 20px var(--color-primary-glow);
  animation-play-state: paused;
}

.empty-icon {
  font-size: 1.5rem;
  background: linear-gradient(135deg, var(--color-primary), #a78bfa);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.empty-text {
  font-size: 0.9375rem;
}

/* Transition animations */
.list-enter-active {
  transition: all var(--transition-slow);
}

.list-leave-active {
  transition: all var(--transition-base);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(-12px) scale(0.97);
  filter: blur(4px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(24px) scale(0.97);
  filter: blur(4px);
}

.list-move {
  transition: transform var(--transition-slow);
}
</style>
