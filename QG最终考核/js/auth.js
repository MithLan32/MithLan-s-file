// 认证模块
/**
 * 认证类
 * 负责用户登录、注册、密码强度检查和路由守卫等功能
 */
class Auth {
    /**
     * 构造函数
     */
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.useMock = false; // 使用真实API
        this.resetCode = null; // 重置密码验证码
        this.resetCodeUser = null; // 需要重置密码的用户
        this.setupPasswordStrength();  // 设置密码强度检查
        this.setupRouteGuard();        // 设置路由守卫
        this.setupPasswordToggle();    // 设置密码显示/隐藏切换
        this.loadRememberedCredentials(); // 加载记住的凭证
        this.setupAuthButtons();     // 直接为登录和注册按钮绑定事件
    }
    
    /**
     * 设置模拟数据
     */
    setupMockData() {
        // 模拟用户数据
        // 角色: admin(管理员), leader(项目组长), member(普通成员)
        this.mockUsers = [
            { _id: 1, username: 'admin', password: 'admin', role: 'admin', email: 'admin@example.com', phone: '13800000001' },
            { _id: 2, username: 'leader1', password: 'leader123', role: 'leader', email: 'leader1@example.com', phone: '13800000002' },
            { _id: 3, username: 'user1', password: 'user123', role: 'member', email: 'user1@example.com', phone: '13800000003' },
            { _id: 4, username: 'user2', password: 'user123', role: 'member', email: 'user2@example.com', phone: '13800000004' }
        ];
    }
    
    /**
     * 直接为登录和注册按钮绑定点击事件
     */
    setupAuthButtons() {
        // 已经在main.js中通过事件委托绑定了点击事件，这里不需要重复绑定
    }
    
    /**
     * 设置密码显示/隐藏切换功能
     */
    setupPasswordToggle() {
        // 登录表单密码切换
        const togglePassword = document.getElementById('toggle-password');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('login-password');
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                // 切换图标
                const svg = togglePassword.querySelector('svg');
                if (type === 'text') {
                    svg.innerHTML = `
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                    `;
                } else {
                    svg.innerHTML = `
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                }
            });
        }
        
        // 注册表单密码切换
        const toggleRegisterPassword = document.getElementById('toggle-register-password');
        if (toggleRegisterPassword) {
            toggleRegisterPassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('register-password');
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                // 切换图标
                const svg = toggleRegisterPassword.querySelector('svg');
                if (type === 'text') {
                    svg.innerHTML = `
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                    `;
                } else {
                    svg.innerHTML = `
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                }
            });
        }
        
        // 确认密码切换
        const toggleConfirmPassword = document.getElementById('toggle-confirm-password');
        if (toggleConfirmPassword) {
            toggleConfirmPassword.addEventListener('click', () => {
                const passwordInput = document.getElementById('register-confirm');
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                // 切换图标
                const svg = toggleConfirmPassword.querySelector('svg');
                if (type === 'text') {
                    svg.innerHTML = `
                        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z"></path>
                        <line x1="2" y1="2" x2="22" y2="22"></line>
                    `;
                } else {
                    svg.innerHTML = `
                        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    `;
                }
            });
        }
    }
    
    /**
     * 加载记住的登录凭证
     */
    loadRememberedCredentials() {
        const savedCredentials = localStorage.getItem('rememberedCredentials');
        if (savedCredentials) {
            try {
                const credentials = JSON.parse(savedCredentials);
                document.getElementById('login-username').value = credentials.username;
                document.getElementById('login-password').value = credentials.password;
                document.getElementById('remember-me').checked = true;
            } catch (error) {
                console.error('Failed to load remembered credentials:', error);
            }
        }
    }
    
    /**
     * 保存记住的登录凭证
     * @param {string} username - 用户名
     * @param {string} password - 密码
     */
    saveRememberedCredentials(username, password) {
        if (document.getElementById('remember-me').checked) {
            localStorage.setItem('rememberedCredentials', JSON.stringify({ username, password }));
        } else {
            localStorage.removeItem('rememberedCredentials');
        }
    }
    
    setupPasswordStrength() {
        const passwordInput = document.getElementById('register-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', () => this.checkPasswordStrength(passwordInput.value));
        }
    }
    
    checkPasswordStrength(password) {
        let strength = 0;
        const strengthBar = document.querySelector('.strength-fill');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;
        
        // 长度检查
        if (password.length >= 8) strength += 25;
        // 包含数字
        if (/\d/.test(password)) strength += 25;
        // 包含小写字母
        if (/[a-z]/.test(password)) strength += 25;
        // 包含大写字母
        if (/[A-Z]/.test(password)) strength += 25;
        
        // 更新强度条
        strengthBar.style.width = `${strength}%`;
        
        // 更新强度文本和颜色
        if (strength < 25) {
            strengthBar.style.backgroundColor = '#dc3545';
            strengthText.textContent = '密码强度：弱';
            strengthText.style.color = '#dc3545';
        } else if (strength < 75) {
            strengthBar.style.backgroundColor = '#ffc107';
            strengthText.textContent = '密码强度：中';
            strengthText.style.color = '#ffc107';
        } else {
            strengthBar.style.backgroundColor = '#28a745';
            strengthText.textContent = '密码强度：强';
            strengthText.style.color = '#28a745';
        }
    }
    
    /**
     * 设置路由守卫
     */
    setupRouteGuard() {
        window.addEventListener('hashchange', () => this.checkRouteAccess());
        this.checkRouteAccess();
    }
    
    /**
     * 检查路由访问权限
     */
    checkRouteAccess() {
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const hash = window.location.hash;
        
        // 检查是否需要认证的路由
        const protectedRoutes = ['#projects', '#tasks', '#branches', '#notifications'];
        const requiresAuth = protectedRoutes.some(route => hash.startsWith(route));
        
        if (requiresAuth && !token) {
            // 重定向到登录页
            window.location.hash = '#login';
            this.showError('请先登录');
        }
        
        // 检查权限（根据角色）
        if (token && user) {
            const parsedUser = JSON.parse(user);
            // 可以在这里添加角色权限检查逻辑
        }
    }
    
    /**
     * 用户登录
     */
    async login() {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        
        if (!username || !password) {
            this.showError('请输入用户名和密码');
            return;
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const user = this.mockUsers.find(u => u.username === username && u.password === password);
                if (!user) {
                    throw new Error('用户名或密码错误');
                }
                
                // 模拟token
                const token = 'mock-token-' + Date.now();
                
                // 存储token和用户信息
                localStorage.setItem('token', token);
                localStorage.setItem('user', JSON.stringify({ id: user._id, username: user.username, role: user.role }));
                
                // 保存记住密码
                this.saveRememberedCredentials(username, password);
                
                this.showSuccess('登录成功');
                // 模拟页面刷新
                setTimeout(() => {
                    window.location.hash = '#dashboard';
                    window.location.reload();
                }, 1000);
            } else {
                // 真实后端
                const response = await fetch(`${this.apiBaseUrl}/auth/login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '登录失败');
                }
                
                const data = await response.json();
                
                // 存储token和用户信息
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                // 保存记住密码
                this.saveRememberedCredentials(username, password);
                
                // 刷新页面
                window.location.reload();
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                this.showError('后端服务器未运行，请先启动服务器');
            } else {
                this.showError(error.message || '登录失败，请检查网络连接');
            }
        }
    }
    
    /**
     * 用户注册
     */
    async register() {
        const username = document.getElementById('register-username').value;
        const email = document.getElementById('register-email').value;
        const phone = document.getElementById('register-phone').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        const role = document.getElementById('register-role').value;
        
        if (!username || !password || !confirmPassword) {
            this.showError('请填写所有必填字段');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('两次输入的密码不一致');
            return;
        }
        
        // 验证邮箱格式
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            this.showError('请输入有效的邮箱地址');
            return;
        }
        
        // 验证手机号格式
        if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
            this.showError('请输入有效的手机号');
            return;
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据
                const existingUser = this.mockUsers.find(u => u.username === username);
                if (existingUser) {
                    throw new Error('用户名已存在');
                }
                
                // 创建新用户
                const newUser = {
                    _id: this.mockUsers.length + 1,
                    username,
                    password,
                    role: role || 'member'
                };
                
                // 添加到模拟用户列表
                this.mockUsers.push(newUser);
                
                this.showSuccess('注册成功，请登录');
                // 切换到登录标签
                document.getElementById('login-tab').click();
            } else {
                // 真实后端
                const response = await fetch(`${this.apiBaseUrl}/auth/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, phone, password, role })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '注册失败');
                }
                
                this.showSuccess('注册成功，请登录');
                // 切换到登录标签
                document.getElementById('login-tab').click();
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                this.showError('后端服务器未运行，请先启动服务器');
            } else {
                this.showError(error.message || '注册失败，请检查网络连接');
            }
        }
    }
    
    /**
     * 用户退出登录
     */
    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.reload();
    }
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     */
    showError(message) {
        // 创建错误消息元素
        const errorElement = document.createElement('div');
        errorElement.className = 'error-message';
        errorElement.textContent = message;
        
        // 添加到登录/注册表单上方
        const authCard = document.querySelector('.auth-card');
        const firstChild = authCard.firstChild;
        authCard.insertBefore(errorElement, firstChild);
        
        // 3秒后移除错误消息
        setTimeout(() => {
            errorElement.remove();
        }, 3000);
    }
    
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     */
    showSuccess(message) {
        // 创建成功消息元素
        const successElement = document.createElement('div');
        successElement.className = 'success-message';
        successElement.textContent = message;
        
        // 添加到登录/注册表单上方
        const authCard = document.querySelector('.auth-card');
        const firstChild = authCard.firstChild;
        authCard.insertBefore(successElement, firstChild);
        
        // 3秒后移除成功消息
        setTimeout(() => {
            successElement.remove();
        }, 3000);
    }
    
    /**
     * 切换到找回密码表单
     */
    showForgotPasswordForm() {
        document.getElementById('login-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('forgot-password-form').style.display = 'block';
    }
    
    /**
     * 返回登录表单
     */
    backToLogin() {
        document.getElementById('forgot-password-form').style.display = 'none';
        document.getElementById('register-form').style.display = 'none';
        document.getElementById('login-form').style.display = 'block';
        document.getElementById('reset-code-section').style.display = 'none';
        this.resetCode = null;
        this.resetCodeUser = null;
    }
    
    /**
     * 发送重置密码验证码
     */
    async sendResetCode() {
        const username = document.getElementById('forgot-username').value;
        
        if (!username) {
            this.showError('请输入用户名、邮箱或手机号');
            return;
        }
        
        try {
            if (this.useMock) {
                // 使用模拟数据查找用户
                const user = this.mockUsers.find(u => 
                    u.username === username || 
                    u.email === username || 
                    u.phone === username
                );
                
                if (!user) {
                    throw new Error('用户不存在');
                }
                
                // 生成6位随机验证码
                this.resetCode = Math.floor(100000 + Math.random() * 900000).toString();
                this.resetCodeUser = user;
                
                // 模拟发送验证码（在实际项目中应该通过邮件或短信发送）
                console.log(`验证码: ${this.resetCode}`);
                this.showSuccess(`验证码已发送! 模拟验证码: ${this.resetCode}`);
                
                // 显示验证码输入部分
                document.getElementById('reset-code-section').style.display = 'block';
            } else {
                // 真实后端
                const response = await fetch(`${this.apiBaseUrl}/auth/forgot-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '发送验证码失败');
                }
                
                this.showSuccess('验证码已发送');
                document.getElementById('reset-code-section').style.display = 'block';
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                this.showError('后端服务器未运行，请先启动服务器');
            } else {
                this.showError(error.message || '发送验证码失败');
            }
        }
    }
    
    /**
     * 重置密码
     */
    async resetPassword() {
        const code = document.getElementById('reset-code').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        
        if (!code || !newPassword || !confirmNewPassword) {
            this.showError('请填写所有必填字段');
            return;
        }
        
        if (newPassword !== confirmNewPassword) {
            this.showError('两次输入的密码不一致');
            return;
        }
        
        // 密码长度检查
        if (newPassword.length < 6) {
            this.showError('密码长度至少为6位');
            return;
        }
        
        try {
            if (this.useMock) {
                // 验证验证码
                if (code !== this.resetCode || !this.resetCodeUser) {
                    throw new Error('验证码错误或已过期');
                }
                
                // 更新用户密码
                this.resetCodeUser.password = newPassword;
                
                this.showSuccess('密码重置成功，请登录');
                this.backToLogin();
            } else {
                // 真实后端
                const response = await fetch(`${this.apiBaseUrl}/auth/reset-password`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ code, newPassword, confirmNewPassword })
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '重置密码失败');
                }
                
                this.showSuccess('密码重置成功，请登录');
                this.backToLogin();
            }
        } catch (error) {
            if (error.message.includes('Failed to fetch')) {
                this.showError('后端服务器未运行，请先启动服务器');
            } else {
                this.showError(error.message || '重置密码失败');
            }
        }
    }
}

export default Auth;