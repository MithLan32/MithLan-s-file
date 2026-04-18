// 团队管理模块
class Team {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.useMock = false; // 使用真实API
        this.teams = [];
        this.pendingProjects = []; // 待审批项目
    }
    
    /**
     * 设置模拟数据
     */
    setupMockData() {
        // 模拟团队数据
        this.teams = [
            {
                _id: 1,
                name: '开发团队',
                description: '负责项目的开发工作',
                avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=team%20avatar%20development&image_size=square',
                members: ['admin', 'user1', 'user2'],
                createdAt: '2026-04-01'
            },
            {
                _id: 2,
                name: '设计团队',
                description: '负责项目的设计工作',
                avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=team%20avatar%20design&image_size=square',
                members: ['admin', 'user3'],
                createdAt: '2026-04-02'
            }
        ];
    }
    
    async loadTeams() {
        if (this.useMock) {
            // 使用模拟数据
            this.setupMockData();
        } else {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.apiBaseUrl}/teams`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error('加载团队失败');
                }
                this.teams = await response.json();
            } catch (error) {
                this.teams = [];
                console.error('加载团队失败:', error);
            }
        }
    }
    
    async renderTeams() {
        await this.loadTeams();
        
        const content = document.getElementById('content');
        
        // 清空content内容，避免重复渲染
        content.innerHTML = '';
        
        // 创建DocumentFragment减少DOM操作
        const fragment = document.createDocumentFragment();
        
        const teamManagement = document.createElement('div');
        teamManagement.className = 'team-management';
        teamManagement.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>团队管理</h2>
                <button id="create-team-btn" class="primary-btn" style="margin-top: 10px;">创建团队</button>
            </div>
            <div class="team-list" id="team-list-container"></div>
        `;
        
        fragment.appendChild(teamManagement);
        content.appendChild(fragment);
        
        // 渲染团队列表
        this.renderTeamListToContainer();
        
        // 添加创建团队事件
        document.getElementById('create-team-btn').addEventListener('click', () => this.showCreateTeamForm());
    }
    
    /**
     * 渲染审批页面（组长用）
     */
    renderApprovals() {
        const content = document.getElementById('content');
        content.innerHTML = '';
        
        const fragment = document.createDocumentFragment();
        
        const approvalPage = document.createElement('div');
        approvalPage.className = 'approval-page';
        approvalPage.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>项目审批</h2>
            </div>
            <div class="pending-projects" id="pending-projects-container">
                <h3 style="margin-bottom: 15px;">待审批项目 (${this.pendingProjects.length})</h3>
                <div id="pending-list"></div>
            </div>
        `;
        
        fragment.appendChild(approvalPage);
        content.appendChild(fragment);
        
        this.renderPendingProjects();
    }
    
    /**
     * 渲染待审批项目列表
     */
    renderPendingProjects() {
        const container = document.getElementById('pending-list');
        if (!container) return;
        
        container.innerHTML = '';
        
        if (this.pendingProjects.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无待审批项目</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        this.pendingProjects.forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'pending-project-card';
            projectCard.dataset.projectId = project._id;
            projectCard.style.cssText = 'background-color: #fff3cd; padding: 20px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #ffc107;';
            
            projectCard.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <h4 style="margin-bottom: 5px;">${project.title}</h4>
                        <p style="font-size: 14px; color: #666; margin-bottom: 5px;">${project.description}</p>
                        <p style="font-size: 12px; color: #999;">申请人: ${project.applicant}</p>
                        <p style="font-size: 12px; color: #999;">申请时间: ${project.applyDate}</p>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button class="secondary-btn approval-action" data-action="approve" data-project-id="${project._id}" style="background-color: #4CAF50; color: white;">通过</button>
                        <button class="secondary-btn approval-action" data-action="reject" data-project-id="${project._id}" style="background-color: #f44336; color: white;">打回</button>
                    </div>
                </div>
            `;
            fragment.appendChild(projectCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('approval-action')) {
                const projectId = parseInt(e.target.dataset.projectId);
                const action = e.target.dataset.action;
                
                if (action === 'approve') {
                    this.approveProject(projectId);
                } else if (action === 'reject') {
                    this.rejectProject(projectId);
                }
            }
        });
    }
    
    /**
     * 提交项目审批
     */
    submitForApproval(project) {
        project.applicant = window.app.currentUser?.username || '未知用户';
        project.applyDate = new Date().toLocaleDateString();
        project.status = 'pending';
        this.pendingProjects.push(project);
    }
    
    /**
     * 审批通过
     */
    approveProject(projectId) {
        const projectIndex = this.pendingProjects.findIndex(p => p._id === projectId);
        if (projectIndex !== -1) {
            const project = this.pendingProjects[projectIndex];
            project.status = 'approved';
            this.pendingProjects.splice(projectIndex, 1);
            window.app.project.projects.push(project);
            this.renderPendingProjects();
            alert(`项目"${project.title}"已通过审批！`);
        }
    }
    
    /**
     * 审批打回
     */
    rejectProject(projectId) {
        const projectIndex = this.pendingProjects.findIndex(p => p._id === projectId);
        if (projectIndex !== -1) {
            const project = this.pendingProjects[projectIndex];
            const reason = prompt('请输入打回原因：');
            if (reason) {
                project.rejectReason = reason;
                project.status = 'rejected';
                this.pendingProjects.splice(projectIndex, 1);
                this.renderPendingProjects();
                alert(`项目"${project.title}"已被打回！原因：${reason}`);
            }
        }
    }
    
    /**
     * 渲染管理组长页面（管理员用）
     */
    renderManageLeaders() {
        const content = document.getElementById('content');
        content.innerHTML = '';
        
        // 获取所有组长
        const leaders = window.app.auth.mockUsers.filter(u => u.role === 'leader');
        const members = window.app.auth.mockUsers.filter(u => u.role === 'member');
        
        const fragment = document.createDocumentFragment();
        
        const managePage = document.createElement('div');
        managePage.className = 'manage-leaders-page';
        managePage.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>组长管理</h2>
            </div>
            <div class="leaders-section" style="margin-bottom: 30px;">
                <h3 style="margin-bottom: 15px;">项目组长 (${leaders.length})</h3>
                <div id="leaders-list"></div>
            </div>
            <div class="members-section">
                <h3 style="margin-bottom: 15px;">普通成员 (${members.length})</h3>
                <div id="members-list"></div>
            </div>
        `;
        
        fragment.appendChild(managePage);
        content.appendChild(fragment);
        
        this.renderLeadersList(leaders, 'leaders-list');
        this.renderMembersList(members, 'members-list');
    }
    
    /**
     * 渲染组长列表
     */
    renderLeadersList(leaders, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (leaders.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无组长</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        leaders.forEach(leader => {
            const leaderCard = document.createElement('div');
            leaderCard.className = 'leader-card';
            leaderCard.dataset.userId = leader._id;
            leaderCard.style.cssText = 'background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
            
            leaderCard.innerHTML = `
                <div>
                    <strong>${leader.username}</strong>
                    <span style="margin-left: 10px; font-size: 12px; color: #666;">邮箱: ${leader.email || '未设置'}</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="secondary-btn leader-action" data-action="demote" data-user-id="${leader._id}" style="background-color: #ff9800; color: white;">降为成员</button>
                </div>
            `;
            fragment.appendChild(leaderCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('leader-action')) {
                const userId = parseInt(e.target.dataset.userId);
                const action = e.target.dataset.action;
                
                if (action === 'demote') {
                    this.demoteToMember(userId);
                }
            }
        });
    }
    
    /**
     * 渲染成员列表
     */
    renderMembersList(members, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        container.innerHTML = '';
        
        if (members.length === 0) {
            container.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">暂无成员</p>';
            return;
        }
        
        const fragment = document.createDocumentFragment();
        
        members.forEach(member => {
            const memberCard = document.createElement('div');
            memberCard.className = 'member-card';
            memberCard.dataset.userId = member._id;
            memberCard.style.cssText = 'background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;';
            
            memberCard.innerHTML = `
                <div>
                    <strong>${member.username}</strong>
                    <span style="margin-left: 10px; font-size: 12px; color: #666;">邮箱: ${member.email || '未设置'}</span>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="secondary-btn member-action" data-action="promote" data-user-id="${member._id}" style="background-color: #4CAF50; color: white;">升为组长</button>
                </div>
            `;
            fragment.appendChild(memberCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('member-action')) {
                const userId = parseInt(e.target.dataset.userId);
                const action = e.target.dataset.action;
                
                if (action === 'promote') {
                    this.promoteToLeader(userId);
                }
            }
        });
    }
    
    /**
     * 降为成员
     */
    demoteToMember(userId) {
        if (confirm('确定要将该组长降为普通成员吗？')) {
            const user = window.app.auth.mockUsers.find(u => u._id === userId);
            if (user) {
                user.role = 'member';
                this.renderManageLeaders();
                alert(`用户"${user.username}"已被降为普通成员`);
            }
        }
    }
    
    /**
     * 升为组长
     */
    promoteToLeader(userId) {
        if (confirm('确定要将该成员升为项目组长吗？')) {
            const user = window.app.auth.mockUsers.find(u => u._id === userId);
            if (user) {
                user.role = 'leader';
                this.renderManageLeaders();
                alert(`用户"${user.username}"已被升为项目组长`);
            }
        }
    }
    
    renderTeamListToContainer() {
        const container = document.getElementById('team-list-container');
        const fragment = document.createDocumentFragment();
        
        this.teams.forEach(team => {
            const teamCard = document.createElement('div');
            teamCard.className = 'team-card';
            teamCard.dataset.teamId = team._id;
            teamCard.style.cssText = 'background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 15px; display: flex; align-items: center; gap: 20px;';
            teamCard.innerHTML = `
                <div class="team-avatar" style="flex-shrink: 0;">
                    <img src="${team.avatar}" alt="${team.name}" style="width: 60px; height: 60px; border-radius: 50%;">
                </div>
                <div class="team-info" style="flex: 1;">
                    <h3 style="margin-bottom: 5px;">${team.name}</h3>
                    <p style="margin-bottom: 10px; color: #666; font-size: 14px;">${team.description}</p>
                    <p style="font-size: 12px; color: #999;">成员: ${team.members.join(', ')}</p>
                    <p style="font-size: 12px; color: #999;">创建时间: ${team.createdAt}</p>
                </div>
                <div class="team-actions">
                    <button class="secondary-btn team-action" data-action="view-tasks">查看任务</button>
                    <button class="secondary-btn team-action" data-action="assign-task">分配任务</button>
                    <button class="secondary-btn team-action" data-action="edit">编辑</button>
                    <button class="secondary-btn team-action" data-action="delete">删除</button>
                </div>
            `;
            fragment.appendChild(teamCard);
        });
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('team-action')) {
                const teamCard = e.target.closest('.team-card');
                const teamId = parseInt(teamCard.dataset.teamId);
                const action = e.target.dataset.action;
                
                switch (action) {
                    case 'view-tasks':
                        this.viewTeamTasks(teamId);
                        break;
                    case 'assign-task':
                        this.assignTask(teamId);
                        break;
                    case 'edit':
                        this.editTeam(teamId);
                        break;
                    case 'delete':
                        this.deleteTeam(teamId);
                        break;
                }
            }
        });
    }
    
    showCreateTeamForm() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="team-form">
                <h2>创建团队</h2>
                <div class="form-group">
                    <label>团队名称</label>
                    <input type="text" id="team-name" placeholder="请输入团队名称">
                </div>
                <div class="form-group">
                    <label>团队描述</label>
                    <textarea id="team-description" placeholder="请输入团队描述" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label>团队头像</label>
                    <input type="file" id="team-avatar" accept="image/*">
                </div>
                <div class="form-group">
                    <label>成员列表</label>
                    <input type="text" id="team-members" placeholder="请输入成员用户名，用逗号分隔">
                </div>
                <div class="form-actions">
                    <button id="save-team-btn" class="primary-btn">保存</button>
                    <button id="cancel-team-btn" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        // 添加事件
        document.getElementById('save-team-btn').addEventListener('click', () => this.createTeam());
        document.getElementById('cancel-team-btn').addEventListener('click', () => this.renderTeams());
    }
    
    async createTeam() {
        const name = document.getElementById('team-name').value;
        const description = document.getElementById('team-description').value;
        const members = document.getElementById('team-members').value.split(',').map(m => m.trim());
        
        if (!name) {
            this.showError('请输入团队名称');
            return;
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const newTeam = {
                    _id: this.teams.length + 1,
                    name,
                    description,
                    members,
                    avatar: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=team%20avatar&image_size=square',
                    createdAt: new Date().toISOString().split('T')[0]
                };
                
                this.teams.push(newTeam);
                this.renderTeams();
                this.showSuccess('团队创建成功');
            } else {
                const response = await fetch(`${this.apiBaseUrl}/teams`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ name, description, members })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建团队失败');
                }
                
                const newTeam = await response.json();
                this.teams.push(newTeam);
                this.renderTeams();
                this.showSuccess('团队创建成功');
            }
        } catch (error) {
            this.showError(error.message || '创建团队失败，请检查网络连接');
        }
    }
    
    async editTeam(teamId) {
        const team = this.teams.find(t => t._id === teamId);
        if (!team) return;
        
        const name = prompt('请输入团队名称', team.name);
        const description = prompt('请输入团队描述', team.description);
        const members = prompt('请输入成员用户名，用逗号分隔', team.members.join(','));
        
        if (name) {
            try {
                if (this.useMock) {
                    // 使用模拟数据
                    team.name = name;
                    if (description) team.description = description;
                    if (members) team.members = members.split(',').map(m => m.trim());
                    this.renderTeams();
                    this.showSuccess('团队更新成功');
                } else {
                    const response = await fetch(`${this.apiBaseUrl}/teams/${teamId}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        },
                        body: JSON.stringify({ name, description, members: members.split(',').map(m => m.trim()) })
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '更新团队失败');
                    }
                    
                    const updatedTeam = await response.json();
                    Object.assign(team, updatedTeam);
                    this.renderTeams();
                    this.showSuccess('团队更新成功');
                }
            } catch (error) {
                this.showError(error.message || '更新团队失败，请检查网络连接');
            }
        }
    }
    
    async deleteTeam(teamId) {
        if (confirm('确定要删除这个团队吗？')) {
            try {
                if (this.useMock) {
                    // 使用模拟数据
                    this.teams = this.teams.filter(t => t._id !== teamId);
                    this.renderTeams();
                    this.showSuccess('团队删除成功');
                } else {
                    const response = await fetch(`${this.apiBaseUrl}/teams/${teamId}`, {
                        method: 'DELETE',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });
                    
                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error || '删除团队失败');
                    }
                    
                    this.teams = this.teams.filter(t => t._id !== teamId);
                    this.renderTeams();
                    this.showSuccess('团队删除成功');
                }
            } catch (error) {
                this.showError(error.message || '删除团队失败，请检查网络连接');
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
    
    async viewTeamTasks(teamId) {
        const team = this.teams.find(t => t._id === teamId);
        if (!team) return;
        
        try {
            // 从任务模块获取任务
            let tasks = [];
            if (window.app && window.app.task) {
                // 加载所有任务
                await window.app.task.loadTasks(window.app.currentProject ? window.app.currentProject._id : 1);
                // 过滤出团队成员的任务
                tasks = window.app.task.tasks.filter(task => 
                    team.members.includes(task.assignee) || task.teamId === teamId
                );
            } else {
                // 暂时使用模拟数据
                tasks = [
                    {
                        _id: 1,
                        projectId: 1,
                        title: '完成用户认证功能',
                        status: 'done',
                        priority: 'high',
                        assignee: 'admin',
                        dueDate: '2026-04-10',
                        progress: 100
                    },
                    {
                        _id: 2,
                        projectId: 1,
                        title: '开发项目管理页面',
                        status: 'in_progress',
                        priority: 'medium',
                        assignee: 'user1',
                        dueDate: '2026-04-15',
                        progress: 50
                    }
                ];
            }
            
            const content = document.getElementById('content');
            content.innerHTML = `
                <div class="team-tasks">
                    <h2>${team.name} - 团队任务</h2>
                    <button id="back-to-teams" class="secondary-btn" style="margin-bottom: 20px;">返回团队列表</button>
                    <div class="tasks-container" id="team-tasks-container"></div>
                </div>
            `;
            
            // 渲染任务列表
            const tasksContainer = document.getElementById('team-tasks-container');
            const fragment = document.createDocumentFragment();
            
            tasks.forEach(task => {
                const taskCard = document.createElement('div');
                taskCard.className = 'task-card';
                taskCard.dataset.taskId = task._id;
                const statusColor = task.status === 'done' ? '#4CAF50' : task.status === 'in_progress' ? '#2196F3' : '#FF9800';
                taskCard.style.cssText = `background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); transition: all 0.3s ease; ${task.status === 'done' ? 'opacity: 0.7; text-decoration: line-through;' : ''}; cursor: pointer;`;
                
                // Use actual progress value from task or calculate based on status as fallback
                let progress = task.progress || 0;
                if (progress === 0 && task.status === 'in_progress') {
                    progress = 50;
                } else if (progress === 0 && task.status === 'done') {
                    progress = 100;
                }
                
                taskCard.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="margin: 0;">${task.title}</h4>
                        <input type="checkbox" class="task-checkbox" data-task-id="${task._id}" ${task.status === 'done' ? 'checked' : ''} style="transform: scale(1.2);">
                    </div>
                    <div style="margin-bottom: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <span>进度:</span>
                            <span>${progress}%</span>
                        </div>
                        <div style="width: 100%; background-color: #e0e0e0; border-radius: 4px; height: 8px;">
                            <div style="width: ${progress}%; background-color: ${statusColor}; height: 100%; border-radius: 4px; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                    <div style="font-size: 14px; color: #666;">
                        <p>状态: <span style="color: ${statusColor};">${task.status === 'todo' ? '待办' : task.status === 'in_progress' ? '进行中' : '已完成'}</span></p>
                        <p>优先级: ${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}</p>
                        <p>负责人: ${task.assignee}</p>
                        <p>截止日期: ${task.dueDate}</p>
                    </div>
                `;
                fragment.appendChild(taskCard);
            });
            
            tasksContainer.appendChild(fragment);
            
            // 添加复选框事件
            tasksContainer.addEventListener('change', (e) => {
                if (e.target.classList.contains('task-checkbox')) {
                    const taskId = parseInt(e.target.dataset.taskId);
                    const isChecked = e.target.checked;
                    
                    // 更新任务状态
                    if (window.app && window.app.task) {
                        const task = window.app.task.tasks.find(t => t._id === taskId);
                        if (task) {
                            task.status = isChecked ? 'done' : 'todo';
                            task.progress = isChecked ? 100 : 0;
                            
                            // 重新渲染任务列表
                            this.viewTeamTasks(teamId);
                        }
                    } else {
                        const task = tasks.find(t => t._id === taskId);
                        if (task) {
                            task.status = isChecked ? 'done' : 'todo';
                            task.progress = isChecked ? 100 : 0;
                            
                            // 重新渲染任务列表
                            this.viewTeamTasks(teamId);
                        }
                    }
                }
            });
            
            // 添加任务卡片点击事件
            tasksContainer.addEventListener('click', (e) => {
                // 避免复选框点击时触发卡片点击事件
                if (e.target.classList.contains('task-checkbox')) {
                    return;
                }
                
                const taskCard = e.target.closest('.task-card');
                if (taskCard) {
                    const taskId = parseInt(taskCard.dataset.taskId);
                    let task;
                    
                    if (window.app && window.app.task) {
                        task = window.app.task.tasks.find(t => t._id === taskId);
                    } else {
                        task = tasks.find(t => t._id === taskId);
                    }
                    
                    if (task) {
                        // 找到任务所在的项目
                        if (window.app && window.app.project && window.app.project.projects) {
                            const projectId = task.projectId || 1;
                            const project = window.app.project.projects.find(p => p._id === projectId);
                            
                            if (project) {
                                // 设置当前项目
                                window.app.setCurrentProject(project);
                                // 导航到任务页面
                                window.app.showTasks();
                            }
                        }
                    }
                }
            });
            
            // 添加返回按钮事件
            document.getElementById('back-to-teams').addEventListener('click', () => this.renderTeams());
        } catch (error) {
            this.showError('加载团队任务失败');
            console.error('加载团队任务失败:', error);
        }
    }
    
    async assignTask(teamId) {
        const team = this.teams.find(t => t._id === teamId);
        if (!team) return;
        
        // 获取所有任务
        let allTasks = [];
        if (window.app && window.app.task) {
            // 从任务模块获取任务
            await window.app.task.loadTasks(window.app.currentProject ? window.app.currentProject._id : 1);
            allTasks = window.app.task.tasks;
        } else {
            // 使用模拟任务数据
            allTasks = [
                { _id: 1, title: '完成用户认证功能', status: 'todo', priority: 'high' },
                { _id: 2, title: '开发项目管理页面', status: 'in_progress', priority: 'medium' },
                { _id: 3, title: '测试任务看板', status: 'done', priority: 'low' },
                { _id: 4, title: '设计移动应用界面', status: 'todo', priority: 'medium' }
            ];
        }
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="assign-task-form">
                <h2>分配任务 - ${team.name}</h2>
                <div class="form-group">
                    <label>选择现有任务</label>
                    <select id="existing-task" onchange="document.getElementById('task-title').value = this.options[this.selectedIndex].text">
                        <option value="">-- 选择任务 --</option>
                        ${allTasks.map(task => `<option value="${task._id}">${task.title}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>任务标题</label>
                    <input type="text" id="task-title" placeholder="请输入任务标题">
                </div>
                <div class="form-group">
                    <label>任务描述</label>
                    <textarea id="task-description" placeholder="请输入任务描述" rows="4"></textarea>
                </div>
                <div class="form-group">
                    <label>状态</label>
                    <select id="task-status">
                        <option value="todo">待办</option>
                        <option value="in_progress">进行中</option>
                        <option value="done">已完成</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>优先级</label>
                    <select id="task-priority">
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>负责人</label>
                    <select id="task-assignee">
                        ${team.members.map(member => `<option value="${member}">${member}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>截止日期</label>
                    <input type="date" id="task-due-date">
                </div>
                <div class="form-group">
                    <label>团队备注</label>
                    <textarea id="team-note" placeholder="请输入团队相关备注" rows="2"></textarea>
                </div>
                <div class="form-actions">
                    <button id="save-task-btn" class="primary-btn">保存</button>
                    <button id="cancel-task-btn" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        // 添加事件
        document.getElementById('save-task-btn').addEventListener('click', () => this.saveAssignedTask(teamId));
        document.getElementById('cancel-task-btn').addEventListener('click', () => this.renderTeams());
    }
    
    async saveAssignedTask(teamId) {
        const existingTaskId = document.getElementById('existing-task').value;
        const title = document.getElementById('task-title').value;
        const description = document.getElementById('task-description').value;
        const status = document.getElementById('task-status').value;
        const priority = document.getElementById('task-priority').value;
        const assignee = document.getElementById('task-assignee').value;
        const dueDate = document.getElementById('task-due-date').value;
        const teamNote = document.getElementById('team-note').value;
        
        if (!title) {
            this.showError('请输入任务标题');
            return;
        }
        
        try {
            if (window.app && window.app.task) {
                // 使用任务模块创建或更新任务
                if (existingTaskId) {
                    // 更新现有任务
                    const task = window.app.task.tasks.find(t => t._id == existingTaskId);
                    if (task) {
                        task.title = title;
                        task.description = description;
                        task.status = status;
                        task.priority = priority;
                        task.assignee = assignee;
                        task.dueDate = dueDate;
                        task.teamNote = teamNote;
                        task.teamId = teamId;
                        
                        // 重新渲染任务列表
                        window.app.task.renderTasks(window.app.currentProject ? window.app.currentProject._id : 1);
                    }
                } else {
                    // 创建新任务
                    const newTask = {
                        _id: window.app.task.tasks.length + 1,
                        projectId: window.app.currentProject ? window.app.currentProject._id : 1,
                        title,
                        description,
                        status,
                        priority,
                        assignee,
                        dueDate,
                        teamNote,
                        teamId,
                        progress: 0
                    };
                    window.app.task.tasks.push(newTask);
                    window.app.task.renderTasks(window.app.currentProject ? window.app.currentProject._id : 1);
                }
            }
            
            this.showSuccess('任务分配成功');
            setTimeout(() => this.renderTeams(), 1500);
        } catch (error) {
            this.showError('任务分配失败');
            console.error('任务分配失败:', error);
        }
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

export default Team;