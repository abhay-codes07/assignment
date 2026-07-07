import { useState } from 'react';

export default function TodoForm({ onSubmit }) {
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = description.trim();
    if (!trimmed) {
      setError('Please enter a description');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setDescription('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section>
      <h1>Create a ToDo</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="todo">ToDo</label>
          <input
            id="todo"
            type="text"
            placeholder="What needs doing?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Adding...' : 'Add ToDo!'}
        </button>
      </form>
    </section>
  );
}
