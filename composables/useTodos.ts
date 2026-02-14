export type Priority = 'low' | 'medium' | 'high'

export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
  priority: Priority
  deadline: number | null
}

const STORAGE_KEY = 'todo-app-todos'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function loadTodos(): Todo[] {
  if (import.meta.server) return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored) as Todo[]
    // Migrate older todos that lack priority or deadline fields
    return parsed.map(t => ({ ...t, priority: t.priority ?? 'medium', deadline: t.deadline ?? null }))
  } catch {
    return []
  }
}

function saveTodos(todos: Todo[]): void {
  if (import.meta.server) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

export const useTodos = () => {
  const todos = useState<Todo[]>('todos', () => [])

  // Load from localStorage on client
  if (import.meta.client && todos.value.length === 0) {
    const stored = loadTodos()
    if (stored.length > 0) {
      todos.value = stored
    }
  }

  const priorityOrder: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

  const sortedTodos = computed(() => {
    return [...todos.value].sort((a, b) => {
      // Incomplete todos first
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      // Then sort by priority (high > medium > low)
      if (a.priority !== b.priority) {
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      // Then by deadline (earliest first, no-deadline last)
      if (a.deadline !== b.deadline) {
        if (a.deadline === null) return 1
        if (b.deadline === null) return -1
        return a.deadline - b.deadline
      }
      // Then by creation date (newest first)
      return b.createdAt - a.createdAt
    })
  })

  const totalCount = computed(() => todos.value.length)
  const completedCount = computed(() => todos.value.filter(t => t.completed).length)
  const pendingCount = computed(() => totalCount.value - completedCount.value)

  function addTodo(text: string, priority: Priority = 'medium', deadline: number | null = null): void {
    const trimmed = text.trim()
    if (!trimmed) return

    const todo: Todo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      createdAt: Date.now(),
      priority,
      deadline
    }

    todos.value = [todo, ...todos.value]
    saveTodos(todos.value)
  }

  function removeTodo(id: string): void {
    todos.value = todos.value.filter(t => t.id !== id)
    saveTodos(todos.value)
  }

  function toggleTodo(id: string): void {
    todos.value = todos.value.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    )
    saveTodos(todos.value)
  }

  function editTodo(id: string, newText: string): void {
    const trimmed = newText.trim()
    if (!trimmed) return

    todos.value = todos.value.map(t =>
      t.id === id ? { ...t, text: trimmed } : t
    )
    saveTodos(todos.value)
  }

  function updatePriority(id: string, priority: Priority): void {
    todos.value = todos.value.map(t =>
      t.id === id ? { ...t, priority } : t
    )
    saveTodos(todos.value)
  }

  function updateDeadline(id: string, deadline: number | null): void {
    todos.value = todos.value.map(t =>
      t.id === id ? { ...t, deadline } : t
    )
    saveTodos(todos.value)
  }

  function clearCompleted(): void {
    todos.value = todos.value.filter(t => !t.completed)
    saveTodos(todos.value)
  }

  return {
    todos: sortedTodos,
    totalCount,
    completedCount,
    pendingCount,
    addTodo,
    removeTodo,
    toggleTodo,
    editTodo,
    updatePriority,
    updateDeadline,
    clearCompleted
  }
}
