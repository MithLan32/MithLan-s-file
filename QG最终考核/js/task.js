// 任务管理模块
class Task {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.useMock = false; // 使用真实API
        this.tasks = [];
        this.recycledTasks = []; // 回收站
        this.taskTimers = new Map();
        this.activeTaskId = null;
        this.taskStartTime = null;
    }
    
    /**
     * 设置模拟数据
     */
    setupMockData() {
        // 模拟任务数据
        this.tasks = [
            {
                _id: 1,
                projectId: 1,
                title: '完成用户认证功能',
                description: '实现登录、注册和权限控制',
                status: 'todo',
                priority: 'high',
                assignee: 'admin',
                dueDate: '2026-04-10',
                tag: '功能开发',
                branch: 'main',
                progress: 0,
                createdAt: '2026-04-01',
                timeSpent: 0 // 记录工作时间（秒）
            },
            {
                _id: 2,
                projectId: 1,
                title: '开发项目管理页面',
                description: '实现项目的创建、编辑和删除',
                status: 'in_progress',
                priority: 'medium',
                assignee: 'user1',
                dueDate: '2026-04-15',
                tag: '功能开发',
                branch: 'feature-auth',
                progress: 50,
                createdAt: '2026-04-02',
                timeSpent: 7200
            },
            {
                _id: 3,
                projectId: 1,
                title: '测试任务看板',
                description: '测试任务拖拽和状态更新',
                status: 'done',
                priority: 'low',
                assignee: 'user2',
                dueDate: '2026-04-05',
                tag: '测试',
                branch: 'main',
                progress: 100,
                createdAt: '2026-04-03',
                timeSpent: 3600
            },
            {
                _id: 4,
                projectId: 2,
                title: '设计移动应用界面',
                description: '设计移动应用的UI界面',
                status: 'todo',
                priority: 'medium',
                assignee: 'user1',
                dueDate: '2026-04-20',
                tag: '设计',
                branch: 'main',
                progress: 0,
                createdAt: '2026-04-04',
                timeSpent: 0
            }
        ];
        
        // 初始化时间追踪
        this.taskTimers = new Map(); // 存储每个任务的工作计时器
        this.activeTaskId = null; // 当前正在追踪的任务ID
        this.taskStartTime = null; // 当前追踪开始时间
    }
    
    startTimeTracking(taskId) {
        if (this.taskTimers.has(taskId)) {
            console.log('该任务已经在追踪中');
            return;
        }
        
        this.activeTaskId = taskId;
        this.taskStartTime = Date.now();
        
        // 使用requestAnimationFrame进行平滑的时间更新
        const updateTime = () => {
            if (this.activeTaskId !== taskId) return;
            
            const elapsedSeconds = Math.floor((Date.now() - this.taskStartTime) / 1000);
            const task = this.tasks.find(t => t._id === taskId);
            if (task) {
                task.timeSpent = (task.timeSpent || 0) + elapsedSeconds;
                this.updateTaskTimeDisplay(taskId);
            }
            
            this.taskTimers.set(taskId, requestAnimationFrame(updateTime));
        };
        
        this.taskTimers.set(taskId, requestAnimationFrame(updateTime));
        console.log(`开始追踪任务 #${taskId}`);
    }
    
    stopTimeTracking(taskId) {
        if (!this.taskTimers.has(taskId)) {
            console.log('该任务没有在追踪');
            return;
        }
        
        // 取消动画帧
        const timerId = this.taskTimers.get(taskId);
        cancelAnimationFrame(timerId);
        this.taskTimers.delete(taskId);
        
        // 累计时间
        if (this.activeTaskId === taskId && this.taskStartTime) {
            const elapsedSeconds = Math.floor((Date.now() - this.taskStartTime) / 1000);
            const task = this.tasks.find(t => t._id === taskId);
            if (task) {
                task.timeSpent = (task.timeSpent || 0) + elapsedSeconds;
            }
            this.activeTaskId = null;
            this.taskStartTime = null;
        }
        
        console.log(`停止追踪任务 #${taskId}`);
    }
    
    updateTaskTimeDisplay(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;
        
        const timeDisplay = document.querySelector(`[data-task-id="${taskId}"] .task-time`);
        if (timeDisplay) {
            timeDisplay.textContent = this.formatTime(task.timeSpent || 0);
        }
    }
    
    formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else if (minutes > 0) {
            return `${minutes}分钟${secs}秒`;
        } else {
            return `${secs}秒`;
        }
    }
    
    getTimeStats() {
        // 使用reduce进行时间统计
        return this.tasks.reduce((acc, task) => {
            const time = task.timeSpent || 0;
            acc.total += time;
            acc.byStatus[task.status] = (acc.byStatus[task.status] || 0) + time;
            acc.byAssignee[task.assignee] = (acc.byAssignee[task.assignee] || 0) + time;
            return acc;
        }, { total: 0, byStatus: {}, byAssignee: {} });
    }
    
    // 动态优先级调整 - 根据截止日期自动计算
    calculateDynamicPriority(task) {
        if (!task.dueDate) return task.priority;
        
        const now = new Date();
        const dueDate = new Date(task.dueDate);
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        // 如果已过期，最高优先级
        if (daysUntilDue < 0) {
            return 'high';
        }
        
        // 如果3天内到期，提升优先级
        if (daysUntilDue <= 3 && task.priority !== 'high') {
            return 'high';
        }
        
        // 如果7天内到期，设置为中优先级
        if (daysUntilDue <= 7 && task.priority === 'low') {
            return 'medium';
        }
        
        return task.priority;
    }
    
    // 使用requestAnimationFrame更新任务卡片的警戒色
    updateTaskCardUrgency(taskId) {
        requestAnimationFrame(() => {
            const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
            if (!taskCard) return;
            
            const task = this.tasks.find(t => t._id === taskId);
            if (!task) return;
            
            const dynamicPriority = this.calculateDynamicPriority(task);
            
            // 移除旧的警戒色
            taskCard.classList.remove('urgency-high', 'urgency-medium', 'urgency-low');
            
            // 根据动态优先级添加警戒色
            if (dynamicPriority === 'high') {
                taskCard.classList.add('urgency-high');
                taskCard.style.borderLeftColor = '#dc3545';
                taskCard.style.boxShadow = '0 0 10px rgba(220, 53, 69, 0.3)';
            } else if (dynamicPriority === 'medium') {
                taskCard.classList.add('urgency-medium');
                taskCard.style.borderLeftColor = '#ffc107';
                taskCard.style.boxShadow = '0 0 10px rgba(255, 193, 7, 0.3)';
            } else {
                taskCard.classList.remove('urgency-low');
                taskCard.style.borderLeftColor = '';
                taskCard.style.boxShadow = '';
            }
        });
    }
    
    // 启动所有任务卡片的警戒色更新
    startUrgencyUpdates() {
        const updateAll = () => {
            this.tasks.forEach(task => {
                if (task.status !== 'done') {
                    this.updateTaskCardUrgency(task._id);
                }
            });
            
            // 使用setTimeout替代setInterval，确保动画帧正确
            setTimeout(updateAll, 60000); // 每分钟更新一次
        };
        
        updateAll();
    }
    
    async loadTasks(projectId) {
        if (this.useMock) {
            // 使用模拟数据，根据projectId过滤
            if (this.tasks.length === 0) {
                this.setupMockData(); // 仅在任务列表为空时初始化模拟数据
            }
            // 过滤出当前项目的任务
            const filteredTasks = this.tasks.filter(task => task.projectId === projectId);
            return filteredTasks;
        } else {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/tasks`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error('加载任务失败');
                }
                this.tasks = await response.json();
                return this.tasks;
            } catch (error) {
                this.tasks = [];
                console.error('加载任务失败:', error);
                return [];
            }
        }
    }
    
    async renderTasks(projectId) {
        // 显示骨架屏
        this.showSkeletonLoading();
        
        const tasks = await this.loadTasks(projectId);
        
        const content = document.getElementById('content');
        
        // 清空content内容，避免重复渲染
        content.innerHTML = '';
        
        // 创建DocumentFragment减少DOM操作
        const fragment = document.createDocumentFragment();
        
        const taskManagement = document.createElement('div');
        taskManagement.className = 'task-management';
        
        // 获取项目列表
        const projects = window.app.project ? window.app.project.projects : [];
        
        // 生成项目选择下拉菜单
        let projectSelectHtml = '';
        if (projects.length > 0) {
            projectSelectHtml = `
                <div class="form-group" style="margin-bottom: 15px;">
                    <label>选择项目:</label>
                    <select id="project-select">
                        ${projects.map(project => `
                            <option value="${project._id}" ${project._id === projectId ? 'selected' : ''}>
                                ${project.name}
                            </option>
                        `).join('')}
                    </select>
                </div>
            `;
        }
        
        // 生成标签筛选选项
        const allTags = [...new Set(tasks.map(t => t.tag).filter(Boolean))];
        
        taskManagement.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>任务管理</h2>
                ${projectSelectHtml}
                <button id="create-task-btn" class="primary-btn" style="margin-top: 10px;">创建任务</button>
            </div>
            
            <!-- 时间追踪统计 -->
            <div class="time-stats" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <h4 style="margin-bottom: 10px;">时间统计</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 15px; align-items: center;">
                    <div style="flex: 1; min-width: 150px;">
                        <span style="font-size: 12px; color: #666;">总工作时间:</span>
                        <span id="total-time" style="font-size: 16px; font-weight: 600; color: #333;">0小时</span>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <span style="font-size: 12px; color: #666;">进行中:</span>
                        <span id="time-in-progress" style="font-size: 16px; font-weight: 600; color: #2196F3;">0小时</span>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <span style="font-size: 12px; color: #666;">已完成:</span>
                        <span id="time-done" style="font-size: 16px; font-weight: 600; color: #4CAF50;">0小时</span>
                    </div>
                    <div style="flex: 1; min-width: 150px;">
                        <span style="font-size: 12px; color: #666;">待办:</span>
                        <span id="time-todo" style="font-size: 16px; font-weight: 600; color: #FF9800;">0小时</span>
                    </div>
                </div>
            </div>
            
            <!-- 多维标签筛选 -->
            <div class="task-filters" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                <h4 style="margin-bottom: 10px;">任务筛选</h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center;">
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 12px;">标签:</label>
                        <select id="filter-tag" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd; min-width: 100px;">
                            <option value="">全部</option>
                            ${allTags.map(tag => `<option value="${tag}">${tag}</option>`).join('')}
                        </select>
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 12px;">优先级:</label>
                        <select id="filter-priority" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd; min-width: 80px;">
                            <option value="">全部</option>
                            <option value="high">高</option>
                            <option value="medium">中</option>
                            <option value="low">低</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 12px;">状态:</label>
                        <select id="filter-status" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd; min-width: 80px;">
                            <option value="">全部</option>
                            <option value="todo">待办</option>
                            <option value="in_progress">进行中</option>
                            <option value="done">已完成</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: 5px; align-items: center;">
                        <label style="font-size: 12px;">负责人:</label>
                        <select id="filter-assignee" style="padding: 5px; border-radius: 4px; border: 1px solid #ddd; min-width: 100px;">
                            <option value="">全部</option>
                            ${[...new Set(tasks.map(t => t.assignee).filter(Boolean))].map(a => `<option value="${a}">${a}</option>`).join('')}
                        </select>
                    </div>
                    <button id="clear-filters-btn" class="secondary-btn" style="padding: 5px 10px; font-size: 12px;">清除筛选</button>
                </div>
            </div>
            
            <div class="task-board">
                <div class="task-column" id="todo-column">
                    <h3>待办 <span class="task-count" id="todo-count">(0)</span></h3>
                    <div id="todo-tasks"></div>
                </div>
                <div class="task-column" id="in-progress-column">
                    <h3>进行中 <span class="task-count" id="in-progress-count">(0)</span></h3>
                    <div id="in-progress-tasks"></div>
                </div>
                <div class="task-column" id="done-column">
                    <h3>已完成 <span class="task-count" id="done-count">(0)</span></h3>
                    <div id="done-tasks"></div>
                </div>
                <div class="task-column" id="recycled-column">
                    <h3>回收站 <span class="task-count" id="recycled-count">(0)</span></h3>
                    <div id="recycled-tasks"></div>
                </div>
            </div>
        `;
        
        fragment.appendChild(taskManagement);
        content.appendChild(fragment);
        
        // 存储原始任务数据用于筛选
        this.originalTasks = [...tasks];
        this.recycledOriginalTasks = [...this.recycledTasks.filter(task => task.projectId === projectId)];
        
        // 应用筛选并渲染
        this.applyFiltersAndRender();
        
        // 添加筛选事件
        this.setupFilterEvents();
        
        // 添加创建任务事件
        document.getElementById('create-task-btn').addEventListener('click', () => this.showCreateTaskForm());
        
        // 添加项目选择事件
        const projectSelect = document.getElementById('project-select');
        if (projectSelect) {
            projectSelect.addEventListener('change', (e) => {
                const selectedProjectId = parseInt(e.target.value);
                const selectedProject = projects.find(p => p._id === selectedProjectId);
                if (selectedProject) {
                    window.app.setCurrentProject(selectedProject);
                    this.renderTasks(selectedProjectId);
                }
            });
        }
        
        // 初始化拖拽功能
        this.initDragAndDrop();
        
        // 更新时间统计显示
        this.updateTimeStatsDisplay();
        
        // 启动动态优先级警戒色更新
        this.startUrgencyUpdates();
    }
    
    updateTimeStatsDisplay() {
        const stats = this.getTimeStats();
        
        const totalEl = document.getElementById('total-time');
        const inProgressEl = document.getElementById('time-in-progress');
        const doneEl = document.getElementById('time-done');
        const todoEl = document.getElementById('time-todo');
        
        if (totalEl) totalEl.textContent = `${Math.floor(stats.total / 3600)}小时${Math.floor((stats.total % 3600) / 60)}分钟`;
        if (inProgressEl) inProgressEl.textContent = `${Math.floor((stats.byStatus['in_progress'] || 0) / 3600)}小时${Math.floor(((stats.byStatus['in_progress'] || 0) % 3600) / 60)}分钟`;
        if (doneEl) doneEl.textContent = `${Math.floor((stats.byStatus['done'] || 0) / 3600)}小时${Math.floor(((stats.byStatus['done'] || 0) % 3600) / 60)}分钟`;
        if (todoEl) todoEl.textContent = `${Math.floor((stats.byStatus['todo'] || 0) / 3600)}小时${Math.floor(((stats.byStatus['todo'] || 0) % 3600) / 60)}分钟`;
    }
    
    showSkeletonLoading() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="skeleton-container">
                <div class="skeleton-header">
                    <div class="skeleton skeleton-title" style="width: 200px; height: 32px;"></div>
                </div>
                <div class="skeleton-card">
                    <div class="skeleton skeleton-title"></div>
                    <div class="skeleton skeleton-text" style="width: 80%;"></div>
                    <div class="skeleton skeleton-text" style="width: 60%;"></div>
                    <div class="skeleton skeleton-button" style="margin-top: 15px;"></div>
                </div>
                <div class="task-board" style="margin-top: 20px;">
                    <div class="task-column">
                        <div class="skeleton skeleton-title" style="margin-bottom: 20px;"></div>
                        ${Array(3).fill().map(() => `
                            <div class="skeleton-card">
                                <div class="skeleton skeleton-title"></div>
                                <div class="skeleton skeleton-text" style="width: 70%;"></div>
                                <div class="skeleton skeleton-line" style="width: 50%;"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="task-column">
                        <div class="skeleton skeleton-title" style="margin-bottom: 20px;"></div>
                        ${Array(2).fill().map(() => `
                            <div class="skeleton-card">
                                <div class="skeleton skeleton-title"></div>
                                <div class="skeleton skeleton-text" style="width: 70%;"></div>
                                <div class="skeleton skeleton-line" style="width: 50%;"></div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="task-column">
                        <div class="skeleton skeleton-title" style="margin-bottom: 20px;"></div>
                        ${Array(1).fill().map(() => `
                            <div class="skeleton-card">
                                <div class="skeleton skeleton-title"></div>
                                <div class="skeleton skeleton-text" style="width: 70%;"></div>
                                <div class="skeleton skeleton-line" style="width: 50%;"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
    }
    
    setupFilterEvents() {
        const filterTag = document.getElementById('filter-tag');
        const filterPriority = document.getElementById('filter-priority');
        const filterStatus = document.getElementById('filter-status');
        const filterAssignee = document.getElementById('filter-assignee');
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        
        const applyFilters = () => this.applyFiltersAndRender();
        
        if (filterTag) filterTag.addEventListener('change', applyFilters);
        if (filterPriority) filterPriority.addEventListener('change', applyFilters);
        if (filterStatus) filterStatus.addEventListener('change', applyFilters);
        if (filterAssignee) filterAssignee.addEventListener('change', applyFilters);
        
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => {
                if (filterTag) filterTag.value = '';
                if (filterPriority) filterPriority.value = '';
                if (filterStatus) filterStatus.value = '';
                if (filterAssignee) filterAssignee.value = '';
                applyFilters();
            });
        }
    }
    
    applyFiltersAndRender() {
        const filterTag = document.getElementById('filter-tag')?.value || '';
        const filterPriority = document.getElementById('filter-priority')?.value || '';
        const filterStatus = document.getElementById('filter-status')?.value || '';
        const filterAssignee = document.getElementById('filter-assignee')?.value || '';
        
        // 使用filter和reduce进行多维筛选
        const filteredTasks = this.originalTasks.filter(task => {
            const matchTag = !filterTag || task.tag === filterTag;
            const matchPriority = !filterPriority || task.priority === filterPriority;
            const matchStatus = !filterStatus || task.status === filterStatus;
            const matchAssignee = !filterAssignee || task.assignee === filterAssignee;
            return matchTag && matchPriority && matchStatus && matchAssignee;
        });
        
        const filteredRecycledTasks = this.recycledOriginalTasks.filter(task => {
            const matchTag = !filterTag || task.tag === filterTag;
            const matchPriority = !filterPriority || task.priority === filterPriority;
            const matchAssignee = !filterAssignee || task.assignee === filterAssignee;
            return matchTag && matchPriority && matchAssignee;
        });
        
        // 使用reduce统计各状态任务数量
        const taskCounts = filteredTasks.reduce((acc, task) => {
            if (task.status === 'todo') acc.todo++;
            else if (task.status === 'in_progress') acc.inProgress++;
            else if (task.status === 'done') acc.done++;
            return acc;
        }, { todo: 0, inProgress: 0, done: 0 });
        
        // 更新计数
        const todoCountEl = document.getElementById('todo-count');
        const inProgressCountEl = document.getElementById('in-progress-count');
        const doneCountEl = document.getElementById('done-count');
        const recycledCountEl = document.getElementById('recycled-count');
        
        if (todoCountEl) todoCountEl.textContent = `(${taskCounts.todo})`;
        if (inProgressCountEl) inProgressCountEl.textContent = `(${taskCounts.inProgress})`;
        if (doneCountEl) doneCountEl.textContent = `(${taskCounts.done})`;
        if (recycledCountEl) recycledCountEl.textContent = `(${filteredRecycledTasks.length})`;
        
        // 使用DocumentFragment优化渲染性能
        this.renderTaskCardsToContainer('todo-tasks', filteredTasks.filter(task => task.status === 'todo'));
        this.renderTaskCardsToContainer('in-progress-tasks', filteredTasks.filter(task => task.status === 'in_progress'));
        this.renderTaskCardsToContainer('done-tasks', filteredTasks.filter(task => task.status === 'done'));
        this.renderRecycledTasksToContainer('recycled-tasks', filteredRecycledTasks);
    }
    
    renderTaskCardsToContainer(containerId, tasks) {
        const container = document.getElementById(containerId);
        const fragment = document.createDocumentFragment();
        
        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = `task-card task-status-${task.status}`;
            taskCard.draggable = true;
            taskCard.dataset.taskId = task._id;
            taskCard.innerHTML = `
                <h4>${task.title}</h4>
                <p>${task.description}</p>
                <div class="task-meta">
                    <span>标签: ${task.tag || '无'}</span>
                    <span>优先级: ${this.getPriorityLabel(task.priority)}</span>
                </div>
                <div class="task-meta">
                    <span>负责人: ${task.assignee}</span>
                    <span>分支: ${task.branch || 'main'}</span>
                </div>
                <div class="task-progress">
                    <label>进度:</label>
                    <div class="progress-bar" style="width: 100%; background-color: #e0e0e0; border-radius: 4px; height: 8px; margin: 5px 0;">
                        <div class="progress-fill" style="width: ${task.progress || 0}%; background-color: #4CAF50; height: 100%; border-radius: 4px; transition: width 0.3s ease;"></div>
                    </div>
                    <div style="display: flex; align-items: center; margin-top: 5px;">
                        <input type="range" class="progress-slider" min="0" max="100" value="${task.progress || 0}" data-task-id="${task._id}" style="flex: 1; margin-right: 10px;">
                        <span class="progress-value">${task.progress || 0}%</span>
                    </div>
                </div>
                <div class="task-meta">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span>截止日期: ${task.dueDate}</span>
                        <input type="checkbox" class="task-checkbox" data-task-id="${task._id}" ${task.status === 'done' ? 'checked' : ''} style="transform: scale(1.2);">
                    </div>
                    ${task.status === 'todo' ? `<button class="secondary-btn task-action" data-action="start" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; margin-right: 5px;">开始进行</button>` : ''}
                    <button class="secondary-btn task-action" data-action="edit" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; margin-right: 5px;">编辑</button>
                    ${task.status === 'done' ? `<button class="secondary-btn task-action" data-action="delete" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; background-color: #f44336; color: white;">删除</button>` : ''}
                </div>
                ${task.comment ? `<div class="task-comment"><strong>评论:</strong> ${task.comment}</div>` : ''}
                <div class="task-meta" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <span class="task-time" style="font-size: 11px; color: #999;">工时: ${this.formatTime(task.timeSpent || 0)}</span>
                    <div>
                        <button class="secondary-btn task-action task-time-track-btn" data-action="start-track" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; background-color: #2196F3; color: white; margin-right: 5px; ${this.taskTimers.has(task._id) ? 'display: none;' : ''}">开始计时</button>
                        <button class="secondary-btn task-action task-time-track-btn" data-action="stop-track" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; background-color: #f44336; color: white; margin-right: 5px; ${!this.taskTimers.has(task._id) ? 'display: none;' : ''}">停止计时</button>
                        <button class="secondary-btn task-action" data-action="history" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; background-color: #9c27b0; color: white;">历史记录</button>
                    </div>
                </div>
            `;
            fragment.appendChild(taskCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('task-action')) {
                const taskId = parseInt(e.target.dataset.taskId);
                const action = e.target.dataset.action;
                
                if (action === 'edit') {
                    this.editTask(taskId);
                } else if (action === 'start') {
                    this.startTask(taskId);
                } else if (action === 'delete') {
                    this.deleteTask(taskId);
                } else if (action === 'start-track') {
                    this.startTimeTracking(taskId);
                    this.updateTimeTrackButtons(taskId, true);
                } else if (action === 'stop-track') {
                    this.stopTimeTracking(taskId);
                    this.updateTimeTrackButtons(taskId, false);
                    this.updateTimeStatsDisplay();
                } else if (action === 'history') {
                    this.showTaskHistory(taskId);
                }
            }
        });
        
        // 添加复选框事件
        container.addEventListener('change', (e) => {
            if (e.target.classList.contains('task-checkbox')) {
                const taskId = parseInt(e.target.dataset.taskId);
                const isChecked = e.target.checked;
                
                // 更新任务状态
                const task = this.tasks.find(t => t._id === taskId);
                if (task) {
                    task.status = isChecked ? 'done' : 'todo';
                    task.progress = isChecked ? 100 : 0;
                    
                    // 重新渲染任务列表
                    this.renderTasks(window.app.currentProject._id);
                }
            }
        });
        
        // 添加进度条滑块事件
        const sliders = container.querySelectorAll('.progress-slider');
        sliders.forEach(slider => {
            slider.addEventListener('input', (e) => {
                const taskId = parseInt(e.target.dataset.taskId);
                const progress = parseInt(e.target.value);
                const progressValue = e.target.nextElementSibling;
                progressValue.textContent = `${progress}%`;
                
                // 更新任务进度
                const task = this.tasks.find(t => t._id === taskId);
                if (task) {
                    task.progress = progress;
                    
                    // 根据进度更新状态
                    if (progress === 100) {
                        task.status = 'done';
                    } else if (progress > 0) {
                        task.status = 'in_progress';
                    } else {
                        task.status = 'todo';
                    }
                    
                    // 更新进度条填充
                    const progressBar = e.target.closest('.task-progress').querySelector('.progress-fill');
                    if (progressBar) {
                        progressBar.style.width = `${progress}%`;
                    }
                    
                    // 重新渲染任务列表以更新任务位置
                    this.renderTasks(window.app.currentProject._id);
                    
                    // 异步发送请求到后端
                    if (!this.useMock) {
                        fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            },
                            body: JSON.stringify({ progress, status: task.status })
                        }).catch(error => {
                            console.error('更新任务进度失败:', error);
                        });
                    }
                }
            });
        });
    }
    
    renderTaskCards(tasks) {
        return tasks.map(task => `
            <div class="task-card task-status-${task.status}" draggable="true" data-task-id="${task.id}">
                <h4>${task.title}</h4>
                <p>${task.description}</p>
                <div class="task-meta">
                    <span>优先级: ${this.getPriorityLabel(task.priority)}</span>
                    <span>负责人: ${task.assignee}</span>
                </div>
                <div class="task-meta">
                    <span>截止日期: ${task.dueDate}</span>
                    <button class="secondary-btn" onclick="window.app.task.editTask(${task.id})" style="font-size: 10px; padding: 2px 6px;">编辑</button>
                </div>
            </div>
        `).join('');
    }
    
    getPriorityLabel(priority) {
        switch (priority) {
            case 'high': return '高';
            case 'medium': return '中';
            case 'low': return '低';
            default: return '中';
        }
    }
    
    updateTimeTrackButtons(taskId, isTracking) {
        const taskCard = document.querySelector(`[data-task-id="${taskId}"]`);
        if (!taskCard) return;
        
        const startBtn = taskCard.querySelector('[data-action="start-track"]');
        const stopBtn = taskCard.querySelector('[data-action="stop-track"]');
        
        if (startBtn) startBtn.style.display = isTracking ? 'none' : 'inline-block';
        if (stopBtn) stopBtn.style.display = isTracking ? 'inline-block' : 'none';
    }
    
    initDragAndDrop() {
        const taskCards = document.querySelectorAll('.task-card');
        const taskColumns = document.querySelectorAll('.task-column > div');
        
        taskCards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.taskId);
                card.style.opacity = '0.5';
                card.style.transform = 'scale(1.02)';
                card.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            });
            
            card.addEventListener('dragend', (e) => {
                card.style.opacity = '1';
                card.style.transform = 'scale(1)';
            });
        });
        
        taskColumns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.style.backgroundColor = '#e3f2fd';
                column.style.border = '2px dashed #2196f3';
                column.style.transition = 'background-color 0.2s ease, border 0.2s ease';
            });
            
            column.addEventListener('dragleave', (e) => {
                column.style.backgroundColor = 'transparent';
                column.style.border = 'none';
            });
            
            column.addEventListener('drop', async (e) => {
                e.preventDefault();
                column.style.backgroundColor = 'transparent';
                column.style.border = 'none';
                
                const taskId = e.dataTransfer.getData('text/plain');
                const task = this.tasks.find(t => t._id == taskId);
                
                if (task) {
                    // 记录原始状态，用于回滚
                    const originalStatus = task.status;
                    
                    // 乐观更新：立即更新UI
                    const columnId = column.id;
                    let newStatus;
                    if (columnId === 'todo-tasks') {
                        newStatus = 'todo';
                    } else if (columnId === 'in-progress-tasks') {
                        newStatus = 'in_progress';
                    } else if (columnId === 'done-tasks') {
                        newStatus = 'done';
                    }
                    
                    // 更新内存中的任务状态
                    task.status = newStatus;
                    
                    // 重新渲染
                    this.renderTasks(window.app.currentProject._id);
                    
                    // 异步发送请求到后端
                    if (!this.useMock) {
                        try {
                            const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                                },
                                body: JSON.stringify({ status: newStatus })
                            });
                            
                            if (!response.ok) {
                                throw new Error('更新任务状态失败');
                            }
                        } catch (error) {
                            console.error('更新任务状态失败:', error);
                            // 回滚UI状态
                            task.status = originalStatus;
                            this.renderTasks(window.app.currentProject._id);
                            this.showError('更新任务状态失败，请重试');
                        }
                    }
                }
            });
        });
    }
    
    showCreateTaskForm() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="task-form">
                <h2>创建任务</h2>
                <div class="form-group">
                    <label>任务标题 *</label>
                    <input type="text" id="task-title" placeholder="请输入任务标题">
                </div>
                <div class="form-group">
                    <label>任务描述 *</label>
                    <textarea id="task-description" placeholder="请输入任务描述" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label>状态 *</label>
                    <select id="task-status">
                        <option value="todo" selected>待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="done">已完成</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>优先级 *</label>
                    <select id="task-priority">
                        <option value="high">高</option>
                        <option value="medium" selected>中</option>
                        <option value="low">低</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>标签 *</label>
                    <select id="task-tag">
                        <option value="bug修复">bug修复</option>
                        <option value="功能开发" selected>功能开发</option>
                        <option value="优化">优化</option>
                        <option value="文档">文档</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>负责人 *</label>
                    <input type="text" id="task-assignee" placeholder="请输入负责人">
                </div>
                <div class="form-group">
                    <label>分支列表</label>
                    <select id="task-branch">
                        <option value="main">main</option>
                        <option value="feature-auth">feature-auth</option>
                        <option value="hotfix-bug">hotfix-bug</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>完成百分比</label>
                    <input type="range" id="task-progress" min="0" max="100" value="0">
                    <span id="progress-value">0%</span>
                </div>
                <div class="form-group">
                    <label>截止日期 *</label>
                    <input type="date" id="task-due-date">
                </div>
                <div class="form-group">
                    <label>依赖任务</label>
                    <input type="text" id="task-dependencies" placeholder="请输入依赖任务ID，用逗号分隔">
                </div>
                <div class="form-group">
                    <label>任务评论</label>
                    <textarea id="task-comment" placeholder="请输入任务评论" rows="2"></textarea>
                </div>
                <div class="form-actions">
                    <button id="save-task-btn" class="primary-btn">保存</button>
                    <button id="cancel-task-btn" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        // 添加进度条事件
        const progressInput = document.getElementById('task-progress');
        const progressValue = document.getElementById('progress-value');
        if (progressInput && progressValue) {
            progressInput.addEventListener('input', () => {
                progressValue.textContent = `${progressInput.value}%`;
            });
        }
        
        // 添加事件
        document.getElementById('save-task-btn').addEventListener('click', () => this.createTask());
        document.getElementById('cancel-task-btn').addEventListener('click', () => this.renderTasks(window.app.currentProject._id));
    }
    
    async createTask() {
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const status = document.getElementById('task-status').value;
        const priority = document.getElementById('task-priority').value;
        const tag = document.getElementById('task-tag').value;
        const assignee = document.getElementById('task-assignee').value;
        const branch = document.getElementById('task-branch').value;
        const progress = document.getElementById('task-progress').value;
        const dueDate = document.getElementById('task-due-date').value;
        const dependencies = document.getElementById('task-dependencies').value;
        const comment = document.getElementById('task-comment').value;
        
        if (!title || !description || !status || !priority || !tag || !assignee || !dueDate) {
            this.showError('请填写所有必填字段');
            return;
        }
        
        // 处理依赖任务
        const dependencyIds = dependencies
            .split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id));
        
        // 检查循环依赖
        if (dependencyIds.length > 0) {
            if (this.hasCircularDependency(dependencyIds)) {
                this.showError('检测到循环依赖，请调整依赖关系');
                return;
            }
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const newTask = {
                    _id: this.tasks.length + 1,
                    projectId: window.app.currentProject._id,
                    title,
                    description,
                    status,
                    priority,
                    tag,
                    assignee,
                    branch,
                    progress: parseInt(progress),
                    dueDate,
                    dependencies: dependencyIds,
                    comment
                };
                this.tasks.push(newTask);
                this.renderTasks(window.app.currentProject._id);
                this.showSuccess('任务创建成功');
            } else {
                // 实际API调用
                const response = await fetch(`${this.apiBaseUrl}/projects/${window.app.currentProject._id}/tasks`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ 
                        title, 
                        description, 
                        status, 
                        priority, 
                        tag, 
                        assignee, 
                        branch, 
                        progress, 
                        dueDate, 
                        dependencies: dependencyIds,
                        comment 
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建任务失败');
                }
                
                const newTask = await response.json();
                this.tasks.push(newTask);
                this.renderTasks(window.app.currentProject._id);
                this.showSuccess('任务创建成功');
            }
        } catch (error) {
            this.showError(error.message || '创建任务失败，请检查网络连接');
        }
    }
    
    // 检测循环依赖
    hasCircularDependency(dependencyIds) {
        // 构建依赖图
        const dependencyMap = new Map();
        
        // 先将当前任务的依赖关系添加到依赖图
        dependencyIds.forEach(depId => {
            dependencyMap.set(depId, []);
        });
        
        // 遍历所有任务，构建完整的依赖图
        this.tasks.forEach(task => {
            if (task.dependencies && task.dependencies.length > 0) {
                dependencyMap.set(task.id, task.dependencies);
            }
        });
        
        // 使用DFS检测循环依赖
        const visited = new Set();
        const recursionStack = new Set();
        
        function dfs(node) {
            if (recursionStack.has(node)) {
                return true; // 检测到循环
            }
            if (visited.has(node)) {
                return false; // 已访问过，无循环
            }
            
            visited.add(node);
            recursionStack.add(node);
            
            const neighbors = dependencyMap.get(node) || [];
            for (const neighbor of neighbors) {
                if (dfs(neighbor)) {
                    return true;
                }
            }
            
            recursionStack.delete(node);
            return false;
        }
        
        // 对每个依赖节点进行DFS
        for (const depId of dependencyIds) {
            if (dfs(depId)) {
                return true;
            }
        }
        
        return false;
    }
    
    // 获取任务历史记录
    async getTaskHistory(taskId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}/history`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('获取任务历史失败');
            }
            return await response.json();
        } catch (error) {
            console.error('获取任务历史失败:', error);
            return [];
        }
    }
    
    // 回退任务到历史版本
    async revertTask(taskId, historyId) {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}/revert`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ historyId })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '回退任务失败');
            }
            return await response.json();
        } catch (error) {
            console.error('回退任务失败:', error);
            throw error;
        }
    }
    
    startTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;
        
        // 更新任务状态为进行中
        task.status = 'in_progress';
        // 设置进度为1%，确保任务显示在进行中栏
        task.progress = 1;
        
        // 重新渲染任务列表
        this.renderTasks(window.app.currentProject._id);
        this.showSuccess('任务已开始进行');
        
        // 异步发送请求到后端
        if (!this.useMock) {
            fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ status: 'in_progress', progress: 1 })
            }).catch(error => {
                console.error('更新任务状态失败:', error);
            });
        }
    }
    
    async editTask(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;
        
        // 使用创建任务的表单进行编辑
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="task-form">
                <h2>编辑任务</h2>
                <div class="form-group">
                    <label>任务标题 *</label>
                    <input type="text" id="task-title" value="${task.title}" placeholder="请输入任务标题">
                </div>
                <div class="form-group">
                    <label>任务描述 *</label>
                    <textarea id="task-description" placeholder="请输入任务描述" rows="4">${task.description}</textarea>
                </div>
                <div class="form-group">
                    <label>状态 *</label>
                    <select id="task-status">
                        <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>待办</option>
                        <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>进行中</option>
                        <option value="done" ${task.status === 'done' ? 'selected' : ''}>已完成</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>优先级 *</label>
                    <select id="task-priority">
                        <option value="high" ${task.priority === 'high' ? 'selected' : ''}>高</option>
                        <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>中</option>
                        <option value="low" ${task.priority === 'low' ? 'selected' : ''}>低</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>标签 *</label>
                    <select id="task-tag">
                        <option value="bug修复" ${task.tag === 'bug修复' ? 'selected' : ''}>bug修复</option>
                        <option value="功能开发" ${task.tag === '功能开发' ? 'selected' : ''}>功能开发</option>
                        <option value="优化" ${task.tag === '优化' ? 'selected' : ''}>优化</option>
                        <option value="文档" ${task.tag === '文档' ? 'selected' : ''}>文档</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>负责人 *</label>
                    <input type="text" id="task-assignee" value="${task.assignee}" placeholder="请输入负责人">
                </div>
                <div class="form-group">
                    <label>分支列表</label>
                    <select id="task-branch">
                        <option value="main" ${task.branch === 'main' ? 'selected' : ''}>main</option>
                        <option value="feature-auth" ${task.branch === 'feature-auth' ? 'selected' : ''}>feature-auth</option>
                        <option value="hotfix-bug" ${task.branch === 'hotfix-bug' ? 'selected' : ''}>hotfix-bug</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>完成百分比</label>
                    <input type="range" id="task-progress" min="0" max="100" value="${task.progress || 0}">
                    <span id="progress-value">${task.progress || 0}%</span>
                </div>
                <div class="form-group">
                    <label>截止日期 *</label>
                    <input type="date" id="task-due-date" value="${task.dueDate}">
                </div>
                <div class="form-group">
                    <label>依赖任务</label>
                    <input type="text" id="task-dependencies" value="${task.dependencies ? task.dependencies.join(', ') : ''}" placeholder="请输入依赖任务ID，用逗号分隔">
                </div>
                <div class="form-group">
                    <label>任务评论</label>
                    <textarea id="task-comment" placeholder="请输入任务评论" rows="2">${task.comment || ''}</textarea>
                </div>
                <div class="form-actions">
                    <button id="save-task-btn" class="primary-btn">保存</button>
                    <button id="cancel-task-btn" class="secondary-btn">取消</button>
                </div>
                <input type="hidden" id="task-id" value="${task._id}">
            </div>
        `;
        
        // 添加进度条事件
        const progressInput = document.getElementById('task-progress');
        const progressValue = document.getElementById('progress-value');
        if (progressInput && progressValue) {
            progressInput.addEventListener('input', () => {
                progressValue.textContent = `${progressInput.value}%`;
            });
        }
        
        // 添加事件
        document.getElementById('save-task-btn').addEventListener('click', () => this.updateTask());
        document.getElementById('cancel-task-btn').addEventListener('click', () => this.renderTasks(window.app.currentProject._id));
    }
    
    // 显示任务历史记录
    async showTaskHistory(taskId) {
        const task = this.tasks.find(t => t._id === taskId);
        if (!task) return;
        
        // 显示骨架屏
        this.showSkeletonLoading();
        
        const history = await this.getTaskHistory(taskId);
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="task-history">
                <h2>任务历史记录 - ${task.title}</h2>
                <button class="back-button" style="margin-bottom: 20px;">返回任务列表</button>
                
                ${history.length > 0 ? `
                    <div class="history-list">
                        ${history.map(item => `
                            <div class="history-item">
                                <div class="history-header">
                                    <div>
                                        <span class="history-type">${this.getOperationTypeLabel(item.operationType)}</span>
                                        <span class="history-operator">${item.operator}</span>
                                    </div>
                                    <span class="history-time">${new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                <div class="history-description">${item.operationDescription}</div>
                                <div class="history-details">
                                    ${Object.keys(item.oldValue).length > 0 ? `
                                        <div class="history-change">
                                            <h4>变更前:</h4>
                                            <pre>${this.formatHistoryValue(item.oldValue)}</pre>
                                        </div>
                                    ` : ''}
                                    ${Object.keys(item.newValue).length > 0 ? `
                                        <div class="history-change">
                                            <h4>变更后:</h4>
                                            <pre>${this.formatHistoryValue(item.newValue)}</pre>
                                        </div>
                                    ` : ''}
                                </div>
                                ${item.operationType !== 'revert' ? `
                                    <button class="secondary-btn revert-btn" data-history-id="${item._id}" style="margin-top: 10px; background-color: #ff9800; color: white;">回退到此版本</button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="empty-message">暂无历史记录</div>
                `}
            </div>
        `;
        
        // 添加返回按钮事件
        document.querySelector('.back-button').addEventListener('click', () => this.renderTasks(window.app.currentProject._id));
        
        // 添加回退按钮事件
        const revertButtons = document.querySelectorAll('.revert-btn');
        revertButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                const historyId = parseInt(e.target.dataset.historyId);
                if (confirm('确定要回退到此版本吗？这将覆盖当前任务状态。')) {
                    try {
                        const updatedTask = await this.revertTask(taskId, historyId);
                        // 更新本地任务数据
                        const taskIndex = this.tasks.findIndex(t => t._id === taskId);
                        if (taskIndex !== -1) {
                            this.tasks[taskIndex] = updatedTask;
                        }
                        this.showSuccess('任务已成功回退到历史版本');
                        // 重新渲染任务列表
                        this.renderTasks(window.app.currentProject._id);
                    } catch (error) {
                        this.showError(error.message || '回退任务失败');
                    }
                }
            });
        });
    }
    
    // 获取操作类型标签
    getOperationTypeLabel(type) {
        switch (type) {
            case 'create': return '创建';
            case 'update': return '更新';
            case 'delete': return '删除';
            case 'revert': return '回退';
            default: return type;
        }
    }
    
    // 格式化历史值
    formatHistoryValue(value) {
        return JSON.stringify(value, null, 2);
    }
    
    async updateTask() {
        const taskId = parseInt(document.getElementById('task-id').value);
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const status = document.getElementById('task-status').value;
        const priority = document.getElementById('task-priority').value;
        const tag = document.getElementById('task-tag').value;
        const assignee = document.getElementById('task-assignee').value;
        const branch = document.getElementById('task-branch').value;
        const progress = document.getElementById('task-progress').value;
        const dueDate = document.getElementById('task-due-date').value;
        const dependencies = document.getElementById('task-dependencies').value;
        const comment = document.getElementById('task-comment').value;
        
        if (!title || !description || !status || !priority || !tag || !assignee || !dueDate) {
            this.showError('请填写所有必填字段');
            return;
        }
        
        // 处理依赖任务
        const dependencyIds = dependencies
            .split(',')
            .map(id => id.trim())
            .filter(id => id)
            .map(id => parseInt(id));
        
        // 检查循环依赖
        if (dependencyIds.length > 0) {
            if (this.hasCircularDependency(dependencyIds)) {
                this.showError('检测到循环依赖，请调整依赖关系');
                return;
            }
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const task = this.tasks.find(t => t._id === taskId);
                if (task) {
                    task.title = title;
                    task.description = description;
                    task.status = status;
                    task.priority = priority;
                    task.tag = tag;
                    task.assignee = assignee;
                    task.branch = branch;
                    task.progress = parseInt(progress);
                    task.dueDate = dueDate;
                    task.dependencies = dependencyIds;
                    task.comment = comment;
                    
                    // 根据进度更新状态
                    if (parseInt(progress) === 100) {
                        task.status = 'done';
                    } else if (parseInt(progress) > 0) {
                        task.status = 'in_progress';
                    }
                    
                    this.renderTasks(window.app.currentProject._id);
                    this.showSuccess('任务更新成功');
                }
            } else {
                // 实际API调用
                const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ 
                        title, 
                        description, 
                        status, 
                        priority, 
                        tag, 
                        assignee, 
                        branch, 
                        progress, 
                        dueDate, 
                        dependencies: dependencyIds,
                        comment 
                    })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '更新任务失败');
                }
                
                const updatedTask = await response.json();
                const task = this.tasks.find(t => t._id === taskId);
                if (task) {
                    Object.assign(task, updatedTask);
                }
                this.renderTasks(window.app.currentProject._id);
                this.showSuccess('任务更新成功');
            }
        } catch (error) {
            this.showError(error.message || '更新任务失败，请检查网络连接');
        }
    }
    
    async deleteTask(taskId) {
        if (confirm('确定要删除这个任务吗？')) {
            try {
                if (this.useMock) {
                    // 使用模拟数据，将任务移到回收站
                    const taskToDelete = this.tasks.find(t => t._id === taskId);
                    if (taskToDelete) {
                        this.recycledTasks.push(taskToDelete);
                        this.tasks = this.tasks.filter(t => t._id !== taskId);
                        this.renderTasks(window.app.currentProject._id);
                        this.showSuccess('任务已移至回收站');
                    }
                } else {
                    // 实际API调用
                    const response = await fetch(`${this.apiBaseUrl}/tasks/${taskId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '删除任务失败');
                    }
                    
                    // 实际API调用时，将任务移到回收站
                    const taskToDelete = this.tasks.find(t => t._id === taskId);
                    if (taskToDelete) {
                        this.recycledTasks.push(taskToDelete);
                    }
                    this.tasks = this.tasks.filter(t => t._id !== taskId);
                    this.renderTasks(window.app.currentProject._id);
                    this.showSuccess('任务已移至回收站');
                }
            } catch (error) {
                this.showError(error.message || '删除任务失败，请检查网络连接');
            }
        }
    }
    
    renderRecycledTasksToContainer(containerId, tasks) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();
        
        tasks.forEach(task => {
            const taskCard = document.createElement('div');
            taskCard.className = 'task-card';
            taskCard.style.cssText = 'background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); opacity: 0.7;';
            
            taskCard.innerHTML = `
                <h4 style="margin-top: 0; text-decoration: line-through;">${task.title}</h4>
                <p>描述: ${task.description}</p>
                <p>优先级: ${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</p>
                <p>负责人: ${task.assignee}</p>
                <p>截止日期: ${task.dueDate}</p>
                <div style="margin-top: 10px; display: flex; gap: 10px;">
                    <button class="secondary-btn task-action" data-action="restore" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; background-color: #4CAF50; color: white;">恢复</button>
                    <button class="secondary-btn task-action" data-action="permanent-delete" data-task-id="${task._id}" style="font-size: 10px; padding: 2px 6px; background-color: #f44336; color: white;">彻底删除</button>
                </div>
            `;
            fragment.appendChild(taskCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('task-action')) {
                const taskId = parseInt(e.target.dataset.taskId);
                const action = e.target.dataset.action;
                
                if (action === 'restore') {
                    this.restoreTask(taskId);
                } else if (action === 'permanent-delete') {
                    this.permanentDeleteTask(taskId);
                }
            }
        });
    }
    
    restoreTask(taskId) {
        const task = this.recycledTasks.find(t => t._id === taskId);
        if (task) {
            // 恢复任务到待办状态
            task.status = 'todo';
            task.progress = 0;
            this.tasks.push(task);
            this.recycledTasks = this.recycledTasks.filter(t => t._id !== taskId);
            this.renderTasks(window.app.currentProject._id);
            this.showSuccess('任务已恢复');
        }
    }
    
    permanentDeleteTask(taskId) {
        if (confirm('确定要彻底删除这个任务吗？此操作不可恢复。')) {
            this.recycledTasks = this.recycledTasks.filter(t => t._id !== taskId);
            this.renderTasks(window.app.currentProject._id);
            this.showSuccess('任务已彻底删除');
        }
    }
    
    showError(message) {
        const content = document.getElementById('content');
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        content.insertBefore(errorElement, content.firstChild);
        
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }
    
    showSuccess(message) {
        const content = document.getElementById('content');
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        content.insertBefore(successElement, content.firstChild);
        
        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }
}

export default Task;