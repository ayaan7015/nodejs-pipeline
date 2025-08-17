// Todo App JavaScript
class TodoApp {
    constructor() {
        this.apiBase = '/api';
        this.todos = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        
        this.initializeElements();
        this.bindEvents();
        this.loadTodos();
        this.loadStats();
    }

    // Initialize DOM elements
    initializeElements() {
        // Form elements
        this.todoForm = document.getElementById('todoForm');
        this.todoInput = document.getElementById('todoInput');
        this.prioritySelect = document.getElementById('prioritySelect');
        
        // List elements
        this.todosList = document.getElementById('todosList');
        this.emptyState = document.getElementById('emptyState');
        
        // Filter elements
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.searchInput = document.getElementById('searchInput');
        
        // Stats elements
        this.totalTodos = document.getElementById('totalTodos');
        this.completedTodos = document.getElementById('completedTodos');
        this.pendingTodos = document.getElementById('pendingTodos');
        
        // UI elements
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.toastContainer = document.getElementById('toastContainer');
        this.modal = document.getElementById('modal');
        this.modalTitle = document.getElementById('modalTitle');
        this.modalMessage = document.getElementById('modalMessage');
        this.modalClose = document.getElementById('modalClose');
        this.modalOk = document.getElementById('modalOk');
    }

    // Bind event listeners
    bindEvents() {
        // Form submission
        this.todoForm.addEventListener('submit', (e) => this.handleAddTodo(e));
        
        // Filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });
        
        // Search input
        this.searchInput.addEventListener('input', (e) => this.handleSearch(e));
        
        // Modal events
        this.modalClose.addEventListener('click', () => this.hideModal());
        this.modalOk.addEventListener('click', () => this.hideModal());
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        this.showLoading();
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('API Error:', error);
            this.showToast(`Error: ${error.message}`, 'error');
            throw error;
        } finally {
            this.hideLoading();
        }
    }

    async loadTodos() {
        try {
            this.todos = await this.apiCall('/todos');
            this.renderTodos();
            this.loadStats();
        } catch (error) {
            console.error('Failed to load todos:', error);
        }
    }

    async loadStats() {
        try {
            const stats = await this.apiCall('/stats');
            this.updateStats(stats);
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async addTodo(text, priority) {
        try {
            const newTodo = await this.apiCall('/todos', {
                method: 'POST',
                body: JSON.stringify({ text, priority })
            });
            
            this.todos.push(newTodo);
            this.renderTodos();
            this.loadStats();
            this.showToast('Todo added successfully!', 'success');
            return newTodo;
        } catch (error) {
            console.error('Failed to add todo:', error);
        }
    }

    async updateTodo(id, updates) {
        try {
            const updatedTodo = await this.apiCall(`/todos/${id}`, {
                method: 'PUT',
                body: JSON.stringify(updates)
            });
            
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodos();
                this.loadStats();
            }
            
            this.showToast('Todo updated successfully!', 'success');
            return updatedTodo;
        } catch (error) {
            console.error('Failed to update todo:', error);
        }
    }

    async deleteTodo(id) {
        try {
            await this.apiCall(`/todos/${id}`, {
                method: 'DELETE'
            });
            
            this.todos = this.todos.filter(todo => todo.id !== id);
            this.renderTodos();
            this.loadStats();
            this.showToast('Todo deleted successfully!', 'success');
        } catch (error) {
            console.error('Failed to delete todo:', error);
        }
    }

    async toggleTodo(id) {
        try {
            const updatedTodo = await this.apiCall(`/todos/toggle/${id}`, {
                method: 'PATCH'
            });
            
            const index = this.todos.findIndex(todo => todo.id === id);
            if (index !== -1) {
                this.todos[index] = updatedTodo;
                this.renderTodos();
                this.loadStats();
            }
            
            const status = updatedTodo.completed ? 'completed' : 'reopened';
            this.showToast(`Todo ${status}!`, 'success');
        } catch (error) {
            console.error('Failed to toggle todo:', error);
        }
    }

    // Event Handlers
    async handleAddTodo(e) {
        e.preventDefault();
        
        const text = this.todoInput.value.trim();
        const priority = this.prioritySelect.value;
        
        if (!text) {
            this.showToast('Please enter a todo text', 'error');
            return;
        }
        
        await this.addTodo(text, priority);
        
        // Reset form
        this.todoInput.value = '';
        this.prioritySelect.value = 'medium';
        this.todoInput.focus();
    }

    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        if (!filter) return;
        
        this.currentFilter = filter;
        
        // Update active button
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        this.renderTodos();
    }

    handleSearch(e) {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderTodos();
    }

    handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to add todo
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (document.activeElement === this.todoInput) {
                this.todoForm.dispatchEvent(new Event('submit'));
            }
        }
        
        // Escape to clear search
        if (e.key === 'Escape' && document.activeElement === this.searchInput) {
            this.searchInput.value = '';
            this.searchQuery = '';
            this.renderTodos();
        }
    }

    // Rendering Methods
    renderTodos() {
        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            this.todosList.innerHTML = '';
            this.emptyState.style.display = 'block';
            return;
        }
        
        this.emptyState.style.display = 'none';
        
        this.todosList.innerHTML = filteredTodos.map(todo => this.createTodoHTML(todo)).join('');
        
        // Add event listeners to todo items
        this.bindTodoEvents();
    }

    createTodoHTML(todo) {
        const createdDate = new Date(todo.created_at).toLocaleDateString();
        const priorityClass = `priority-${todo.priority}`;
        const completedClass = todo.completed ? 'completed' : '';
        
        return `
            <div class="todo-item ${completedClass}" data-id="${todo.id}">
                <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                     onclick="app.toggleTodo(${todo.id})">
                    <i class="fas fa-check"></i>
                </div>
                <div class="todo-content">
                    <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                    <div class="todo-meta">
                        <span class="priority-badge ${priorityClass}">
                            <i class="fas fa-flag"></i>
                            ${todo.priority}
                        </span>
                        <span class="todo-date">
                            <i class="fas fa-calendar"></i>
                            ${createdDate}
                        </span>
                    </div>
                </div>
                <div class="todo-actions">
                    <button class="action-btn edit" onclick="app.editTodo(${todo.id})" 
                            title="Edit todo">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="app.confirmDeleteTodo(${todo.id})" 
                            title="Delete todo">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    bindTodoEvents() {
        // Add smooth animations to newly added todos
        const todoItems = this.todosList.querySelectorAll('.todo-item');
        todoItems.forEach((item, index) => {
            item.style.animationDelay = `${index * 0.05}s`;
        });
    }

    getFilteredTodos() {
        let filtered = [...this.todos];
        
        // Apply status filter
        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(todo => todo.completed);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(todo => !todo.completed);
        }
        
        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(todo => 
                todo.text.toLowerCase().includes(this.searchQuery)
            );
        }
        
        // Sort by creation date (newest first)
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        return filtered;
    }

    // Todo Actions
    async editTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;
        
        const newText = prompt('Edit todo:', todo.text);
        if (newText && newText.trim() !== todo.text) {
            await this.updateTodo(id, { text: newText.trim() });
        }
    }

    confirmDeleteTodo(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;
        
        this.showModal(
            'Delete Todo',
            `Are you sure you want to delete "${todo.text}"?`,
            () => this.deleteTodo(id)
        );
    }

    // UI Helper Methods
    updateStats(stats) {
        this.totalTodos.textContent = stats.total;
        this.completedTodos.textContent = stats.completed;
        this.pendingTodos.textContent = stats.pending;
    }

    showLoading() {
        this.loadingOverlay.classList.add('show');
    }

    hideLoading() {
        this.loadingOverlay.classList.remove('show');
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 'info-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="fas fa-${icon}"></i>
            </div>
            <div class="toast-message">${message}</div>
            <button class="toast-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Show toast with animation
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    showModal(title, message, onConfirm = null) {
        this.modalTitle.textContent = title;
        this.modalMessage.textContent = message;
        
        if (onConfirm) {
            this.modalOk.onclick = () => {
                onConfirm();
                this.hideModal();
            };
        }
        
        this.modal.classList.add('show');
    }

    hideModal() {
        this.modal.classList.remove('show');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
    
    // Add some welcome logging
    console.log('🎉 Todo App initialized successfully!');
    console.log('💡 Tip: Use Ctrl/Cmd + Enter to quickly add todos');
    console.log('🔍 Use the search bar to find specific todos');
    console.log('⚡ Press Escape in search to clear filters');
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}