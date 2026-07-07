import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the todo list and form', () => {
  render(<App />);
  expect(screen.getByText(/list of todos/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/todo/i)).toBeInTheDocument();
});
