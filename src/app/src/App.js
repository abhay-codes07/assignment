import './App.css';
import TodoForm from './components/TodoForm';
import TodoList from './components/TodoList';
import useTodos from './hooks/useTodos';

export function App() {
  const { todos, loading, error, addTodo } = useTodos();

  return (
    <div className="App">
      <TodoList todos={todos} loading={loading} error={error} />
      <TodoForm onSubmit={addTodo} />
    </div>
  );
}

export default App;
