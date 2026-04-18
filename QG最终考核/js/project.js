// 项目管理模块
class Project {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.useMock = false; // 使用真实API
        this.projects = [];
    }
    
    /**
     * 设置模拟数据
     */
    setupMockData() {
        // 模拟项目数据
        this.projects = [
            {
                _id: 1,
                name: 'QG协作平台',
                description: '团队协作与版本管理平台',
                createdAt: '2026-04-01',
                members: ['admin', 'user1', 'user2'],
                status: 'in_progress',
                dependencies: []
            },
            {
                _id: 2,
                name: '移动应用开发',
                description: '跨平台移动应用',
                createdAt: '2026-04-02',
                members: ['admin', 'user3'],
                status: 'todo',
                dependencies: [1] // 依赖于项目1
            },
            {
                _id: 3,
                name: '数据分析系统',
                description: '大数据分析与可视化系统',
                createdAt: '2026-04-03',
                members: ['admin', 'user1'],
                status: 'todo',
                dependencies: [2] // 依赖于项目2
            }
        ];
    }
    
    async loadProjects() {
        if (this.useMock) {
            // 使用模拟数据
            this.renderProjectList();
        } else {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.apiBaseUrl}/projects`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    if (response.status === 403) {
                        // token无效，清除token并跳转到登录页
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        window.location.hash = '#login';
                        return;
                    }
                    throw new Error('加载项目失败');
                }
                this.projects = await response.json();
            } catch (error) {
                this.projects = [];
                console.error('加载项目失败:', error);
            }
            
            this.renderProjectList();
        }
    }
    
    renderProjectList() {
        const projectList = document.getElementById('project-list');
        if (!projectList) {
            return;
        }
        projectList.innerHTML = '';
        
        this.projects.forEach(project => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = project.name;
            a.addEventListener('click', (e) => {
                e.preventDefault();
                this.selectProject(project);
            });
            li.appendChild(a);
            projectList.appendChild(li);
        });
    }
    
    selectProject(project) {
        // 更新当前项目
        window.app.setCurrentProject(project);
        
        // 渲染项目详情
        this.renderProjectDetail(project);
    }
    
    renderProjects() {
        const content = document.getElementById('content');
        
        // 清空content内容，避免重复渲染
        content.innerHTML = '';
        
        // 创建DocumentFragment减少DOM操作
        const fragment = document.createDocumentFragment();
        
        const projectManagement = document.createElement('div');
        projectManagement.className = 'project-management';
        projectManagement.innerHTML = `
            <div class="form-group">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>创建项目</h2>
            </div>
            <div class="project-form">
                <div class="form-group">
                    <label>项目名称</label>
                    <input type="text" id="project-name" placeholder="请输入项目名称">
                </div>
                <div class="form-group">
                    <label>项目描述</label>
                    <textarea id="project-description" placeholder="请输入项目描述" rows="4"></textarea>
                </div>
                <button id="save-project-btn" class="primary-btn">保存项目</button>
            </div>
            <div id="project-list-container" style="margin-top: 30px;">
                <h3>项目列表</h3>
            </div>
        `;
        
        fragment.appendChild(projectManagement);
        content.appendChild(fragment);
        
        // 渲染项目列表
        this.renderProjectListToContainer();
        
        // 添加保存项目事件
        document.getElementById('save-project-btn').addEventListener('click', () => this.createProject());
    }
    
    renderProjectListToContainer() {
        const container = document.getElementById('project-list-container');
        if (!container) {
            return;
        }
        // 清空容器，避免重复渲染
        container.innerHTML = '<h3>项目列表</h3>';
        const fragment = document.createDocumentFragment();
        
        this.projects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.innerHTML = `
                <h3>${project.name}</h3>
                <p>${project.description}</p>
                <p><small>创建时间: ${project.createdAt}</small></p>
                <p><small>成员: ${project.members.join(', ')}</small></p>
                <div class="project-actions">
                    <button class="secondary-btn project-select-btn" data-project-id="${project._id}">选择</button>
                    <button class="secondary-btn project-edit-btn" data-project-id="${project._id}">编辑</button>
                    <button class="secondary-btn project-delete-btn" data-project-id="${project._id}">删除</button>
                </div>
            `;
            fragment.appendChild(projectCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('project-select-btn')) {
                const projectId = parseInt(e.target.dataset.projectId);
                const project = this.projects.find(p => p._id === projectId);
                if (project) {
                    this.selectProject(project);
                }
            } else if (e.target.classList.contains('project-edit-btn')) {
                const projectId = parseInt(e.target.dataset.projectId);
                this.editProject(projectId);
            } else if (e.target.classList.contains('project-delete-btn')) {
                const projectId = parseInt(e.target.dataset.projectId);
                this.deleteProject(projectId);
            }
        });
    }
    
    renderProjectDetail(project) {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="project-detail">
                <h2>${project.name}</h2>
                <p>${project.description}</p>
                <div class="project-meta">
                    <p>创建时间: ${project.createdAt}</p>
                    <p>成员: ${project.members.join(', ')}</p>
                </div>
                <div class="project-actions">
                    <button class="secondary-btn" onclick="window.app.showTasks()">管理任务</button>
                    <button class="secondary-btn" onclick="window.app.showBranches()">管理分支</button>
                </div>
            </div>
        `;
    }
    
    showCreateForm() {
        this.renderProjects();
    }
    
    async createProject() {
        const name = document.getElementById('project-name').value;
        const description = document.getElementById('project-description').value;
        
        if (!name) {
            this.showError('请输入项目名称');
            return;
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const newProject = {
                    _id: this.projects.length + 1,
                    name,
                    description,
                    createdAt: new Date().toISOString().split('T')[0],
                    members: [JSON.parse(localStorage.getItem('user')).username]
                };
                
                this.projects.push(newProject);
                this.renderProjects();
                this.renderProjectList(); // 重新渲染右侧边栏的项目列表
                this.showSuccess('项目创建成功');
                // 设置为当前项目并跳转到任务页面
                setTimeout(() => {
                    window.app.setCurrentProject(newProject);
                }, 1000);
            } else {
                const response = await fetch(`${this.apiBaseUrl}/projects`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ name, description })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建项目失败');
                }
                
                const newProject = await response.json();
                this.projects.push(newProject);
                this.renderProjects();
                this.renderProjectList(); // 重新渲染右侧边栏的项目列表
                this.showSuccess('项目创建成功');
                // 设置为当前项目并跳转到任务页面
                setTimeout(() => {
                    window.app.setCurrentProject(newProject);
                }, 1000);
            }
        } catch (error) {
            this.showError(error.message || '创建项目失败，请检查网络连接');
        }
    }
    
    async editProject(projectId) {
        const project = this.projects.find(p => p._id === projectId);
        if (!project) return;
        
        const name = prompt('请输入新的项目名称', project.name);
        const description = prompt('请输入新的项目描述', project.description);
        const status = prompt('请输入项目状态 (todo/in_progress/done)', project.status || 'todo');
        
        if (name) {
            try {
                if (this.useMock) {
                    // 使用模拟数据
                    project.name = name;
                    if (description) project.description = description;
                    if (status) project.status = status;
                    this.renderProjects();
                    this.showSuccess('项目更新成功');
                    
                    // 检查项目是否完成，如果完成则自动跳转到下一个项目
                    if (status === 'done') {
                        this.checkProjectCompletion(projectId);
                    }
                } else {
                    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ name, description, status })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '更新项目失败');
                    }
                    
                    const updatedProject = await response.json();
                    Object.assign(project, updatedProject);
                    this.renderProjects();
                    this.showSuccess('项目更新成功');
                    
                    // 检查项目是否完成，如果完成则自动跳转到下一个项目
                    if (status === 'done') {
                        this.checkProjectCompletion(projectId);
                    }
                }
            } catch (error) {
                this.showError(error.message || '更新项目失败，请检查网络连接');
            }
        }
    }
    
    /**
     * 检查项目完成情况，自动跳转到下一个项目
     * @param {number} projectId - 已完成的项目ID
     */
    checkProjectCompletion(projectId) {
        // 查找依赖于当前项目的项目
        const nextProjects = this.projects.filter(project => 
            project.dependencies && project.dependencies.includes(projectId)
        );
        
        if (nextProjects.length > 0) {
            // 选择第一个依赖项目作为下一个项目
            const nextProject = nextProjects[0];
            
            // 更新下一个项目的状态为进行中
            nextProject.status = 'in_progress';
            
            // 显示提示消息
            this.showSuccess(`项目 ${nextProject.name} 已自动开始，因为它依赖的项目已完成`);
            
            // 自动跳转到下一个项目
            setTimeout(() => {
                this.selectProject(nextProject);
            }, 1500);
        }
    }
    
    async deleteProject(projectId) {
        if (confirm('确定要删除这个项目吗？')) {
            try {
                if (this.useMock) {
                    // 使用模拟数据
                    this.projects = this.projects.filter(p => p._id !== projectId);
                    this.renderProjects();
                    this.showSuccess('项目删除成功');
                } else {
                    const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '删除项目失败');
                    }
                    
                    this.projects = this.projects.filter(p => p.id !== projectId);
                    this.renderProjects();
                    this.showSuccess('项目删除成功');
                }
            } catch (error) {
                this.showError(error.message || '删除项目失败，请检查网络连接');
            }
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

export default Project;