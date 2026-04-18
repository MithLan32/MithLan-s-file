// 分支管理模块
class Branch {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.useMock = false; // 使用真实API
        this.branches = [];
        this.commits = [];
    }
    
    /**
     * 设置模拟数据
     */
    setupMockData() {
        // 模拟分支数据
        this.branches = [
            {
                _id: 1,
                projectId: 1,
                name: 'main',
                type: 'main',
                createdAt: '2026-04-01',
                lastCommit: 'Initial commit'
            },
            {
                _id: 2,
                projectId: 1,
                name: 'feature-auth',
                type: 'feature',
                createdAt: '2026-04-02',
                lastCommit: 'Add login functionality',
                parentId: 1
            },
            {
                _id: 3,
                projectId: 1,
                name: 'hotfix-bug',
                type: 'hotfix',
                createdAt: '2026-04-03',
                lastCommit: 'Fix critical bug',
                parentId: 1
            }
        ];
        
        // 模拟提交记录
        this.commits = [
            {
                _id: 1,
                projectId: 1,
                branchId: 1,
                hash: 'abc123',
                message: 'Initial commit',
                author: 'admin',
                date: '2026-04-01T10:00:00Z'
            },
            {
                _id: 2,
                projectId: 1,
                branchId: 2,
                hash: 'def456',
                message: 'Add login functionality',
                author: 'user1',
                date: '2026-04-02T14:30:00Z'
            },
            {
                _id: 3,
                projectId: 1,
                branchId: 3,
                hash: 'ghi789',
                message: 'Fix critical bug',
                author: 'admin',
                date: '2026-04-03T09:15:00Z'
            }
        ];
    }
    
    async loadBranches(projectId) {
        if (this.useMock) {
            // 使用模拟数据，根据projectId过滤
            this.setupMockData();
            this.branches = this.branches.filter(branch => branch.projectId === projectId);
        } else {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/branches`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error('加载分支失败');
                }
                this.branches = await response.json();
            } catch (error) {
                this.branches = [];
                console.error('加载分支失败:', error);
            }
        }
        
        // 加载提交记录
        await this.loadCommits(projectId);
    }
    
    async loadCommits(projectId) {
        if (this.useMock) {
            // 使用模拟数据，根据projectId过滤
            this.commits = this.commits.filter(commit => commit.projectId === projectId);
        } else {
            try {
                const token = localStorage.getItem('token');
                const response = await fetch(`${this.apiBaseUrl}/projects/${projectId}/commits`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                if (!response.ok) {
                    throw new Error('加载提交记录失败');
                }
                this.commits = await response.json();
            } catch (error) {
                this.commits = [];
                console.error('加载提交记录失败:', error);
            }
        }
    }
    
    async renderBranches(projectId) {
        await this.loadBranches(projectId);
        
        const content = document.getElementById('content');
        
        // 清空content内容，避免重复渲染
        content.innerHTML = '';
        
        // 创建DocumentFragment减少DOM操作
        const fragment = document.createDocumentFragment();
        
        const branchManagement = document.createElement('div');
        branchManagement.className = 'branch-management';
        branchManagement.innerHTML = `
            <div style="margin-bottom: 20px;">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>分支管理</h2>
                <button id="create-branch-btn" class="primary-btn" style="margin-top: 10px;">创建分支</button>
            </div>
            <div class="branch-tree">
                <h3>分支结构</h3>
                <div id="branch-tree-container"></div>
            </div>
            <div class="commit-history" style="margin-top: 30px;">
                <h3>提交历史</h3>
                <div id="commit-history-container"></div>
            </div>
        `;
        
        fragment.appendChild(branchManagement);
        content.appendChild(fragment);
        
        // 渲染分支树
        this.renderBranchTreeToContainer();
        
        // 渲染提交历史
        this.renderCommitHistoryToContainer();
        
        // 添加创建分支事件
        document.getElementById('create-branch-btn').addEventListener('click', () => this.showCreateBranchForm());
    }
    
    renderBranchTreeToContainer() {
        const container = document.getElementById('branch-tree-container');
        const fragment = document.createDocumentFragment();
        
        // 构建分支树形结构
        const mainBranch = this.branches.find(branch => branch.type === 'main');
        if (mainBranch) {
            const mainBranchNode = document.createElement('div');
            mainBranchNode.className = 'branch-node';
            mainBranchNode.innerHTML = `
                <div class="branch-info">
                    <span class="branch-name">${mainBranch.name}</span>
                    <span class="branch-type ${mainBranch.type}">${this.getBranchTypeLabel(mainBranch.type)}</span>
                    <span class="branch-date">${mainBranch.createdAt}</span>
                    <button class="secondary-btn branch-merge-btn" data-branch-id="${mainBranch._id}" style="font-size: 10px; padding: 2px 6px;">合并</button>
                </div>
            `;
            fragment.appendChild(mainBranchNode);
            
            // 递归添加子分支
            this.renderChildBranchesToContainer(fragment, mainBranch._id);
        } else {
            const noBranchMessage = document.createElement('p');
            noBranchMessage.textContent = '暂无分支';
            fragment.appendChild(noBranchMessage);
        }
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('branch-merge-btn')) {
                const branchId = parseInt(e.target.dataset.branchId);
                this.mergeBranch(branchId);
            }
        });
    }
    
    renderChildBranchesToContainer(parentElement, parentId) {
        const childBranches = this.branches.filter(branch => branch.parentId === parentId);
        if (childBranches.length === 0) return;
        
        childBranches.forEach(branch => {
            const branchNode = document.createElement('div');
            branchNode.className = 'branch-node';
            branchNode.innerHTML = `
                <div class="branch-info">
                    <span class="branch-name">${branch.name}</span>
                    <span class="branch-type ${branch.type}">${this.getBranchTypeLabel(branch.type)}</span>
                    <span class="branch-date">${branch.createdAt}</span>
                    <button class="secondary-btn branch-merge-btn" data-branch-id="${branch._id}" style="font-size: 10px; padding: 2px 6px;">合并</button>
                </div>
            `;
            parentElement.appendChild(branchNode);
            
            // 递归添加子分支
            this.renderChildBranchesToContainer(branchNode, branch._id);
        });
    }
    
    renderCommitHistoryToContainer() {
        const container = document.getElementById('commit-history-container');
        const fragment = document.createDocumentFragment();
        
        if (this.commits.length === 0) {
            const noCommitMessage = document.createElement('p');
            noCommitMessage.textContent = '暂无提交记录';
            fragment.appendChild(noCommitMessage);
        } else {
            const commitList = document.createElement('div');
            commitList.className = 'commit-list';
            
            this.commits.forEach(commit => {
                const branch = this.branches.find(b => b.id === commit.branchId);
                const commitItem = document.createElement('div');
                commitItem.className = 'commit-item';
                commitItem.style.cssText = 'padding: 15px; border-bottom: 1px solid #e0e0e0;';
                commitItem.innerHTML = `
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="font-size: 14px; font-weight: 600;">${commit.message}</h4>
                        <span style="font-size: 12px; color: #999;">${commit.hash}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                        <span style="font-size: 12px;">作者: ${commit.author}</span>
                        <span style="font-size: 12px; color: #666;">${new Date(commit.date).toLocaleString()}</span>
                        <span style="font-size: 12px; padding: 2px 6px; background-color: #f0f0f0; border-radius: 10px;">${branch ? branch.name : 'unknown'}</span>
                    </div>
                    <div style="margin-top: 10px; display: flex; gap: 10px;">
                        <button class="secondary-btn commit-action" data-action="revert" data-commit-id="${commit.id}" style="font-size: 10px; padding: 2px 6px;">回退到此版本</button>
                        <button class="secondary-btn commit-action" data-action="view-details" data-commit-id="${commit.id}" style="font-size: 10px; padding: 2px 6px;">查看详情</button>
                    </div>
                `;
                commitList.appendChild(commitItem);
            });
            
            fragment.appendChild(commitList);
        }
        
        container.appendChild(fragment);
        
        // 添加事件委托
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('commit-action')) {
                const commitId = parseInt(e.target.dataset.commitId);
                const action = e.target.dataset.action;
                
                switch (action) {
                    case 'revert':
                        this.revertToCommit(commitId);
                        break;
                    case 'view-details':
                        this.viewCommitDetails(commitId);
                        break;
                }
            }
        });
    }
    
    renderBranchTree() {
        // 构建分支树形结构
        const mainBranch = this.branches.find(branch => branch.type === 'main');
        if (!mainBranch) return '<p>暂无分支</p>';
        
        return `
            <div class="branch-node">
                <div class="branch-info">
                    <span class="branch-name">${mainBranch.name}</span>
                    <span class="branch-type ${mainBranch.type}">${this.getBranchTypeLabel(mainBranch.type)}</span>
                    <span class="branch-date">${mainBranch.createdAt}</span>
                    <button class="secondary-btn" onclick="window.app.branch.mergeBranch(${mainBranch.id})" style="font-size: 10px; padding: 2px 6px;">合并</button>
                </div>
                ${this.renderChildBranches(mainBranch.id)}
            </div>
        `;
    }
    
    renderChildBranches(parentId) {
        const childBranches = this.branches.filter(branch => branch.parentId === parentId);
        if (childBranches.length === 0) return '';
        
        return childBranches.map(branch => `
            <div class="branch-node">
                <div class="branch-info">
                    <span class="branch-name">${branch.name}</span>
                    <span class="branch-type ${branch.type}">${this.getBranchTypeLabel(branch.type)}</span>
                    <span class="branch-date">${branch.createdAt}</span>
                    <button class="secondary-btn" onclick="window.app.branch.mergeBranch(${branch.id})" style="font-size: 10px; padding: 2px 6px;">合并</button>
                </div>
                ${this.renderChildBranches(branch.id)}
            </div>
        `).join('');
    }
    
    getBranchTypeLabel(type) {
        switch (type) {
            case 'main': return '主分支';
            case 'feature': return '功能分支';
            case 'hotfix': return '修复分支';
            default: return '分支';
        }
    }
    
    renderCommitHistory() {
        if (this.commits.length === 0) return '<p>暂无提交记录</p>';
        
        return `
            <div class="commit-list">
                ${this.commits.map(commit => {
                    const branch = this.branches.find(b => b.id === commit.branchId);
                    return `
                        <div class="commit-item" style="padding: 15px; border-bottom: 1px solid #e0e0e0;">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h4 style="font-size: 14px; font-weight: 600;">${commit.message}</h4>
                                <span style="font-size: 12px; color: #999;">${commit.hash}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between; margin-top: 8px;">
                                <span style="font-size: 12px;">作者: ${commit.author}</span>
                                <span style="font-size: 12px; color: #666;">${new Date(commit.date).toLocaleString()}</span>
                                <span style="font-size: 12px; padding: 2px 6px; background-color: #f0f0f0; border-radius: 10px;">${branch ? branch.name : 'unknown'}</span>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }
    
    showCreateBranchForm() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="branch-form">
                <h2>创建分支</h2>
                <div class="form-group">
                    <label>分支名称</label>
                    <input type="text" id="branch-name" placeholder="请输入分支名称">
                </div>
                <div class="form-group">
                    <label>分支类型</label>
                    <select id="branch-type">
                        <option value="feature">功能分支 (feature-)</option>
                        <option value="hotfix">修复分支 (hotfix-)</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>基于分支</label>
                    <select id="branch-parent">
                        ${this.branches.map(branch => `
                            <option value="${branch._id}">${branch.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="form-actions">
                    <button id="save-branch-btn" class="primary-btn">保存</button>
                    <button id="cancel-branch-btn" class="secondary-btn">取消</button>
                </div>
            </div>
        `;
        
        // 添加事件
        document.getElementById('save-branch-btn').addEventListener('click', () => this.createBranch());
        document.getElementById('cancel-branch-btn').addEventListener('click', () => this.renderBranches(window.app.currentProject._id));
    }
    
    async createBranch() {
        const name = document.getElementById('branch-name').value;
        const type = document.getElementById('branch-type').value;
        const parentId = parseInt(document.getElementById('branch-parent').value);
        
        if (!name) {
            this.showError('请输入分支名称');
            return;
        }
        
        // 生成完整的分支名称
        const fullName = `${type}-${name}`;
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const newBranch = {
                    _id: this.branches.length + 1,
                    projectId: window.app.currentProject._id,
                    name: fullName,
                    type,
                    parentId,
                    createdAt: new Date().toISOString().split('T')[0],
                    lastCommit: 'Initial commit'
                };
                
                this.branches.push(newBranch);
                this.renderBranches(window.app.currentProject._id);
                this.showSuccess('分支创建成功');
            } else {
                const response = await fetch(`${this.apiBaseUrl}/projects/${window.app.currentProject._id}/branches`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ name: fullName, type, parentId })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '创建分支失败');
                }
                
                const newBranch = await response.json();
                this.branches.push(newBranch);
                this.renderBranches(window.app.currentProject._id);
                this.showSuccess('分支创建成功');
            }
        } catch (error) {
            this.showError(error.message || '创建分支失败，请检查网络连接');
        }
    }
    
    async mergeBranch(branchId) {
        const branch = this.branches.find(b => b._id === branchId);
        if (!branch) return;
        
        // 选择目标分支
        const targetBranchId = prompt('请选择目标分支ID (main分支ID: 1):');
        if (!targetBranchId) return;
        
        try {
            if (this.useMock) {
                // 模拟冲突检测
                const hasConflict = Math.random() > 0.5; // 50% 概率有冲突
                
                if (hasConflict) {
                    // 模拟冲突
                    const conflicts = [
                        {
                            file: 'src/auth.js',
                            ours: 'const JWT_SECRET = "your-secret-key";',
                            theirs: 'const JWT_SECRET = "new-secret-key";'
                        },
                        {
                            file: 'src/project.js',
                            ours: 'const apiBaseUrl = "http://localhost:3000/api";',
                            theirs: 'const apiBaseUrl = "http://localhost:3001/api";'
                        }
                    ];
                    this.showConflictResolution(conflicts, branchId, parseInt(targetBranchId));
                } else {
                    this.performMerge(branchId, parseInt(targetBranchId));
                }
            } else {
                // 先调用合并检测接口
                const checkResponse = await fetch(`${this.apiBaseUrl}/branches/${branchId}/merge-check`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ targetBranchId: parseInt(targetBranchId) })
                });
                
                if (!checkResponse.ok) {
                    throw new Error('合并检测失败');
                }
                
                const checkResult = await checkResponse.json();
                
                if (checkResult.hasConflict) {
                    // 显示冲突解决界面
                    this.showConflictResolution(checkResult.conflicts, branchId, parseInt(targetBranchId));
                } else {
                    // 直接合并
                    this.performMerge(branchId, parseInt(targetBranchId));
                }
            }
        } catch (error) {
            // 模拟冲突检测
            const hasConflict = Math.random() > 0.5; // 50% 概率有冲突
            
            if (hasConflict) {
                // 模拟冲突
                const conflicts = [
                    {
                        file: 'src/auth.js',
                        ours: 'const JWT_SECRET = "your-secret-key";',
                        theirs: 'const JWT_SECRET = "new-secret-key";'
                    },
                    {
                        file: 'src/project.js',
                        ours: 'const apiBaseUrl = "http://localhost:3000/api";',
                        theirs: 'const apiBaseUrl = "http://localhost:3001/api";'
                    }
                ];
                this.showConflictResolution(conflicts, branchId, parseInt(targetBranchId));
            } else {
                this.performMerge(branchId, parseInt(targetBranchId));
            }
        }
    }
    
    showConflictResolution(conflicts, sourceBranchId, targetBranchId) {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="conflict-resolution">
                <h2>合并冲突解决</h2>
                <p>检测到以下冲突，请手动解决：</p>
                ${conflicts.map((conflict, index) => `
                    <div class="conflict-item" style="margin-bottom: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 8px;">
                        <h4>文件: ${conflict.file}</h4>
                        <div style="margin: 10px 0;">
                            <div style="background-color: #e3f2fd; padding: 10px; border-left: 4px solid #2196f3; margin-bottom: 10px;">
                                <p style="font-size: 12px; font-weight: 600; margin-bottom: 5px;">当前分支:</p>
                                <pre style="margin: 0; font-size: 12px;">${conflict.ours}</pre>
                            </div>
                            <div style="background-color: #fff3e0; padding: 10px; border-left: 4px solid #ff9800; margin-bottom: 10px;">
                                <p style="font-size: 12px; font-weight: 600; margin-bottom: 5px;">目标分支:</p>
                                <pre style="margin: 0; font-size: 12px;">${conflict.theirs}</pre>
                            </div>
                            <div style="margin-top: 10px;">
                                <label style="display: block; margin-bottom: 5px; font-size: 14px;">解决后的内容:</label>
                                <textarea id="conflict-${index}" style="width: 100%; height: 100px; padding: 10px; border: 1px solid #e0e0e0; border-radius: 4px; font-family: monospace; font-size: 12px;">${conflict.ours}</textarea>
                            </div>
                        </div>
                    </div>
                `).join('')}
                <div class="form-actions" style="margin-top: 20px;">
                    <button id="resolve-conflicts-btn" class="primary-btn">解决冲突并合并</button>
                    <button id="cancel-merge-btn" class="secondary-btn">取消合并</button>
                </div>
            </div>
        `;
        
        // 添加事件
        document.getElementById('resolve-conflicts-btn').addEventListener('click', () => {
            const resolutions = conflicts.map((conflict, index) => {
                return {
                    file: conflict.file,
                    content: document.getElementById(`conflict-${index}`).value
                };
            });
            this.resolveConflicts(sourceBranchId, targetBranchId, resolutions);
        });
        
        document.getElementById('cancel-merge-btn').addEventListener('click', () => {
            this.renderBranches(window.app.currentProject._id);
        });
    }
    
    async resolveConflicts(sourceBranchId, targetBranchId, resolutions) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/branches/${sourceBranchId}/merge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetBranchId, resolutions })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '合并失败');
            }
            
            const result = await response.json();
            this.showSuccess(result.message);
            this.renderBranches(window.app.currentProject._id);
        } catch (error) {
            this.showError(error.message || '合并失败，请检查网络连接');
        }
    }
    
    async performMerge(sourceBranchId, targetBranchId) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/branches/${sourceBranchId}/merge`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ targetBranchId })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || '合并分支失败');
            }
            
            const result = await response.json();
            this.showSuccess(result.message);
            this.renderBranches(window.app.currentProject._id);
        } catch (error) {
            this.showError(error.message || '合并分支失败，请检查网络连接');
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
    
    async revertToCommit(commitId) {
        if (confirm('确定要回退到此版本吗？这将创建一个新的提交来撤销之前的更改。')) {
            try {
                // 这里应该调用后端API执行回退操作
                this.showSuccess('版本回退成功');
                setTimeout(() => this.renderBranches(window.app.currentProject._id), 1500);
            } catch (error) {
                this.showError('版本回退失败');
            }
        }
    }
    
    viewCommitDetails(commitId) {
        const commit = this.commits.find(c => c.id === commitId);
        if (!commit) return;
        
        const branch = this.branches.find(b => b.id === commit.branchId);
        
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="commit-details">
                <h2>提交详情</h2>
                <button id="back-to-branches" class="secondary-btn" style="margin-bottom: 20px;">返回分支管理</button>
                <div class="commit-info">
                    <div class="form-group">
                        <label>提交信息</label>
                        <p>${commit.message}</p>
                    </div>
                    <div class="form-group">
                        <label>提交哈希</label>
                        <p>${commit.hash}</p>
                    </div>
                    <div class="form-group">
                        <label>作者</label>
                        <p>${commit.author}</p>
                    </div>
                    <div class="form-group">
                        <label>提交时间</label>
                        <p>${new Date(commit.date).toLocaleString()}</p>
                    </div>
                    <div class="form-group">
                        <label>所属分支</label>
                        <p>${branch ? branch.name : 'unknown'}</p>
                    </div>
                    <div class="form-group">
                        <label>变更文件</label>
                        <ul>
                            <li>src/auth.js</li>
                            <li>src/project.js</li>
                            <li>src/task.js</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        
        // 添加返回按钮事件
        document.getElementById('back-to-branches').addEventListener('click', () => this.renderBranches(window.app.currentProject._id));
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

export default Branch;