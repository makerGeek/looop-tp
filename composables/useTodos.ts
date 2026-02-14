export interface Todo {
  id: string
  text: string
  completed: boolean
  createdAt: number
}

const STORAGE_KEY = 'todo-app-todos'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

function loadTodos(): Todo[] {
  if (import.meta.server) return []
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
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

  const sortedTodos = computed(() => {
    return [...todos.value].sort((a, b) => {
      // Incomplete todos first, then sort by creation date (newest first)
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1
      }
      return b.createdAt - a.createdAt
    })
  })

  const totalCount = computed(() => todos.value.length)
  const completedCount = computed(() => todos.value.filter(t => t.completed).length)
  const pendingCount = computed(() => totalCount.value - completedCount.value)

  function addTodo(text: string): void {
    const trimmed = text.trim()
    if (!trimmed) return

    const todo: Todo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      createdAt: Date.now()
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
    clearCompleted
  }
}
