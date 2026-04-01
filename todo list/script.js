// Todo 应用类
class TodoApp {
    constructor() {
        // 从本地存储获取数据，如果没有则初始化为空数组
        this.todos = JSON.parse(localStorage.getItem('todos')) || [];
        this.recycleBin = JSON.parse(localStorage.getItem('recycleBin')) || [];
        // 当前筛选状态
        this.currentFilter = 'all';
        // 初始化应用
        this.init();
    }

    // 初始化应用
    init() {
        // 绑定事件
        this.bindEvents();
        // 渲染待办事项
        this.renderTodos();
        // 更新待办事项计数
        this.updateTodoCount();
    }

    // 绑定事件
    bindEvents() {
        // 添加待办事项
        document.getElementById('add-todo-btn').addEventListener('click', () => this.addTodo());
        
        // 回车键提交
        document.getElementById('todo-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addTodo();
            }
        });
        
        // 批量操作
        document.getElementById('complete-all-btn').addEventListener('click', () => this.completeAllTodos());
        document.getElementById('clear-all-btn').addEventListener('click', () => this.clearAllTodos());
        document.getElementById('clear-completed-btn').addEventListener('click', () => this.clearCompletedTodos());
        
        // 筛选功能
        document.querySelectorAll('.sidebar-item')[0].addEventListener('click', () => this.filterTodos('all'));
        document.getElementById('completed-filter').addEventListener('click', () => this.filterTodos('completed'));
        
        // 回收站
        document.getElementById('recycle-bin-btn').addEventListener('click', () => this.openRecycleModal());
        document.querySelector('.close').addEventListener('click', () => this.closeRecycleModal());
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('recycle-modal')) {
                this.closeRecycleModal();
            }
        });
        document.getElementById('empty-recycle-btn').addEventListener('click', () => this.emptyRecycleBin());
        
        // 导入功能
        document.getElementById('import-btn').addEventListener('click', () => this.importData());
        
        // 侧边栏开关
        this.sidebarOpen = true;
        document.querySelector('.sidebar-header').addEventListener('click', () => this.toggleSidebar());
    }
    
    // 切换侧边栏显示/隐藏
    toggleSidebar() {
        const sidebarHeader = document.querySelector('.sidebar-header');
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        this.sidebarOpen = !this.sidebarOpen;
        
        if (this.sidebarOpen) {
            // 显示侧边栏内容
            sidebarItems.forEach(item => {
                item.style.display = 'block';
            });
            sidebarHeader.textContent = '开 ✨';
        } else {
            // 隐藏侧边栏内容，只保留头部按钮
            sidebarItems.forEach(item => {
                item.style.display = 'none';
            });
            sidebarHeader.textContent = '关 ✨';
        }
    }

    // 筛选待办事项
    filterTodos(filter) {
        this.currentFilter = filter;
        this.renderTodos();
        
        // 更新侧边栏选中状态
        document.querySelectorAll('.sidebar-item').forEach((item, index) => {
            if (index === 0 && filter === 'all') {
                item.classList.add('active');
            } else if (index === 1 && filter === 'completed') {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    // 清除已完成的待办事项
    clearCompletedTodos() {
        if (confirm('确定要清除已完成的待办事项吗？')) {
            // 筛选出已完成的待办事项
            const completedTodos = this.todos.filter(todo => todo.completed);
            // 将已完成的待办事项移到回收站
            completedTodos.forEach(todo => {
                this.recycleBin.push(todo);
            });
            // 保留未完成的待办事项
            this.todos = this.todos.filter(todo => !todo.completed);
            // 保存数据
            this.saveTodos();
            this.saveRecycleBin();
            // 重新渲染
            this.renderTodos();
            this.updateTodoCount();
        }
    }

    // 导入数据
    importData() {
        // 创建文件输入框
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt,.json';
        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            // 读取文件
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    if (file.name.endsWith('.json')) {
                        // 解析 JSON 文件
                        const data = JSON.parse(event.target.result);
                        if (data.todos && Array.isArray(data.todos)) {
                            data.todos.forEach(todo => {
                                this.todos.unshift({
                                    id: Date.now() + Math.random(),
                                    text: todo.text,
                                    completed: todo.completed || false,
                                    createdAt: new Date().toISOString()
                                });
                            });
                        }
                    } else if (file.name.endsWith('.txt')) {
                        // 解析 TXT 文件
                        const lines = event.target.result.split('\n');
                        lines.forEach(line => {
                            const text = line.trim();
                            if (text) {
                                this.todos.unshift({
                                    id: Date.now() + Math.random(),
                                    text,
                                    completed: false,
                                    createdAt: new Date().toISOString()
                                });
                            }
                        });
                    }
                    // 保存数据
                    this.saveTodos();
                    this.renderTodos();
                    this.updateTodoCount();
                    alert('导入成功！');
                } catch (error) {
                    alert('导入失败：' + error.message);
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    // 添加待办事项
    addTodo() {
        const text = document.getElementById('todo-input').value.trim();
        if (!text) return;
        
        // 创建待办事项对象
        const todo = {
            id: Date.now(),
            text,
            completed: false,
            createdAt: new Date().toISOString()
        };
        
        // 添加到待办事项列表的开头
        this.todos.unshift(todo);
        // 保存数据
        this.saveTodos();
        // 重新渲染
        this.renderTodos();
        this.updateTodoCount();
        // 清空输入框
        document.getElementById('todo-input').value = '';
    }

    // 渲染待办事项
    renderTodos() {
        const todoList = document.getElementById('todo-list');
        
        // 根据筛选条件过滤待办事项
        let filteredTodos = this.todos;
        if (this.currentFilter === 'completed') {
            filteredTodos = this.todos.filter(todo => todo.completed);
        }
        
        // 显示空状态
        if (filteredTodos.length === 0) {
            let message = '';
            if (this.todos.length === 0) {
                message = `
                    <div style="text-align: center; color: #999; margin-top: 50px;">
                        <p>添加你的第一个待办事项！✨</p>
                        <p>食用方法：</p>
                        <p>✓ 所有提交操作支持Enter回车键提交</p>
                        <p>✓ 拖拽Todo上下移动可排序（仅支持PC）</p>
                        <p>✓ 双击上面的标语和Todo可进行编辑</p>
                        <p>✓ 右侧的小窗口是快捷操作</p>
                        <p>⚠️ 所有的Todo数据存储在浏览器本地</p>
                        <p>📤 支持下载和导入，导入追加到当前序列</p>
                    </div>
                `;
            } else if (this.currentFilter === 'completed') {
                message = `<p style="text-align: center; color: #999; margin-top: 50px;">暂无已完成的待办事项</p>`;
            }
            todoList.innerHTML = message;
            return;
        }
        
        // 渲染待办事项列表
        todoList.innerHTML = filteredTodos.map(todo => this.createTodoElement(todo)).join('');
        // 绑定待办事项事件
        this.bindTodoEvents();
    }

    // 创建待办事项元素
    createTodoElement(todo) {
        const completedClass = todo.completed ? ' completed' : '';
        
        return `
            <div class="todo-item${completedClass}" data-id="${todo.id}">
                <input type="checkbox" ${todo.completed ? 'checked' : ''}>
                <span class="todo-text">${todo.text}</span>
                <button class="delete-btn">×</button>
            </div>
        `;
    }

    // 绑定待办事项事件
    bindTodoEvents() {
        // 复选框点击
        document.querySelectorAll('.todo-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const todoId = parseInt(e.target.closest('.todo-item').dataset.id);
                this.toggleComplete(todoId);
            });
        });
        
        // 删除按钮
        document.querySelectorAll('.todo-item .delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const todoId = parseInt(e.target.closest('.todo-item').dataset.id);
                this.deleteTodo(todoId);
            });
        });
        
        // 双击编辑
        document.querySelectorAll('.todo-item .todo-text').forEach(textElement => {
            textElement.addEventListener('dblclick', (e) => {
                const todoId = parseInt(e.target.closest('.todo-item').dataset.id);
                this.editTodo(todoId, e.target);
            });
        });
    }

    // 切换待办事项完成状态
    toggleComplete(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (todo) {
            todo.completed = !todo.completed;
            this.saveTodos();
            this.renderTodos();
            this.updateTodoCount();
        }
    }

    // 删除待办事项
    deleteTodo(todoId) {
        const todoIndex = this.todos.findIndex(t => t.id === todoId);
        if (todoIndex !== -1) {
            const todo = this.todos.splice(todoIndex, 1)[0];
            this.recycleBin.push(todo);
            this.saveTodos();
            this.saveRecycleBin();
            this.renderTodos();
            this.updateTodoCount();
        }
    }

    // 编辑待办事项
    editTodo(todoId, textElement) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;
        
        const originalText = todo.text;
        // 创建输入框
        const input = document.createElement('input');
        input.type = 'text';
        input.value = originalText;
        input.className = 'edit-input';
        input.style.width = '100%';
        input.style.padding = '4px';
        input.style.border = '1px solid #ddd';
        input.style.borderRadius = '4px';
        
        // 替换文本元素为输入框
        textElement.replaceWith(input);
        input.focus();
        
        // 失去焦点时保存
        input.addEventListener('blur', () => {
            const newText = input.value.trim();
            if (newText) {
                todo.text = newText;
                this.saveTodos();
            }
            this.renderTodos();
        });
        
        // 回车键保存，ESC键取消
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const newText = input.value.trim();
                if (newText) {
                    todo.text = newText;
                    this.saveTodos();
                }
                this.renderTodos();
            } else if (e.key === 'Escape') {
                this.renderTodos();
            }
        });
    }

    // 标记所有待办事项为完成
    completeAllTodos() {
        this.todos.forEach(todo => {
            todo.completed = true;
        });
        this.saveTodos();
        this.renderTodos();
        this.updateTodoCount();
    }

    // 清空所有待办事项
    clearAllTodos() {
        if (confirm('确定要清空所有待办事项吗？')) {
            // 将所有待办事项移到回收站
            this.todos.forEach(todo => {
                this.recycleBin.push(todo);
            });
            // 清空待办事项列表
            this.todos = [];
            // 保存数据
            this.saveTodos();
            this.saveRecycleBin();
            // 重新渲染
            this.renderTodos();
            this.updateTodoCount();
        }
    }

    // 打开回收站模态框
    openRecycleModal() {
        this.renderRecycleBin();
        document.getElementById('recycle-modal').style.display = 'block';
    }

    // 关闭回收站模态框
    closeRecycleModal() {
        document.getElementById('recycle-modal').style.display = 'none';
    }

    // 渲染回收站
    renderRecycleBin() {
        const recycleList = document.getElementById('recycle-list');
        
        recycleList.innerHTML = this.recycleBin.length > 0 ? this.recycleBin.map(todo => this.createRecycleElement(todo)).join('') : 
                               '<p style="text-align: center; color: #999;">回收站为空</p>';
        
        this.bindRecycleEvents();
    }

    // 创建回收站元素
    createRecycleElement(todo) {
        return `
            <div class="recycle-item" data-id="${todo.id}">
                <span class="recycle-text">${todo.text}</span>
                <div class="recycle-actions">
                    <button class="restore-btn">恢复</button>
                    <button class="delete-btn">删除</button>
                </div>
            </div>
        `;
    }

    // 绑定回收站事件
    bindRecycleEvents() {
        // 恢复按钮
        document.querySelectorAll('.restore-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const todoId = parseInt(e.target.closest('.recycle-item').dataset.id);
                this.restoreTodo(todoId);
            });
        });
        
        // 彻底删除按钮
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const todoId = parseInt(e.target.closest('.recycle-item').dataset.id);
                this.permanentlyDeleteTodo(todoId);
            });
        });
    }

    // 恢复待办事项
    restoreTodo(todoId) {
        const todoIndex = this.recycleBin.findIndex(t => t.id === todoId);
        if (todoIndex !== -1) {
            const todo = this.recycleBin.splice(todoIndex, 1)[0];
            this.todos.unshift(todo);
            this.saveTodos();
            this.saveRecycleBin();
            this.renderRecycleBin();
            this.renderTodos();
            this.updateTodoCount();
        }
    }

    // 彻底删除待办事项
    permanentlyDeleteTodo(todoId) {
        this.recycleBin = this.recycleBin.filter(t => t.id !== todoId);
        this.saveRecycleBin();
        this.renderRecycleBin();
    }

    // 清空回收站
    emptyRecycleBin() {
        if (confirm('确定要清空回收站吗？')) {
            this.recycleBin = [];
            this.saveRecycleBin();
            this.renderRecycleBin();
        }
    }

    // 导出数据
    exportData() {
        const data = {
            todos: this.todos,
            recycleBin: this.recycleBin,
            exportDate: new Date().toISOString()
        };
        
        // 创建 Blob 对象
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        // 创建下载链接
        const a = document.createElement('a');
        a.href = url;
        a.download = `todo-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // 更新待办事项计数
    updateTodoCount() {
        const pendingCount = this.todos.filter(todo => !todo.completed).length;
        document.getElementById('todo-count').textContent = `剩余 ${pendingCount} 项未完成`;
    }

    // 保存待办事项到本地存储
    saveTodos() {
        localStorage.setItem('todos', JSON.stringify(this.todos));
    }

    // 保存回收站到本地存储
    saveRecycleBin() {
        localStorage.setItem('recycleBin', JSON.stringify(this.recycleBin));
    }
}

// 初始化应用
new TodoApp();