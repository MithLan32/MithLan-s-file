// 通知模块
class Notification {
    constructor() {
        this.apiBaseUrl = 'http://localhost:3000/api';
        this.useMock = false; // 使用真实API
        this.notifications = [];
        this.pollingInterval = null;
        this.notificationIds = new Set(); // 用于去重
        this.desktopNotificationsEnabled = false;
        this.initDesktopNotifications();
    }
    
    initDesktopNotifications() {
        // 检查浏览器是否支持桌面通知
        if ('Notification' in window) {
            // 请求权限
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    this.desktopNotificationsEnabled = permission === 'granted';
                });
            } else if (Notification.permission === 'granted') {
                this.desktopNotificationsEnabled = true;
            }
        }
    }
    
    async loadNotifications() {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${this.apiBaseUrl}/notifications`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                throw new Error('加载通知失败');
            }
            const newNotifications = await response.json();
            
            // 去重处理
            const filteredNotifications = newNotifications.filter(notification => {
                const id = notification.id || notification._id;
                if (!this.notificationIds.has(id)) {
                    this.notificationIds.add(id);
                    return true;
                }
                return false;
            });
            
            // 添加新通知到列表开头
            if (filteredNotifications.length > 0) {
                this.notifications = [...filteredNotifications, ...this.notifications];
                // 限制通知数量，只保留最新的50条
                if (this.notifications.length > 50) {
                    this.notifications = this.notifications.slice(0, 50);
                }
            }
        } catch (error) {
            console.error('加载通知失败:', error);
        }
    }
    
    showDesktopNotification(title, options = {}) {
        if (!this.desktopNotificationsEnabled || Notification.permission !== 'granted') {
            console.log('桌面通知未启用或权限未授予');
            return null;
        }
        
        const notification = new Notification(title, {
            body: options.body || '',
            icon: options.icon || '/favicon.ico',
            tag: options.tag || 'default',
            requireInteraction: options.requireInteraction || false,
            ...options
        });
        
        // 点击通知的事件处理
        notification.onclick = () => {
            window.focus();
            notification.close();
            if (options.onClick) {
                options.onClick();
            }
        };
        
        // 自动关闭通知（如果不要求交互）
        if (!options.requireInteraction) {
            setTimeout(() => notification.close(), 5000);
        }
        
        return notification;
    }
    
    notifyTaskAssigned(task, assignee) {
        this.showDesktopNotification('新任务分配', {
            body: `任务"${task.title}"已分配给您。优先级: ${task.priority === 'high' ? '高' : task.priority === 'medium' ? '中' : '低'}`,
            tag: `task-${task._id}`,
            requireInteraction: true,
            onClick: () => {
                // 导航到任务页面
                if (window.app && window.app.showTasks) {
                    window.app.showTasks();
                }
            }
        });
    }
    
    notifyTaskUpdate(task, updateType) {
        const updateMessages = {
            'progress': `任务"${task.title}"进度更新至${task.progress}%`,
            'status': `任务"${task.title}"状态更新为${task.status === 'todo' ? '待办' : task.status === 'in_progress' ? '进行中' : '已完成'}`,
            'comment': `任务"${task.title}"有新评论`
        };
        
        this.showDesktopNotification('任务更新', {
            body: updateMessages[updateType] || `任务"${task.title}"已更新`,
            tag: `task-update-${task._id}`
        });
    }
    
    notifyMergeRequest(branchName, requester) {
        this.showDesktopNotification('合并请求', {
            body: `${requester}提交了从"${branchName}"的合并请求，请审核`,
            tag: 'merge-request',
            requireInteraction: true,
            onClick: () => {
                // 导航到审批页面
                if (window.app && window.app.showApprovals) {
                    window.app.showApprovals();
                }
            }
        });
    }
    
    notifyTaskDueDate(task) {
        const dueDate = new Date(task.dueDate);
        const now = new Date();
        const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
        
        let urgencyText = '';
        if (daysLeft < 0) {
            urgencyText = '已过期！';
        } else if (daysLeft === 0) {
            urgencyText = '今天到期！';
        } else if (daysLeft === 1) {
            urgencyText = '明天到期';
        } else {
            urgencyText = `还有${daysLeft}天到期`;
        }
        
        this.showDesktopNotification('任务截止日期提醒', {
            body: `任务"${task.title}"${urgencyText}`,
            tag: `due-date-${task._id}`,
            requireInteraction: true
        });
    }
    
    async renderNotifications() {
        await this.loadNotifications();
        
        const content = document.getElementById('content');
        
        // 清空content内容，避免重复渲染
        content.innerHTML = '';
        
        // 添加桌面通知权限控制
        const notificationPermission = Notification.permission;
        let permissionHtml = '';
        if (notificationPermission === 'default') {
            permissionHtml = `<button id="enable-desktop-notifications" class="secondary-btn" style="margin-left: 10px;">启用桌面通知</button>`;
        } else if (notificationPermission === 'denied') {
            permissionHtml = `<span style="color: #f44336; font-size: 12px; margin-left: 10px;">桌面通知已被禁用，请在浏览器设置中开启</span>`;
        }
        
        content.innerHTML = `
            <div class="notification-management">
                <button class="back-button" style="margin-right: 10px;">返回</button>
                <h2>通知中心</h2>
                <div style="margin-top: 10px;">
                    <label style="font-size: 14px;">桌面通知:</label>
                    ${permissionHtml}
                </div>
                <div class="notification-list">
                    ${this.notifications.length > 0 ? 
                        this.notifications.map(notification => {
                            const id = notification.id || notification._id;
                            return `
                                <div class="notification-item ${!notification.read ? 'unread' : ''}" data-notification-id="${id}">
                                    <div class="notification-header">
                                        <span class="notification-title">${notification.title}</span>
                                        <span class="notification-time">${this.formatDate(notification.createdAt)}</span>
                                    </div>
                                    <div class="notification-content">${notification.content}</div>
                                    ${!notification.read ? 
                                        `<button class="secondary-btn" onclick="window.app.notification.markAsRead(${id})" style="margin-top: 10px; font-size: 12px; padding: 2px 6px;">标记为已读</button>` : 
                                        ''
                                    }
                                </div>
                            `;
                        }).join('') : 
                        '<p style="text-align: center; padding: 40px;">暂无通知</p>'
                    }
                </div>
            </div>
        `;
        
        // 添加桌面通知启用按钮事件
        const enableBtn = document.getElementById('enable-desktop-notifications');
        if (enableBtn) {
            enableBtn.addEventListener('click', async () => {
                const permission = await Notification.requestPermission();
                this.desktopNotificationsEnabled = permission === 'granted';
                if (permission === 'granted') {
                    this.showDesktopNotification('通知已启用', {
                        body: '您将收到任务分配、进度更新等桌面通知'
                    });
                }
                this.renderNotifications();
            });
        }
        
        // 标记所有通知为已读
        this.markAllAsRead();
    }
    
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    async markAsRead(notificationId) {
        const notification = this.notifications.find(n => (n.id === notificationId) || (n._id === notificationId));
        if (notification) {
            try {
                const response = await fetch(`${this.apiBaseUrl}/notifications/${notificationId}/read`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || '标记失败');
                }
                
                notification.read = true;
                this.renderNotifications();
            } catch (error) {
                console.error('标记通知失败:', error);
            }
        }
    }
    
    markAllAsRead() {
        this.notifications.forEach(notification => {
            if (!notification.read) {
                notification.read = true;
            }
        });
    }
    
    startPolling() {
        // 每30秒轮询一次新通知
        this.pollingInterval = setInterval(async () => {
            await this.loadNotifications();
            this.updateNotificationBadge();
        }, 30000);
    }
    
    updateNotificationBadge() {
        const unreadCount = this.notifications.filter(n => !n.read).length;
        const notificationLink = document.getElementById('nav-notifications');
        
        // 移除旧的徽章
        const oldBadge = notificationLink.querySelector('.notification-badge');
        if (oldBadge) {
            oldBadge.remove();
        }
        
        // 添加新的徽章
        if (unreadCount > 0) {
            const badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.textContent = unreadCount;
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background-color: #dc3545;
                color: white;
                border-radius: 50%;
                width: 16px;
                height: 16px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
            `;
            notificationLink.style.position = 'relative';
            notificationLink.appendChild(badge);
        }
    }
    
    addNotification(title, content, type = 'info') {
        const newNotification = {
            id: Date.now(),
            title,
            content,
            read: false,
            createdAt: new Date().toISOString(),
            type
        };
        
        // 添加到去重集合
        this.notificationIds.add(newNotification.id);
        
        // 添加到通知列表
        this.notifications.unshift(newNotification);
        
        // 限制通知数量，只保留最新的50条
        if (this.notifications.length > 50) {
            this.notifications = this.notifications.slice(0, 50);
        }
        
        this.updateNotificationBadge();
    }
    
    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
    }
}

export default Notification;