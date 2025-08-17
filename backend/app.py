from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import json
import os

app = Flask(__name__)
CORS(app)

# Simple file-based storage for todos
TODOS_FILE = 'todos.json'

def load_todos():
    """Load todos from JSON file"""
    if os.path.exists(TODOS_FILE):
        with open(TODOS_FILE, 'r') as f:
            return json.load(f)
    return []

def save_todos(todos):
    """Save todos to JSON file"""
    with open(TODOS_FILE, 'w') as f:
        json.dump(todos, f, indent=2)

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Get all todos"""
    todos = load_todos()
    return jsonify(todos)

@app.route('/api/todos', methods=['POST'])
def create_todo():
    """Create a new todo"""
    data = request.get_json()
    
    if not data or 'text' not in data:
        return jsonify({'error': 'Todo text is required'}), 400
    
    todos = load_todos()
    
    new_todo = {
        'id': len(todos) + 1,
        'text': data['text'],
        'completed': False,
        'created_at': datetime.now().isoformat(),
        'priority': data.get('priority', 'medium')
    }
    
    todos.append(new_todo)
    save_todos(todos)
    
    return jsonify(new_todo), 201

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """Update a todo"""
    data = request.get_json()
    todos = load_todos()
    
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if not todo:
        return jsonify({'error': 'Todo not found'}), 404
    
    todo['text'] = data.get('text', todo['text'])
    todo['completed'] = data.get('completed', todo['completed'])
    todo['priority'] = data.get('priority', todo['priority'])
    todo['updated_at'] = datetime.now().isoformat()
    
    save_todos(todos)
    return jsonify(todo)

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo"""
    todos = load_todos()
    todos = [t for t in todos if t['id'] != todo_id]
    save_todos(todos)
    return jsonify({'message': 'Todo deleted successfully'})

@app.route('/api/todos/toggle/<int:todo_id>', methods=['PATCH'])
def toggle_todo(todo_id):
    """Toggle todo completion status"""
    todos = load_todos()
    
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if not todo:
        return jsonify({'error': 'Todo not found'}), 404
    
    todo['completed'] = not todo['completed']
    todo['updated_at'] = datetime.now().isoformat()
    
    save_todos(todos)
    return jsonify(todo)

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get todo statistics"""
    todos = load_todos()
    total = len(todos)
    completed = len([t for t in todos if t['completed']])
    pending = total - completed
    
    priority_counts = {
        'high': len([t for t in todos if t.get('priority') == 'high']),
        'medium': len([t for t in todos if t.get('priority') == 'medium']),
        'low': len([t for t in todos if t.get('priority') == 'low'])
    }
    
    return jsonify({
        'total': total,
        'completed': completed,
        'pending': pending,
        'priority_counts': priority_counts
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.now().isoformat()})

if __name__ == '__main__':
    print("Starting Flask Todo API Server...")
    print("Available endpoints:")
    print("GET    /api/todos       - Get all todos")
    print("POST   /api/todos       - Create new todo")
    print("PUT    /api/todos/:id   - Update todo")
    print("DELETE /api/todos/:id   - Delete todo")
    print("PATCH  /api/todos/toggle/:id - Toggle completion")
    print("GET    /api/stats       - Get statistics")
    print("GET    /api/health      - Health check")
    app.run(debug=True, host='0.0.0.0', port=5000)