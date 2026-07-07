export default function TodoList({ todos, loading, error }) {
  return (
    <section>
      <h1>List of TODOs</h1>
      {loading && <p className="muted">Loading...</p>}
      {error && <p className="error">{error}</p>}
      {!loading && !error && todos.length === 0 && (
        <p className="muted">Nothing here yet. Add your first todo below.</p>
      )}
      <ul className="todo-list">
        {todos.map((todo) => (
          <li key={todo.id} className="todo">
            <span>{todo.description}</span>
            <time className="muted">{new Date(todo.created_at).toLocaleString()}</time>
          </li>
        ))}
      </ul>
    </section>
  );
}
