<template>
  <div class="todo-page">
    <TodoForm @add="addTodo" />
    <TodoList
      :todos="todos"
      :completed-count="completedCount"
      :pending-count="pendingCount"
      @toggle="toggleTodo"
      @remove="removeTodo"
      @edit="editTodo"
      @update-priority="updatePriority"
      @update-deadline="updateDeadline"
      @clear-completed="clearCompleted"
    />
  </div>
</template>

<script setup lang="ts">
const {
  todos,
  completedCount,
  pendingCount,
  addTodo,
  removeTodo,
  toggleTodo,
  editTodo,
  updatePriority,
  updateDeadline,
  clearCompleted
} = useTodos()
</script>

<style scoped>
.todo-page {
  padding-top: 0.25rem;
}
</style>
