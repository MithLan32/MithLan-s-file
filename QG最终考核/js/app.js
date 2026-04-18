// 主应用模块 - 版本 1.0
console.log('Loading app.js v1.0');
console.log('App.js is being loaded!');

// 立即执行的代码块，确保文件被加载
(function() {
    console.log('App.js immediate execution');
})();

class App {
    constructor() {
        this.currentUser = null;
        this.currentProject = null;
        this.isAuthenticated = false;
        this.auth = new Auth();
        this.project = new Project();
        this.task = new Task();
        this.branch = new Branch();
        this.team = new Team();
        this.notification = new Notification();
        this.setupEventListeners();
        this.setupRouteGuard();
        this.initializeApp();
    }
    
    /**
     * 初始化应用
     */
    async initializeApp() {
        // 检查用户登录状态
        const token = localStorage.getItem('token');
        const userStr = localStorage.getItem('user');
        if (token && userStr) {
            try {
                const user = JSON.parse(userStr);
                this.currentUser = user;
                this.isAuthenticated = true;
                this.updateNavbar();
            } catch (error) {
                console.error('Invalid user data:', error);
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                this.isAuthenticated = false;
            }
        }
        
        // 加载项目列表
        if (this.isAuthenticated) {
            await this.project.loadProjects();
            
            // 加载团队列表
            await this.team.loadTeams();
            
            // 加载通知
            await this.notification.loadNotifications();
            // 启动通知轮询
            this.notification.startPolling();
        }
    }
    
    /**
     * 设置路由守卫
     * 使用hashchange事件实现前端路由守卫
     */
    setupRouteGuard() {
        window.addEventListener('hashchange', (e) => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            this.handleRouteChange(hash);
        });
        
        window.addEventListener('load', () => {
            const hash = window.location.hash.slice(1) || 'dashboard';
            this.handleRouteChange(hash);
        });
    }
    
    /**
     * 处理路由变化
     * @param {string} route - 路由路径
     */
    handleRouteChange(route) {
        const publicRoutes = ['login', 'register', 'forgot-password'];
        const content = document.getElementById('content');
        
        // 检查用户是否已登录
        if (!this.currentUser && !publicRoutes.includes(route)) {
            window.location.hash = 'login';
            // 直接实现登录页面，不调用showAuthSection
            content.innerHTML = `
                <div class="auth-section">
                    <div class="auth-container">
                        <div class="auth-tabs">
                            <button class="auth-tab active" data-tab="login">登录</button>
                            <button class="auth-tab" data-tab="register">注册</button>
                        </div>
                        <div class="auth-content">
                            <div class="auth-form" id="login-form">
                                <h2>用户登录</h2>
                                <div class="form-group">
                                    <label for="login-username">用户名/邮箱/手机号</label>
                                    <input type="text" id="login-username" placeholder="请输入用户名、邮箱或手机号">
                                </div>
                                <div class="form-group">
                                    <label for="login-password">密码</label>
                                    <input type="password" id="login-password" placeholder="请输入密码">
                                </div>
                                <div class="form-group">
                                    <button id="login-btn" class="primary-btn">登录</button>
                                </div>
                                <div class="form-links">
                                    <a href="#" id="forgot-password-link">忘记密码？</a>
                                </div>
                            </div>
                            <div class="auth-form" id="register-form" style="display: none;">
                                <h2>用户注册</h2>
                                <div class="form-group">
                                    <label for="register-username">用户名</label>
                                    <input type="text" id="register-username" placeholder="请输入用户名">
                                </div>
                                <div class="form-group">
                                    <label for="register-email">邮箱</label>
                                    <input type="email" id="register-email" placeholder="请输入邮箱">
                                </div>
                                <div class="form-group">
                                    <label for="register-phone">手机号</label>
                                    <input type="tel" id="register-phone" placeholder="请输入手机号">
                                </div>
                                <div class="form-group">
                                    <label for="register-password">密码</label>
                                    <input type="password" id="register-password" placeholder="请输入密码">
                                    <div id="password-strength" class="password-strength"></div>
                                </div>
                                <div class="form-group">
                                    <button id="register-btn" class="primary-btn">注册</button>
                                </div>
                            </div>
                            <div class="auth-form" id="forgot-password-form" style="display: none;">
                                <h2>忘记密码</h2>
                                <div class="form-group">
                                    <label for="forgot-email">邮箱</label>
                                    <input type="email" id="forgot-email" placeholder="请输入注册时的邮箱">
                                </div>
                                <div class="form-group">
                                    <button id="forgot-password-btn" class="primary-btn">发送重置链接</button>
                                </div>
                                <div class="form-links">
                                    <a href="#" id="back-to-login">返回登录</a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            // 初始化认证模块
            this.auth.init();
            return;
        }
        
        // 根据路由导航到对应页面
        switch (route) {
            case 'dashboard':
                // 直接实现仪表盘页面，不调用showDashboard
                content.innerHTML = `
                    <div id="dashboard">
                        <h2>欢迎使用QG团队协作平台</h2>
                        <p>选择一个项目开始工作，或创建新的项目。</p>
                    </div>
                `;
                break;
            case 'projects':
                this.project.renderProjects();
                break;
            case 'tasks':
                this.task.renderTasks(this.currentProject ? this.currentProject._id : 1);
                break;
            case 'teams':
                this.team.renderTeams();
                break;
            case 'branches':
                this.branch.renderBranches(this.currentProject ? this.currentProject._id : 1);
                break;
            case 'notifications':
                this.notification.renderNotifications();
                break;
            case 'profile':
                content.innerHTML = `
                    <div class="profile-section">
                        <h2>个人资料</h2>
                        <div class="profile-info">
                            <p><strong>用户名:</strong> ${this.currentUser.username}</p>
                            <p><strong>角色:</strong> ${this.currentUser.role === 'admin' ? '管理员' : this.currentUser.role === 'leader' ? '项目组长' : '普通成员'}</p>
                        </div>
                    </div>
                `;
                break;
            default:
                // 直接实现仪表盘页面，不调用showDashboard
                content.innerHTML = `
                    <div id="dashboard">
                        <h2>欢迎使用QG团队协作平台</h2>
                        <p>选择一个项目开始工作，或创建新的项目。</p>
                    </div>
                `;
        }
        
        // 更新右侧边栏
        this.updateRightSidebar();
    }
    
    /**
     * 设置事件监听器
     * 使用事件委托减少事件监听器数量，提高性能
     */
    setupEventListeners() {
        const appContainer = document.getElementById('app');
        
        // 认证相关事件
        appContainer.addEventListener('click', (e) => {
            if (e.target.id === 'login-tab') {
                this.switchAuthTab('login');
            } else if (e.target.id === 'register-tab') {
                this.switchAuthTab('register');
            } else if (e.target.id === 'login-btn') {
                this.auth.login();
            } else if (e.target.id === 'register-btn') {
                this.auth.register();
            } else if (e.target.id === 'logout-btn') {
                this.auth.logout();
            } else if (e.target.id === 'create-project-btn') {
                this.project.showCreateForm();
            } else if (e.target.id === 'forgot-password-link') {
                e.preventDefault();
                this.auth.showForgotPasswordForm();
            } else if (e.target.id === 'back-to-login-link') {
                e.preventDefault();
                this.auth.backToLogin();
            } else if (e.target.id === 'send-reset-code-btn') {
                this.auth.sendResetCode();
            } else if (e.target.id === 'reset-password-btn') {
                this.auth.resetPassword();
            }
        });
        
        // 导航事件
        const navLinks = document.querySelector('.nav-links');
        navLinks.addEventListener('click', (e) => {
            e.preventDefault();
            const target = e.target;
            if (target.id === 'nav-projects') {
                this.showProjects();
                this.updateNavHighlight('nav-projects');
            } else if (target.id === 'nav-tasks') {
                this.showTasks();
                this.updateNavHighlight('nav-tasks');
            } else if (target.id === 'nav-branches') {
                this.showBranches();
                this.updateNavHighlight('nav-branches');
            } else if (target.id === 'nav-teams') {
                this.showTeams();
                this.updateNavHighlight('nav-teams');
            } else if (target.id === 'nav-notifications') {
                this.showNotifications();
                this.updateNavHighlight('nav-notifications');
            } else if (target.id === 'nav-profile') {
                this.showProfile();
                this.updateNavHighlight('nav-profile');
            } else if (target.id === 'nav-dashboard') {
                this.showDashboard();
                this.updateNavHighlight('nav-dashboard');
            }
        });
    }
    
    /**
     * 更新导航栏高亮
     * @param {string} activeId - 当前激活的导航链接ID
     */
    updateNavHighlight(activeId) {
        const navLinks = document.querySelectorAll('.nav-links a');
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        const activeLink = document.getElementById(activeId);
        if (activeLink) {
            activeLink.classList.add('active');
        }
    }
    
    /**
     * 更新导航栏
     */
    updateNavbar() {
        const userInfo = document.getElementById('user-info');
        const authLinks = document.getElementById('auth-links');
        const navLinks = document.querySelector('.nav-links');
        
        if (this.isAuthenticated) {
            userInfo.style.display = 'block';
            authLinks.style.display = 'none';
            document.getElementById('username').textContent = this.currentUser.username;
            
            // 根据用户角色显示不同的导航项
            const adminNavItems = document.querySelectorAll('.admin-only');
            adminNavItems.forEach(item => {
                item.style.display = this.currentUser.role === 'admin' ? 'block' : 'none';
            });
        } else {
            userInfo.style.display = 'none';
            authLinks.style.display = 'flex';
        }
    }
    
    /**
     * 更新右侧边栏
     */
    updateRightSidebar() {
        const rightSidebar = document.getElementById('right-sidebar');
        if (rightSidebar) {
            if (this.isAuthenticated) {
                rightSidebar.innerHTML = `
                    <div class="sidebar-section">
                        <h3>项目统计</h3>
                        <p>项目数量: ${this.project.projects.length}</p>
                    </div>
                    <div class="sidebar-section">
                        <h3>任务统计</h3>
                        <p>待办: ${this.task.tasks.filter(t => t.status === 'todo').length}</p>
                        <p>进行中: ${this.task.tasks.filter(t => t.status === 'in_progress').length}</p>
                        <p>已完成: ${this.task.tasks.filter(t => t.status === 'done').length}</p>
                    </div>
                `;
            } else {
                rightSidebar.innerHTML = '';
            }
        }
    }
    
    /**
     * 显示项目列表
     */
    showProjects() {
        this.currentSection = 'projects';
        this.project.renderProjects();
        this.updateRightSidebar();
    }
    
    /**
     * 显示任务列表
     */
    showTasks(projectId) {
        this.currentSection = 'tasks';
        if (projectId) {
            this.task.renderTasks(projectId);
        } else if (this.currentProject) {
            this.task.renderTasks(this.currentProject._id);
        } else if (this.project.projects.length > 0) {
            this.setCurrentProject(this.project.projects[0]);
            this.task.renderTasks(this.project.projects[0]._id);
        } else {
            this.renderMessage('请先创建项目');
        }
        this.updateRightSidebar();
    }
    
    /**
     * 显示分支列表
     */
    showBranches(projectId) {
        this.currentSection = 'branches';
        if (projectId) {
            this.branch.renderBranches(projectId);
        } else if (this.currentProject) {
            this.branch.renderBranches(this.currentProject._id);
        } else {
            this.renderMessage('请先选择一个项目');
        }
        this.updateRightSidebar();
    }
    
    /**
     * 显示团队列表
     */
    showTeams() {
        this.currentSection = 'teams';
        this.team.renderTeams();
        this.updateRightSidebar();
    }
    
    /**
     * 显示通知页面
     */
    showNotifications() {
        this.currentSection = 'notifications';
        this.notification.renderNotifications();
        this.updateRightSidebar();
    }
    
    /**
     * 显示个人资料页面
     */
    showProfile() {
        this.currentSection = 'profile';
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="profile-section">
                <h2>个人资料</h2>
                <div class="profile-info">
                    <p><strong>用户名:</strong> ${this.currentUser.username}</p>
                    <p><strong>角色:</strong> ${this.currentUser.role === 'admin' ? '管理员' : this.currentUser.role === 'leader' ? '项目组长' : '普通成员'}</p>
                </div>
            </div>
        `;
        this.updateRightSidebar();
    }
    
    /**
     * 显示仪表盘页面
     */
    showDashboard() {
        this.currentSection = 'dashboard';
        const content = document.getElementById('content');
        content.innerHTML = `
            <div id="dashboard">
                <h2>欢迎使用QG团队协作平台</h2>
                <p>选择一个项目开始工作，或创建新的项目。</p>
            </div>
        `;
        this.updateRightSidebar();
    }
    
    /**
     * 显示认证部分（登录/注册）
     */
    showAuthSection() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="auth-section">
                <div class="auth-container">
                    <div class="auth-tabs">
                        <button class="auth-tab active" data-tab="login">登录</button>
                        <button class="auth-tab" data-tab="register">注册</button>
                    </div>
                    <div class="auth-content">
                        <div class="auth-form" id="login-form">
                            <h2>用户登录</h2>
                            <div class="form-group">
                                <label for="login-username">用户名/邮箱/手机号</label>
                                <input type="text" id="login-username" placeholder="请输入用户名、邮箱或手机号">
                            </div>
                            <div class="form-group">
                                <label for="login-password">密码</label>
                                <input type="password" id="login-password" placeholder="请输入密码">
                            </div>
                            <div class="form-group">
                                <button id="login-btn" class="primary-btn">登录</button>
                            </div>
                            <div class="form-links">
                                <a href="#" id="forgot-password-link">忘记密码？</a>
                            </div>
                        </div>
                        <div class="auth-form" id="register-form" style="display: none;">
                            <h2>用户注册</h2>
                            <div class="form-group">
                                <label for="register-username">用户名</label>
                                <input type="text" id="register-username" placeholder="请输入用户名">
                            </div>
                            <div class="form-group">
                                <label for="register-email">邮箱</label>
                                <input type="email" id="register-email" placeholder="请输入邮箱">
                            </div>
                            <div class="form-group">
                                <label for="register-phone">手机号</label>
                                <input type="tel" id="register-phone" placeholder="请输入手机号">
                            </div>
                            <div class="form-group">
                                <label for="register-password">密码</label>
                                <input type="password" id="register-password" placeholder="请输入密码">
                                <div id="password-strength" class="password-strength"></div>
                            </div>
                            <div class="form-group">
                                <button id="register-btn" class="primary-btn">注册</button>
                            </div>
                        </div>
                        <div class="auth-form" id="forgot-password-form" style="display: none;">
                            <h2>忘记密码</h2>
                            <div class="form-group">
                                <label for="forgot-email">邮箱</label>
                                <input type="email" id="forgot-email" placeholder="请输入注册时的邮箱">
                            </div>
                            <div class="form-group">
                                <button id="forgot-password-btn" class="primary-btn">发送重置链接</button>
                            </div>
                            <div class="form-links">
                                <a href="#" id="back-to-login">返回登录</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 初始化认证模块
        this.auth.init();
    }
    
    /**
     * 切换认证标签
     * @param {string} tab - 标签名称
     */
    switchAuthTab(tab) {
        const tabs = document.querySelectorAll('.auth-tab');
        const forms = document.querySelectorAll('.auth-form');
        
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.style.display = 'none');
        
        document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
        document.getElementById(`${tab}-form`).style.display = 'block';
    }
    
    /**
     * 设置当前项目
     * @param {Object} project - 项目对象
     */
    setCurrentProject(project) {
        this.currentProject = project;
        if (project) {
            window.location.hash = `tasks/${project._id}`;
        }
    }
    
    /**
     * 渲染消息
     * @param {string} message - 消息内容
     */
    renderMessage(message) {
        const content = document.getElementById('content');
        content.innerHTML = `<div class="message">${message}</div>`;
    }
}

// 初始化应用
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});