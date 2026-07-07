const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    throw new Error('Could not reach the API. Is the backend running?');
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error((body && body.error) || `Request failed with status ${response.status}`);
  }
  return body;
}

export function getTodos() {
  return request('/todos/');
}

export function createTodo(description) {
  return request('/todos/', {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
}
