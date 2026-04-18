const http = require('http');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// JWT密钥
const JWT_SECRET = 'your-secret-key';

// 数据库连接
let db;
let useFileSystem = false;

// 尝试导入mysql2模块
let mysql;
try {
    mysql = require('mysql2/promise');
    console.log('mysql2 module loaded successfully');
} catch (error) {
    console.error('Failed to load mysql2 module:', error);
    console.log('Will use file system storage as fallback');
    useFileSystem = true;
}

// MySQL连接信息
const mysqlConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'qg_collaboration',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// 初始化数据库
function initDb() {
    // 直接使用文件系统存储，避免MySQL连接问题
    console.log('Using file system storage');
    switchToFileSystem();
}

// 简化的switchToFileSystem函数
function switchToFileSystem() {
    // 数据存储
    const dataFile = 'data.json';
    let data = {
        users: [],
        projects: [],
        tasks: [],
        branches: [],
        commits: [],
        notifications: [],
        teams: [],
        resetCodes: [],
        history: []
    };

    // 加载数据
    function loadData() {
        try {
            if (fs.existsSync(dataFile)) {
                const content = fs.readFileSync(dataFile, 'utf8');
                data = JSON.parse(content);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            // 使用默认数据
            initDefaultData();
        }
    }

    // 保存数据
    function saveData() {
        try {
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    // 执行查询的辅助函数
    function query(table, query) {
        return new Promise((resolve) => {
            let results = data[table];
            
            if (query) {
                results = results.filter(item => {
                    // 处理$or操作符
                    if (query.$or) {
                        return query.$or.some(condition => {
                            for (const [key, value] of Object.entries(condition)) {
                                if (item[key] === value) {
                                    return true;
                                }
                            }
                            return false;
                        });
                    }
                    
                    // 处理普通查询
                    for (const [key, value] of Object.entries(query)) {
                        if (key !== '$or' && item[key] !== value) {
                            return false;
                        }
                    }
                    return true;
                });
            }
            
            resolve(results);
        });
    }

    // 插入数据
    function insert(table, item) {
        return new Promise((resolve) => {
            // 生成ID
            const lastItem = data[table].length > 0 ? data[table][data[table].length - 1] : null;
            const nextId = lastItem ? lastItem._id + 1 : 1;
            item._id = nextId;
            
            data[table].push(item);
            saveData();
            resolve(item);
        });
    }

    // 更新数据
    function update(table, id, updates) {
        return new Promise((resolve) => {
            const index = data[table].findIndex(item => item._id === id);
            if (index !== -1) {
                data[table][index] = { ...data[table][index], ...updates };
                saveData();
                resolve(data[table][index]);
            } else {
                resolve(null);
            }
        });
    }

    // 删除数据
    function remove(table, id) {
        return new Promise((resolve) => {
            const initialLength = data[table].length;
            data[table] = data[table].filter(item => item._id !== id);
            if (data[table].length !== initialLength) {
                saveData();
                resolve({ affectedRows: 1 });
            } else {
                resolve({ affectedRows: 0 });
            }
        });
    }

    // 模拟db.execute方法，使其行为与MySQL一致
    db = {
        execute: async (sql, params) => {
            // 简单的SQL解析和转换
            if (sql.startsWith('SELECT')) {
                // 处理SELECT查询
                if (sql.includes('FROM users WHERE')) {
                    if (sql.includes('username = ? OR email = ? OR phone = ?')) {
                        const [username] = params;
                        const results = data.users.filter(user => 
                            user.username === username || user.email === username || user.phone === username
                        );
                        return [results];
                    } else if (sql.includes('username = ?')) {
                        const [username] = params;
                        const results = data.users.filter(user => user.username === username);
                        return [results];
                    } else if (sql.includes('email = ?')) {
                        const [email] = params;
                        const results = data.users.filter(user => user.email === email);
                        return [results];
                    } else if (sql.includes('phone = ?')) {
                        const [phone] = params;
                        const results = data.users.filter(user => user.phone === phone);
                        return [results];
                    } else if (sql.includes('id = ?')) {
                        const [id] = params;
                        const results = data.users.filter(user => user._id === id);
                        return [results];
                    } else if (sql.includes('SELECT COUNT(*) as count FROM users')) {
                        return [[{ count: data.users.length }]];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM users')) {
                        const maxId = data.users.length > 0 ? Math.max(...data.users.map(u => u._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM projects')) {
                    if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.projects.filter(project => project._id === id);
                        return [results];
                    } else if (sql.includes('SELECT * FROM projects')) {
                        return [data.projects];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM projects')) {
                        const maxId = data.projects.length > 0 ? Math.max(...data.projects.map(p => p._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM tasks')) {
                    if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.tasks.filter(task => task.projectId === projectId);
                        return [results];
                    } else if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.tasks.filter(task => task._id === id);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM tasks')) {
                        const maxId = data.tasks.length > 0 ? Math.max(...data.tasks.map(t => t._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM branches')) {
                    if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.branches.filter(branch => branch.projectId === projectId);
                        return [results];
                    } else if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.branches.filter(branch => branch._id === id);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM branches')) {
                        const maxId = data.branches.length > 0 ? Math.max(...data.branches.map(b => b._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM commits')) {
                    if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.commits.filter(commit => commit.projectId === projectId);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM commits')) {
                        const maxId = data.commits.length > 0 ? Math.max(...data.commits.map(c => c._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM notifications')) {
                    if (sql.includes('WHERE userId = ?')) {
                        const [userId] = params;
                        const results = data.notifications.filter(notification => notification.userId === userId);
                        return [results];
                    } else if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.notifications.filter(notification => notification._id === id);
                        return [results];
                    }
                } else if (sql.includes('FROM teams')) {
                    if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.teams.filter(team => team._id === id);
                        return [results];
                    } else if (sql.includes('SELECT * FROM teams')) {
                        return [data.teams];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM teams')) {
                        const maxId = data.teams.length > 0 ? Math.max(...data.teams.map(t => t._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM resetCodes')) {
                    if (sql.includes('WHERE code = ?')) {
                        const [code] = params;
                        const results = data.resetCodes.filter(codeItem => codeItem.code === code);
                        return [results];
                    }
                } else if (sql.includes('FROM history')) {
                    if (sql.includes('WHERE taskId = ?')) {
                        const [taskId] = params;
                        const results = data.history.filter(h => h.taskId === taskId);
                        return [results];
                    } else if (sql.includes('WHERE branchId = ?')) {
                        const [branchId] = params;
                        const results = data.history.filter(h => h.branchId === branchId);
                        return [results];
                    } else if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.history.filter(h => h.projectId === projectId);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM history')) {
                        const maxId = data.history.length > 0 ? Math.max(...data.history.map(h => h._id)) : null;
                        return [[{ maxId }]];
                    }
                }
            } else if (sql.startsWith('INSERT')) {
                // 处理INSERT语句
                if (sql.includes('INSERT INTO users')) {
                    const [id, username, email, phone, password, role] = params;
                    const user = { _id: id, username, email, phone, password, role };
                    data.users.push(user);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO projects')) {
                    const [id, name, description, createdAt, members] = params;
                    const project = { _id: id, name, description, createdAt, members: JSON.parse(members) };
                    data.projects.push(project);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO tasks')) {
                    const [id, projectId, title, description, status, priority, assignee, dueDate, tag, branch, progress, timeSpent, dependencies, comment] = params;
                    const task = { 
                        _id: id, 
                        projectId, 
                        title, 
                        description, 
                        status, 
                        priority, 
                        assignee, 
                        dueDate, 
                        tag, 
                        branch, 
                        progress, 
                        timeSpent, 
                        dependencies: JSON.parse(dependencies), 
                        comment 
                    };
                    data.tasks.push(task);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO branches')) {
                    const [id, projectId, name, type, parentId, createdAt, lastCommit] = params;
                    const branch = { _id: id, projectId, name, type, parentId, createdAt, lastCommit };
                    data.branches.push(branch);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO commits')) {
                    const [id, projectId, branchId, hash, message, author, date] = params;
                    const commit = { _id: id, projectId, branchId, hash, message, author, date };
                    data.commits.push(commit);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO notifications')) {
                    const [id, userId, title, content, read, type, createdAt] = params;
                    const notification = { _id: id, userId, title, content, read, type, createdAt };
                    data.notifications.push(notification);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO teams')) {
                    const [id, name, description, avatar, members, createdAt] = params;
                    const team = { _id: id, name, description, avatar, members: JSON.parse(members), createdAt };
                    data.teams.push(team);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO resetCodes')) {
                    const [code, userId, expiresAt, createdAt] = params;
                    const resetCode = { code, userId, expiresAt, createdAt };
                    data.resetCodes.push(resetCode);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO history')) {
                    const [id, projectId, taskId, branchId, operationType, operationDescription, operator, timestamp, oldValue, newValue] = params;
                    const history = { 
                        _id: id, 
                        projectId, 
                        taskId, 
                        branchId, 
                        operationType, 
                        operationDescription, 
                        operator, 
                        timestamp, 
                        oldValue, 
                        newValue 
                    };
                    data.history.push(history);
                    saveData();
                    return [{ affectedRows: 1 }];
                }
            } else if (sql.startsWith('UPDATE')) {
                // 处理UPDATE语句
                if (sql.includes('UPDATE users SET password = ? WHERE _id = ?')) {
                    const [password, id] = params;
                    const userIndex = data.users.findIndex(user => user._id === id);
                    if (userIndex !== -1) {
                        data.users[userIndex].password = password;
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE projects SET')) {
                    const [name, description, id] = params;
                    const projectIndex = data.projects.findIndex(project => project._id === id);
                    if (projectIndex !== -1) {
                        data.projects[projectIndex].name = name;
                        data.projects[projectIndex].description = description;
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE tasks SET')) {
                    // 处理动态更新
                    const taskId = params[params.length - 1];
                    const taskIndex = data.tasks.findIndex(task => task._id === taskId);
                    if (taskIndex !== -1) {
                        // 构建更新对象
                        const updates = {};
                        const fields = sql.match(/SET (.*) WHERE/)[1].split(',').map(field => field.trim().split(' = ?')[0]);
                        for (let i = 0; i < fields.length; i++) {
                            const field = fields[i];
                            const value = params[i];
                            if (field === 'dependencies') {
                                updates[field] = JSON.parse(value);
                            } else {
                                updates[field] = value;
                            }
                        }
                        data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE notifications SET read = true WHERE _id = ?')) {
                    const [id] = params;
                    const notificationIndex = data.notifications.findIndex(notification => notification._id === id);
                    if (notificationIndex !== -1) {
                        data.notifications[notificationIndex].read = true;
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE teams SET')) {
                    // 处理动态更新
                    const teamId = params[params.length - 1];
                    const teamIndex = data.teams.findIndex(team => team._id === teamId);
                    if (teamIndex !== -1) {
                        // 构建更新对象
                        const updates = {};
                        const fields = sql.match(/SET (.*) WHERE/)[1].split(',').map(field => field.trim().split(' = ?')[0]);
                        for (let i = 0; i < fields.length; i++) {
                            const field = fields[i];
                            const value = params[i];
                            if (field === 'members') {
                                updates[field] = JSON.parse(value);
                            } else {
                                updates[field] = value;
                            }
                        }
                        data.teams[teamIndex] = { ...data.teams[teamIndex], ...updates };
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                }
            } else if (sql.startsWith('DELETE')) {
                // 处理DELETE语句
                if (sql.includes('DELETE FROM users WHERE')) {
                    const [id] = params;
                    const initialLength = data.users.length;
                    data.users = data.users.filter(user => user._id !== id);
                    if (data.users.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('DELETE FROM projects WHERE _id = ?')) {
                    const [id] = params;
                    const initialLength = data.projects.length;
                    data.projects = data.projects.filter(project => project._id !== id);
                    if (data.projects.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('DELETE FROM resetCodes WHERE code = ?')) {
                    const [code] = params;
                    const initialLength = data.resetCodes.length;
                    data.resetCodes = data.resetCodes.filter(codeItem => codeItem.code !== code);
                    if (data.resetCodes.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('DELETE FROM teams WHERE _id = ?')) {
                    const [id] = params;
                    const initialLength = data.teams.length;
                    data.teams = data.teams.filter(team => team._id !== id);
                    if (data.teams.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                }
            } else if (sql.startsWith('CREATE DATABASE') || sql.startsWith('USE')) {
                // 忽略这些语句，因为文件系统存储不需要
                return [];
            }
            
            // 默认返回空结果
            return [[]];
        }
    }

    // 重新绑定全局函数
    global.query = query;
    global.insert = insert;
    global.update = update;
    global.remove = remove;

    // 加载数据
    loadData();
    
    // 检查是否需要初始化数据
    if (data.users.length === 0) {
        initDefaultData();
    }
    
    console.log('File system storage initialized');
}

// 简化的initDefaultData函数
function initDefaultData() {
    // 初始化用户
    const users = [
        { _id: 1, username: 'admin', email: 'admin@example.com', phone: '13800138000', password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', role: 'admin' },
        { _id: 2, username: 'user1', email: 'user1@example.com', phone: '13800138001', password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', role: 'leader' },
        { _id: 3, username: 'user2', email: 'user2@example.com', phone: '13800138002', password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', role: 'member' },
        { _id: 4, username: 'user3', email: 'user3@example.com', phone: '13800138003', password: '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', role: 'member' }
    ];
    
    // 初始化项目
    const projects = [
        { _id: 1, name: 'QG协作平台', description: '团队协作与版本管理平台', createdAt: '2026-04-01', members: ['admin', 'user1', 'user2'] },
        { _id: 2, name: '移动应用开发', description: '跨平台移动应用', createdAt: '2026-04-02', members: ['admin', 'user3'] }
    ];
    
    // 初始化任务
    const tasks = [
        { _id: 1, projectId: 1, title: '完成用户认证功能', description: '实现登录、注册和权限控制', status: 'todo', priority: 'high', assignee: 'admin', dueDate: '2026-04-10', tag: '功能开发', branch: 'main', progress: 0, timeSpent: 0, dependencies: [], comment: '' },
        { _id: 2, projectId: 1, title: '开发项目管理页面', description: '实现项目的创建、编辑和删除', status: 'in_progress', priority: 'medium', assignee: 'user1', dueDate: '2026-04-15', tag: '功能开发', branch: 'feature-auth', progress: 50, timeSpent: 7200, dependencies: [], comment: '' },
        { _id: 3, projectId: 1, title: '测试任务看板', description: '测试任务拖拽和状态更新', status: 'done', priority: 'low', assignee: 'user2', dueDate: '2026-04-05', tag: '测试', branch: 'main', progress: 100, timeSpent: 3600, dependencies: [], comment: '' }
    ];
    
    // 初始化分支
    const branches = [
        { _id: 1, projectId: 1, name: 'main', type: 'main', parentId: null, createdAt: '2026-04-01', lastCommit: 'Initial commit' },
        { _id: 2, projectId: 1, name: 'feature-auth', type: 'feature', parentId: 1, createdAt: '2026-04-02', lastCommit: 'Add login functionality' },
        { _id: 3, projectId: 1, name: 'hotfix-bug', type: 'hotfix', parentId: 1, createdAt: '2026-04-03', lastCommit: 'Fix critical bug' }
    ];
    
    // 初始化提交
    const commits = [
        { _id: 1, projectId: 1, branchId: 1, hash: 'abc123', message: 'Initial commit', author: 'admin', date: '2026-04-01 10:00:00' },
        { _id: 2, projectId: 1, branchId: 2, hash: 'def456', message: 'Add login functionality', author: 'user1', date: '2026-04-02 14:30:00' },
        { _id: 3, projectId: 1, branchId: 3, hash: 'ghi789', message: 'Fix critical bug', author: 'admin', date: '2026-04-03 09:15:00' }
    ];
    
    // 初始化通知
    const notifications = [
        { _id: 1, userId: 1, title: '任务分配', content: '您被分配了新任务：完成用户认证功能', read: false, type: 'task', createdAt: '2026-04-07 10:00:00' },
        { _id: 2, userId: 1, title: '分支合并', content: '分支 feature-auth 已成功合并到 main', read: false, type: 'branch', createdAt: '2026-04-07 09:30:00' },
        { _id: 3, userId: 1, title: '项目更新', content: '项目 QG协作平台 已更新', read: true, type: 'project', createdAt: '2026-04-06 16:00:00' }
    ];
    
    // 初始化团队
    const teams = [
        { _id: 1, name: '开发团队', description: '负责项目开发的团队', avatar: 'https://via.placeholder.com/50', members: ['admin', 'user1', 'user2'], createdAt: '2026-04-01' },
        { _id: 2, name: '测试团队', description: '负责项目测试的团队', avatar: 'https://via.placeholder.com/50', members: ['admin', 'user3'], createdAt: '2026-04-02' }
    ];
    
    // 初始化历史记录
    const history = [
        { _id: 1, projectId: 1, taskId: 1, branchId: null, operationType: 'create', operationDescription: '创建任务', operator: 'admin', timestamp: '2026-04-07 10:00:00', oldValue: '{}', newValue: '{"title": "完成用户认证功能", "status": "todo"}' },
        { _id: 2, projectId: 1, taskId: 2, branchId: null, operationType: 'create', operationDescription: '创建任务', operator: 'admin', timestamp: '2026-04-07 10:05:00', oldValue: '{}', newValue: '{"title": "开发项目管理页面", "status": "in_progress"}' },
        { _id: 3, projectId: 1, taskId: 3, branchId: null, operationType: 'create', operationDescription: '创建任务', operator: 'admin', timestamp: '2026-04-07 10:10:00', oldValue: '{}', newValue: '{"title": "测试任务看板", "status": "done"}' },
        { _id: 4, projectId: 1, taskId: null, branchId: 2, operationType: 'create', operationDescription: '创建分支', operator: 'user1', timestamp: '2026-04-07 11:00:00', oldValue: '{}', newValue: '{"name": "feature-auth", "type": "feature"}' },
        { _id: 5, projectId: 1, taskId: null, branchId: 3, operationType: 'create', operationDescription: '创建分支', operator: 'admin', timestamp: '2026-04-07 11:30:00', oldValue: '{}', newValue: '{"name": "hotfix-bug", "type": "hotfix"}' },
        { _id: 6, projectId: 1, taskId: 2, branchId: null, operationType: 'update', operationDescription: '更新任务状态', operator: 'user1', timestamp: '2026-04-07 14:00:00', oldValue: '{"status": "todo"}', newValue: '{"status": "in_progress"}' }
    ];
    
    // 保存数据
    const data = {
        users,
        projects,
        tasks,
        branches,
        commits,
        notifications,
        teams,
        resetCodes: [],
        history
    };
    
    fs.writeFileSync('data.json', JSON.stringify(data, null, 2));
    console.log('Default data initialized');
}

// 创建表结构
async function createTables() {
    // 创建用户表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            username VARCHAR(50) UNIQUE,
            email VARCHAR(100) UNIQUE,
            phone VARCHAR(20) UNIQUE,
            password VARCHAR(255),
            role VARCHAR(20)
        )
    `);
    
    // 创建项目表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS projects (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            name VARCHAR(100),
            description TEXT,
            createdAt DATE,
            members TEXT
        )
    `);
    
    // 创建任务表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            projectId INT,
            title VARCHAR(100),
            description TEXT,
            status VARCHAR(20),
            priority VARCHAR(20),
            assignee VARCHAR(50),
            dueDate DATE,
            tag VARCHAR(50),
            branch VARCHAR(50),
            progress INT,
            timeSpent INT,
            dependencies TEXT,
            comment TEXT
        )
    `);
    
    // 创建分支表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS branches (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            projectId INT,
            name VARCHAR(50),
            type VARCHAR(20),
            parentId INT,
            createdAt DATE,
            lastCommit TEXT
        )
    `);
    
    // 创建提交表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS commits (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            projectId INT,
            branchId INT,
            hash VARCHAR(20),
            message TEXT,
            author VARCHAR(50),
            date DATETIME
        )
    `);
    
    // 创建通知表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            userId INT,
            title VARCHAR(100),
            content TEXT,
            read BOOLEAN,
            type VARCHAR(20),
            createdAt DATETIME
        )
    `);
    
    // 创建团队表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS teams (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            name VARCHAR(100),
            description TEXT,
            avatar VARCHAR(255),
            members TEXT,
            createdAt DATE
        )
    `);
    
    // 创建重置码表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS resetCodes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            code VARCHAR(10),
            userId INT,
            expiresAt BIGINT,
            createdAt DATETIME
        )
    `);
    
    // 创建历史记录表
    await db.execute(`
        CREATE TABLE IF NOT EXISTS history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            _id INT UNIQUE,
            projectId INT,
            taskId INT,
            branchId INT,
            operationType VARCHAR(50),
            operationDescription TEXT,
            operator VARCHAR(50),
            timestamp DATETIME,
            oldValue TEXT,
            newValue TEXT
        )
    `);
}

// 切换到文件系统存储
function switchToFileSystem() {
    // 数据存储
    const dataFile = 'data.json';
    let data = {
        users: [],
        projects: [],
        tasks: [],
        branches: [],
        commits: [],
        notifications: [],
        teams: [],
        resetCodes: [],
        history: []
    };

    // 加载数据
    function loadData() {
        try {
            if (fs.existsSync(dataFile)) {
                const content = fs.readFileSync(dataFile, 'utf8');
                data = JSON.parse(content);
            }
        } catch (error) {
            console.error('Failed to load data:', error);
            // 使用默认数据
            initDefaultData();
        }
    }

    // 保存数据
    function saveData() {
        try {
            fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
        } catch (error) {
            console.error('Failed to save data:', error);
        }
    }

    // 执行查询的辅助函数
    function query(table, query) {
        return new Promise((resolve) => {
            let results = data[table];
            
            if (query) {
                results = results.filter(item => {
                    // 处理$or操作符
                    if (query.$or) {
                        return query.$or.some(condition => {
                            for (const [key, value] of Object.entries(condition)) {
                                if (item[key] === value) {
                                    return true;
                                }
                            }
                            return false;
                        });
                    }
                    
                    // 处理普通查询
                    for (const [key, value] of Object.entries(query)) {
                        if (key !== '$or' && item[key] !== value) {
                            return false;
                        }
                    }
                    return true;
                });
            }
            
            resolve(results);
        });
    }

    // 插入数据
    function insert(table, item) {
        return new Promise((resolve) => {
            // 生成ID
            const lastItem = data[table].length > 0 ? data[table][data[table].length - 1] : null;
            const nextId = lastItem ? lastItem._id + 1 : 1;
            item._id = nextId;
            
            data[table].push(item);
            saveData();
            resolve(item);
        });
    }

    // 更新数据
    function update(table, id, updates) {
        return new Promise((resolve) => {
            const index = data[table].findIndex(item => item._id === id);
            if (index !== -1) {
                data[table][index] = { ...data[table][index], ...updates };
                saveData();
                resolve(data[table][index]);
            } else {
                resolve(null);
            }
        });
    }

    // 删除数据
    function remove(table, id) {
        return new Promise((resolve) => {
            const initialLength = data[table].length;
            data[table] = data[table].filter(item => item._id !== id);
            if (data[table].length !== initialLength) {
                saveData();
                resolve({ affectedRows: 1 });
            } else {
                resolve({ affectedRows: 0 });
            }
        });
    }

    // 模拟db.execute方法，使其行为与MySQL一致
    db = {
        execute: async (sql, params) => {
            // 简单的SQL解析和转换
            if (sql.startsWith('SELECT')) {
                // 处理SELECT查询
                if (sql.includes('FROM users WHERE')) {
                    if (sql.includes('username = ? OR email = ? OR phone = ?')) {
                        const [username] = params;
                        const results = data.users.filter(user => 
                            user.username === username || user.email === username || user.phone === username
                        );
                        return [results];
                    } else if (sql.includes('username = ?')) {
                        const [username] = params;
                        const results = data.users.filter(user => user.username === username);
                        return [results];
                    } else if (sql.includes('email = ?')) {
                        const [email] = params;
                        const results = data.users.filter(user => user.email === email);
                        return [results];
                    } else if (sql.includes('phone = ?')) {
                        const [phone] = params;
                        const results = data.users.filter(user => user.phone === phone);
                        return [results];
                    } else if (sql.includes('id = ?')) {
                        const [id] = params;
                        const results = data.users.filter(user => user._id === id);
                        return [results];
                    } else if (sql.includes('SELECT COUNT(*) as count FROM users')) {
                        return [[{ count: data.users.length }]];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM users')) {
                        const maxId = data.users.length > 0 ? Math.max(...data.users.map(u => u._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM projects')) {
                    if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.projects.filter(project => project._id === id);
                        return [results];
                    } else if (sql.includes('SELECT * FROM projects')) {
                        return [data.projects];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM projects')) {
                        const maxId = data.projects.length > 0 ? Math.max(...data.projects.map(p => p._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM tasks')) {
                    if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.tasks.filter(task => task.projectId === projectId);
                        return [results];
                    } else if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.tasks.filter(task => task._id === id);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM tasks')) {
                        const maxId = data.tasks.length > 0 ? Math.max(...data.tasks.map(t => t._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM branches')) {
                    if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.branches.filter(branch => branch.projectId === projectId);
                        return [results];
                    } else if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.branches.filter(branch => branch._id === id);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM branches')) {
                        const maxId = data.branches.length > 0 ? Math.max(...data.branches.map(b => b._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM commits')) {
                    if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.commits.filter(commit => commit.projectId === projectId);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM commits')) {
                        const maxId = data.commits.length > 0 ? Math.max(...data.commits.map(c => c._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM notifications')) {
                    if (sql.includes('WHERE userId = ?')) {
                        const [userId] = params;
                        const results = data.notifications.filter(notification => notification.userId === userId);
                        return [results];
                    } else if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.notifications.filter(notification => notification._id === id);
                        return [results];
                    }
                } else if (sql.includes('FROM teams')) {
                    if (sql.includes('WHERE _id = ?')) {
                        const [id] = params;
                        const results = data.teams.filter(team => team._id === id);
                        return [results];
                    } else if (sql.includes('SELECT * FROM teams')) {
                        return [data.teams];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM teams')) {
                        const maxId = data.teams.length > 0 ? Math.max(...data.teams.map(t => t._id)) : null;
                        return [[{ maxId }]];
                    }
                } else if (sql.includes('FROM resetCodes')) {
                    if (sql.includes('WHERE code = ?')) {
                        const [code] = params;
                        const results = data.resetCodes.filter(codeItem => codeItem.code === code);
                        return [results];
                    }
                } else if (sql.includes('FROM history')) {
                    if (sql.includes('WHERE taskId = ?')) {
                        const [taskId] = params;
                        const results = data.history.filter(h => h.taskId === taskId);
                        return [results];
                    } else if (sql.includes('WHERE branchId = ?')) {
                        const [branchId] = params;
                        const results = data.history.filter(h => h.branchId === branchId);
                        return [results];
                    } else if (sql.includes('WHERE projectId = ?')) {
                        const [projectId] = params;
                        const results = data.history.filter(h => h.projectId === projectId);
                        return [results];
                    } else if (sql.includes('SELECT MAX(_id) as maxId FROM history')) {
                        const maxId = data.history.length > 0 ? Math.max(...data.history.map(h => h._id)) : null;
                        return [[{ maxId }]];
                    }
                }
            } else if (sql.startsWith('INSERT')) {
                // 处理INSERT语句
                if (sql.includes('INSERT INTO users')) {
                    const [id, username, email, phone, password, role] = params;
                    const user = { _id: id, username, email, phone, password, role };
                    data.users.push(user);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO projects')) {
                    const [id, name, description, createdAt, members] = params;
                    const project = { _id: id, name, description, createdAt, members: JSON.parse(members) };
                    data.projects.push(project);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO tasks')) {
                    const [id, projectId, title, description, status, priority, assignee, dueDate, tag, branch, progress, timeSpent, dependencies, comment] = params;
                    const task = { 
                        _id: id, 
                        projectId, 
                        title, 
                        description, 
                        status, 
                        priority, 
                        assignee, 
                        dueDate, 
                        tag, 
                        branch, 
                        progress, 
                        timeSpent, 
                        dependencies: JSON.parse(dependencies), 
                        comment 
                    };
                    data.tasks.push(task);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO branches')) {
                    const [id, projectId, name, type, parentId, createdAt, lastCommit] = params;
                    const branch = { _id: id, projectId, name, type, parentId, createdAt, lastCommit };
                    data.branches.push(branch);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO commits')) {
                    const [id, projectId, branchId, hash, message, author, date] = params;
                    const commit = { _id: id, projectId, branchId, hash, message, author, date };
                    data.commits.push(commit);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO notifications')) {
                    const [id, userId, title, content, read, type, createdAt] = params;
                    const notification = { _id: id, userId, title, content, read, type, createdAt };
                    data.notifications.push(notification);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO teams')) {
                    const [id, name, description, avatar, members, createdAt] = params;
                    const team = { _id: id, name, description, avatar, members: JSON.parse(members), createdAt };
                    data.teams.push(team);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO resetCodes')) {
                    const [code, userId, expiresAt, createdAt] = params;
                    const resetCode = { code, userId, expiresAt, createdAt };
                    data.resetCodes.push(resetCode);
                    saveData();
                    return [{ affectedRows: 1 }];
                } else if (sql.includes('INSERT INTO history')) {
                    const [id, projectId, taskId, branchId, operationType, operationDescription, operator, timestamp, oldValue, newValue] = params;
                    const history = { 
                        _id: id, 
                        projectId, 
                        taskId, 
                        branchId, 
                        operationType, 
                        operationDescription, 
                        operator, 
                        timestamp, 
                        oldValue, 
                        newValue 
                    };
                    data.history.push(history);
                    saveData();
                    return [{ affectedRows: 1 }];
                }
            } else if (sql.startsWith('UPDATE')) {
                // 处理UPDATE语句
                if (sql.includes('UPDATE users SET password = ? WHERE _id = ?')) {
                    const [password, id] = params;
                    const userIndex = data.users.findIndex(user => user._id === id);
                    if (userIndex !== -1) {
                        data.users[userIndex].password = password;
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE projects SET')) {
                    const [name, description, id] = params;
                    const projectIndex = data.projects.findIndex(project => project._id === id);
                    if (projectIndex !== -1) {
                        data.projects[projectIndex].name = name;
                        data.projects[projectIndex].description = description;
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE tasks SET')) {
                    // 处理动态更新
                    const taskId = params[params.length - 1];
                    const taskIndex = data.tasks.findIndex(task => task._id === taskId);
                    if (taskIndex !== -1) {
                        // 构建更新对象
                        const updates = {};
                        const fields = sql.match(/SET (.*) WHERE/)[1].split(',').map(field => field.trim().split(' = ?')[0]);
                        for (let i = 0; i < fields.length; i++) {
                            const field = fields[i];
                            const value = params[i];
                            if (field === 'dependencies') {
                                updates[field] = JSON.parse(value);
                            } else {
                                updates[field] = value;
                            }
                        }
                        data.tasks[taskIndex] = { ...data.tasks[taskIndex], ...updates };
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE notifications SET read = true WHERE _id = ?')) {
                    const [id] = params;
                    const notificationIndex = data.notifications.findIndex(notification => notification._id === id);
                    if (notificationIndex !== -1) {
                        data.notifications[notificationIndex].read = true;
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('UPDATE teams SET')) {
                    // 处理动态更新
                    const teamId = params[params.length - 1];
                    const teamIndex = data.teams.findIndex(team => team._id === teamId);
                    if (teamIndex !== -1) {
                        // 构建更新对象
                        const updates = {};
                        const fields = sql.match(/SET (.*) WHERE/)[1].split(',').map(field => field.trim().split(' = ?')[0]);
                        for (let i = 0; i < fields.length; i++) {
                            const field = fields[i];
                            const value = params[i];
                            if (field === 'members') {
                                updates[field] = JSON.parse(value);
                            } else {
                                updates[field] = value;
                            }
                        }
                        data.teams[teamIndex] = { ...data.teams[teamIndex], ...updates };
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                }
            } else if (sql.startsWith('DELETE')) {
                // 处理DELETE语句
                if (sql.includes('DELETE FROM users WHERE')) {
                    const [id] = params;
                    const initialLength = data.users.length;
                    data.users = data.users.filter(user => user._id !== id);
                    if (data.users.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('DELETE FROM projects WHERE _id = ?')) {
                    const [id] = params;
                    const initialLength = data.projects.length;
                    data.projects = data.projects.filter(project => project._id !== id);
                    if (data.projects.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('DELETE FROM resetCodes WHERE code = ?')) {
                    const [code] = params;
                    const initialLength = data.resetCodes.length;
                    data.resetCodes = data.resetCodes.filter(codeItem => codeItem.code !== code);
                    if (data.resetCodes.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                } else if (sql.includes('DELETE FROM teams WHERE _id = ?')) {
                    const [id] = params;
                    const initialLength = data.teams.length;
                    data.teams = data.teams.filter(team => team._id !== id);
                    if (data.teams.length !== initialLength) {
                        saveData();
                        return [{ affectedRows: 1 }];
                    }
                    return [{ affectedRows: 0 }];
                }
            } else if (sql.startsWith('CREATE DATABASE') || sql.startsWith('USE')) {
                // 忽略这些语句，因为文件系统存储不需要
                return [];
            }
            
            // 默认返回空结果
            return [[]];
        }
    }

    // 重新绑定全局函数
    global.query = query;
    global.insert = insert;
    global.update = update;
    global.remove = remove;

    // 加载数据
    loadData();
    
    // 检查是否需要初始化数据
    if (data.users.length === 0) {
        initDefaultData();
    }
    
    console.log('File system storage initialized');
}

// 记录历史操作
async function recordHistory(projectId, taskId, branchId, operationType, operationDescription, operator, oldValue, newValue) {
    try {
        // 获取下一个ID
        const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM history');
        const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
        
        // 插入历史记录
        await db.execute(
            'INSERT INTO history (_id, projectId, taskId, branchId, operationType, operationDescription, operator, timestamp, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [nextId, projectId, taskId, branchId, operationType, operationDescription, operator, new Date(), JSON.stringify(oldValue || {}), JSON.stringify(newValue || {})]
        );
    } catch (error) {
        console.error('Failed to record history:', error);
    }
}

// 初始化默认数据
async function initDefaultData() {
    // 初始化用户
    const users = [
        [1, 'admin', 'admin@example.com', '13800138000', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'admin'],
        [2, 'user1', 'user1@example.com', '13800138001', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'leader'],
        [3, 'user2', 'user2@example.com', '13800138002', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'member'],
        [4, 'user3', 'user3@example.com', '13800138003', '$2b$10$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW', 'member']
    ];
    for (const user of users) {
        await db.execute('INSERT INTO users (_id, username, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)', user);
    }
    
    // 初始化项目
    const projects = [
        [1, 'QG协作平台', '团队协作与版本管理平台', '2026-04-01', JSON.stringify(['admin', 'user1', 'user2'])],
        [2, '移动应用开发', '跨平台移动应用', '2026-04-02', JSON.stringify(['admin', 'user3'])]
    ];
    for (const project of projects) {
        await db.execute('INSERT INTO projects (_id, name, description, createdAt, members) VALUES (?, ?, ?, ?, ?)', project);
    }
    
    // 初始化任务
    const tasks = [
        [1, 1, '完成用户认证功能', '实现登录、注册和权限控制', 'todo', 'high', 'admin', '2026-04-10', '功能开发', 'main', 0, 0, JSON.stringify([]), ''],
        [2, 1, '开发项目管理页面', '实现项目的创建、编辑和删除', 'in_progress', 'medium', 'user1', '2026-04-15', '功能开发', 'feature-auth', 50, 7200, JSON.stringify([]), ''],
        [3, 1, '测试任务看板', '测试任务拖拽和状态更新', 'done', 'low', 'user2', '2026-04-05', '测试', 'main', 100, 3600, JSON.stringify([]), '']
    ];
    for (const task of tasks) {
        await db.execute('INSERT INTO tasks (_id, projectId, title, description, status, priority, assignee, dueDate, tag, branch, progress, timeSpent, dependencies, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', task);
    }
    
    // 初始化分支
    const branches = [
        [1, 1, 'main', 'main', null, '2026-04-01', 'Initial commit'],
        [2, 1, 'feature-auth', 'feature', 1, '2026-04-02', 'Add login functionality'],
        [3, 1, 'hotfix-bug', 'hotfix', 1, '2026-04-03', 'Fix critical bug']
    ];
    for (const branch of branches) {
        await db.execute('INSERT INTO branches (_id, projectId, name, type, parentId, createdAt, lastCommit) VALUES (?, ?, ?, ?, ?, ?, ?)', branch);
    }
    
    // 初始化提交
    const commits = [
        [1, 1, 1, 'abc123', 'Initial commit', 'admin', '2026-04-01 10:00:00'],
        [2, 1, 2, 'def456', 'Add login functionality', 'user1', '2026-04-02 14:30:00'],
        [3, 1, 3, 'ghi789', 'Fix critical bug', 'admin', '2026-04-03 09:15:00']
    ];
    for (const commit of commits) {
        await db.execute('INSERT INTO commits (_id, projectId, branchId, hash, message, author, date) VALUES (?, ?, ?, ?, ?, ?, ?)', commit);
    }
    
    // 初始化通知
    const notifications = [
        [1, 1, '任务分配', '您被分配了新任务：完成用户认证功能', false, 'task', '2026-04-07 10:00:00'],
        [2, 1, '分支合并', '分支 feature-auth 已成功合并到 main', false, 'branch', '2026-04-07 09:30:00'],
        [3, 1, '项目更新', '项目 QG协作平台 已更新', true, 'project', '2026-04-06 16:00:00']
    ];
    for (const notification of notifications) {
        await db.execute('INSERT INTO notifications (_id, userId, title, content, read, type, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)', notification);
    }
    
    // 初始化团队
    const teams = [
        [1, '开发团队', '负责项目开发的团队', 'https://via.placeholder.com/50', JSON.stringify(['admin', 'user1', 'user2']), '2026-04-01'],
        [2, '测试团队', '负责项目测试的团队', 'https://via.placeholder.com/50', JSON.stringify(['admin', 'user3']), '2026-04-02']
    ];
    for (const team of teams) {
        await db.execute('INSERT INTO teams (_id, name, description, avatar, members, createdAt) VALUES (?, ?, ?, ?, ?, ?)', team);
    }
    
    // 初始化历史记录
    const history = [
        [1, 1, 1, null, 'create', '创建任务', 'admin', '2026-04-07 10:00:00', '{}', '{"title": "完成用户认证功能", "status": "todo"}'],
        [2, 1, 2, null, 'create', '创建任务', 'admin', '2026-04-07 10:05:00', '{}', '{"title": "开发项目管理页面", "status": "in_progress"}'],
        [3, 1, 3, null, 'create', '创建任务', 'admin', '2026-04-07 10:10:00', '{}', '{"title": "测试任务看板", "status": "done"}'],
        [4, 1, null, 2, 'create', '创建分支', 'user1', '2026-04-07 11:00:00', '{}', '{"name": "feature-auth", "type": "feature"}'],
        [5, 1, null, 3, 'create', '创建分支', 'admin', '2026-04-07 11:30:00', '{}', '{"name": "hotfix-bug", "type": "hotfix"}'],
        [6, 1, 2, null, 'update', '更新任务状态', 'user1', '2026-04-07 14:00:00', '{"status": "todo"}', '{"status": "in_progress"}']
    ];
    for (const record of history) {
        await db.execute('INSERT INTO history (_id, projectId, taskId, branchId, operationType, operationDescription, operator, timestamp, oldValue, newValue) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', record);
    }
    
    console.log('Default data initialized');
}

// 解析请求体
function parseBody(req) {
    return new Promise((resolve, reject) => {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch (error) {
                reject(error);
            }
        });
    });
}

// 验证JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Access token required' }));
        return;
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            res.writeHead(403, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Invalid token' }));
            return;
        }
        req.user = user;
        next();
    });
}

// 处理静态文件
function serveStaticFile(req, res, filePath) {
    const fullPath = path.join(__dirname, filePath);
    
    fs.access(fullPath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('File not found');
            return;
        }
        
        fs.readFile(fullPath, (err, content) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal server error');
                return;
            }
            
            // 设置内容类型
            let contentType = 'text/plain';
            if (filePath.endsWith('.html')) contentType = 'text/html';
            else if (filePath.endsWith('.css')) contentType = 'text/css';
            else if (filePath.endsWith('.js')) contentType = 'application/javascript';
            
            res.writeHead(200, { 
                'Content-Type': contentType,
                'Cache-Control': 'max-age=86400' // 1 day cache
            });
            res.end(content);
        });
    });
}

// 生成下一个ID
async function getNextId(collection) {
    return counters[collection] || 1;
}

// 主服务器逻辑
const server = http.createServer(async (req, res) => {
    // 处理CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }
    
    // 处理API请求
    if (req.url.startsWith('/api/')) {
        const path = req.url.substring(5);
        
        // 认证相关路由
        if (path === 'auth/login' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { username, password } = body;
                
                // 支持用户名、邮箱或手机号登录
                    const [rows] = await db.execute(
                        'SELECT _id, username, password, role FROM users WHERE username = ? OR email = ? OR phone = ?',
                        [username, username, username]
                    );
                
                if (rows.length === 0) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid username/email/phone or password' }));
                    return;
                }
                
                const user = rows[0];
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    res.writeHead(401, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid username/email/phone or password' }));
                    return;
                }
                
                const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET);
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ token, user: { id: user._id, username: user.username, role: user.role } }));
            } catch (error) {
                console.error('Login error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        } else if (path === 'auth/register' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { username, email, phone, password, role } = body;
                
                // 检查用户名是否已存在
                    const [usernameRows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
                    if (usernameRows.length > 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Username already exists' }));
                        return;
                    }
                    
                    // 检查邮箱是否已存在
                    if (email) {
                        const [emailRows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
                        if (emailRows.length > 0) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Email already exists' }));
                            return;
                        }
                    }
                    
                    // 检查手机号是否已存在
                    if (phone) {
                        const [phoneRows] = await db.execute('SELECT * FROM users WHERE phone = ?', [phone]);
                        if (phoneRows.length > 0) {
                            res.writeHead(400, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Phone number already exists' }));
                            return;
                        }
                    }
                    
                    const hashedPassword = await bcrypt.hash(password, 10);
                    
                    // 获取下一个ID
                    const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM users');
                    const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
                    
                    await db.execute(
                        'INSERT INTO users (_id, username, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
                        [nextId, username, email || '', phone || '', hashedPassword, role || 'member']
                    );
                
                res.writeHead(201, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'User registered successfully' }));
            } catch (error) {
                console.error('Register error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        } else if (path === 'auth/forgot-password' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { username } = body;
                
                // 支持用户名、邮箱或手机号查找用户
                    const [rows] = await db.execute(
                        'SELECT _id, username FROM users WHERE username = ? OR email = ? OR phone = ?',
                        [username, username, username]
                    );
                    
                    if (rows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'User not found' }));
                        return;
                    }
                    
                    const user = rows[0];
                    // 生成6位随机验证码
                    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
                    
                    // 存储验证码，设置5分钟过期
                    await db.execute(
                        'INSERT INTO resetCodes (code, userId, expiresAt, createdAt) VALUES (?, ?, ?, ?)',
                        [resetCode, user._id, Date.now() + 5 * 60 * 1000, new Date()]
                    );
                
                console.log(`Reset code for user ${user.username}: ${resetCode}`);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Reset code sent' }));
            } catch (error) {
                console.error('Forgot password error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        } else if (path === 'auth/reset-password' && req.method === 'POST') {
            try {
                const body = await parseBody(req);
                const { code, newPassword, confirmNewPassword } = body;
                
                // 验证密码
                if (!newPassword || !confirmNewPassword) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Password is required' }));
                    return;
                }
                
                if (newPassword !== confirmNewPassword) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Passwords do not match' }));
                    return;
                }
                
                if (newPassword.length < 6) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Password must be at least 6 characters' }));
                    return;
                }
                
                // 查找并验证验证码
                    const [resetRows] = await db.execute('SELECT * FROM resetCodes WHERE code = ?', [code]);
                    if (resetRows.length === 0) {
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Invalid or expired reset code' }));
                        return;
                    }
                    
                    const resetData = resetRows[0];
                    if (Date.now() > resetData.expiresAt) {
                        // 删除过期的验证码
                        await db.execute('DELETE FROM resetCodes WHERE code = ?', [code]);
                        res.writeHead(400, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Reset code has expired' }));
                        return;
                    }
                    
                    // 查找用户
                    const [userRows] = await db.execute('SELECT * FROM users WHERE _id = ?', [resetData.userId]);
                    if (userRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'User not found' }));
                        return;
                    }
                    
                    // 更新密码
                    const hashedPassword = await bcrypt.hash(newPassword, 10);
                    await db.execute('UPDATE users SET password = ? WHERE _id = ?', [hashedPassword, resetData.userId]);
                    
                    // 删除已使用的验证码
                    await db.execute('DELETE FROM resetCodes WHERE code = ?', [code]);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ message: 'Password reset successfully' }));
            } catch (error) {
                console.error('Reset password error:', error);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Internal server error' }));
            }
        } else if (path === 'projects' && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const [projects] = await db.execute('SELECT * FROM projects');
                    // 解析JSON字符串字段
                    const parsedProjects = projects.map(project => ({
                        ...project,
                        members: JSON.parse(project.members || '[]')
                    }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsedProjects));
                } catch (error) {
                    console.error('Get projects error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path === 'projects' && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const body = await parseBody(req);
                    const { name, description } = body;
                    
                    // 获取下一个ID
                    const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM projects');
                    const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
                    
                    // 插入新项目
                    await db.execute(
                        'INSERT INTO projects (_id, name, description, createdAt, members) VALUES (?, ?, ?, ?, ?)',
                        [nextId, name, description, new Date().toISOString().split('T')[0], JSON.stringify([req.user.username])]
                    );
                    
                    const newProject = {
                        _id: nextId,
                        name,
                        description,
                        createdAt: new Date().toISOString().split('T')[0],
                        members: [req.user.username]
                    };
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newProject));
                } catch (error) {
                    console.error('Create project error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+$/) && req.method === 'PUT') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { name, description } = body;
                    
                    const [projectRows] = await db.execute('SELECT * FROM projects WHERE _id = ?', [projectId]);
                    if (projectRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Project not found' }));
                        return;
                    }
                    
                    // 更新项目
                    await db.execute(
                        'UPDATE projects SET name = ?, description = ? WHERE _id = ?',
                        [name, description, projectId]
                    );
                    
                    const [updatedRows] = await db.execute('SELECT * FROM projects WHERE _id = ?', [projectId]);
                    const updatedProject = {
                        ...updatedRows[0],
                        members: JSON.parse(updatedRows[0].members || '[]')
                    };
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedProject));
                } catch (error) {
                    console.error('Update project error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+$/) && req.method === 'DELETE') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    
                    const [result] = await db.execute('DELETE FROM projects WHERE _id = ?', [projectId]);
                    if (result.affectedRows === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Project not found' }));
                        return;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Project deleted successfully' }));
                } catch (error) {
                    console.error('Delete project error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+\/tasks$/) && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const [tasks] = await db.execute('SELECT * FROM tasks WHERE projectId = ?', [projectId]);
                    // 解析JSON字符串字段
                    const parsedTasks = tasks.map(task => ({
                        ...task,
                        dependencies: JSON.parse(task.dependencies || '[]')
                    }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsedTasks));
                } catch (error) {
                    console.error('Get tasks error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+\/tasks$/) && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { title, description, priority, assignee, dueDate, status, tag, branch, progress, dependencies, comment } = body;
                    
                    // 获取下一个ID
                    const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM tasks');
                    const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
                    
                    // 插入新任务
                    await db.execute(
                        'INSERT INTO tasks (_id, projectId, title, description, status, priority, assignee, dueDate, tag, branch, progress, timeSpent, dependencies, comment) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                        [nextId, projectId, title, description, status || 'todo', priority || 'medium', assignee || req.user.username, dueDate, tag || '功能开发', branch || 'main', progress || 0, 0, JSON.stringify(dependencies || []), comment || '']
                    );
                    
                    const newTask = {
                        _id: nextId,
                        projectId,
                        title,
                        description,
                        status: status || 'todo',
                        priority: priority || 'medium',
                        assignee: assignee || req.user.username,
                        dueDate,
                        tag: tag || '功能开发',
                        branch: branch || 'main',
                        progress: progress || 0,
                        timeSpent: 0,
                        dependencies: dependencies || [],
                        comment: comment || ''
                    };
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newTask));
                } catch (error) {
                    console.error('Create task error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^tasks\/\d+$/) && req.method === 'PUT') {
            authenticateToken(req, res, async () => {
                try {
                    const taskId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    
                    const [taskRows] = await db.execute('SELECT * FROM tasks WHERE _id = ?', [taskId]);
                    if (taskRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Task not found' }));
                        return;
                    }
                    
                    // 构建更新查询
                    const updateFields = [];
                    const updateValues = [];
                    
                    for (const [key, value] of Object.entries(body)) {
                        if (key === 'dependencies') {
                            updateFields.push(`${key} = ?`);
                            updateValues.push(JSON.stringify(value));
                        } else {
                            updateFields.push(`${key} = ?`);
                            updateValues.push(value);
                        }
                    }
                    
                    updateValues.push(taskId);
                    
                    // 更新任务
                    await db.execute(
                        `UPDATE tasks SET ${updateFields.join(', ')} WHERE _id = ?`,
                        updateValues
                    );
                    
                    // 获取更新后的任务
                    const [updatedRows] = await db.execute('SELECT * FROM tasks WHERE _id = ?', [taskId]);
                    const updatedTask = {
                        ...updatedRows[0],
                        dependencies: JSON.parse(updatedRows[0].dependencies || '[]')
                    };
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedTask));
                } catch (error) {
                    console.error('Update task error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+\/branches$/) && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const [branches] = await db.execute('SELECT * FROM branches WHERE projectId = ?', [projectId]);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(branches));
                } catch (error) {
                    console.error('Get branches error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+\/branches$/) && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { name, type, parentId } = body;
                    
                    // 获取下一个ID
                    const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM branches');
                    const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
                    
                    // 插入新分支
                    await db.execute(
                        'INSERT INTO branches (_id, projectId, name, type, parentId, createdAt, lastCommit) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [nextId, projectId, name, type, parentId, new Date().toISOString().split('T')[0], 'Initial commit']
                    );
                    
                    const newBranch = {
                        _id: nextId,
                        projectId,
                        name,
                        type,
                        parentId,
                        createdAt: new Date().toISOString().split('T')[0],
                        lastCommit: 'Initial commit'
                    };
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newBranch));
                } catch (error) {
                    console.error('Create branch error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^branches\/\d+\/merge-check$/) && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const branchId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { targetBranchId } = body;
                    
                    const [branchRows] = await db.execute('SELECT * FROM branches WHERE _id = ?', [branchId]);
                    if (branchRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Branch not found' }));
                        return;
                    }
                    
                    const [targetBranchRows] = await db.execute('SELECT * FROM branches WHERE _id = ?', [targetBranchId]);
                    if (targetBranchRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Target branch not found' }));
                        return;
                    }
                    
                    // 模拟冲突检测
                    // 实际项目中，这里应该比较两个分支的提交差异
                    const hasConflict = Math.random() > 0.5; // 50% 概率有冲突
                    
                    if (hasConflict) {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({
                            hasConflict: true,
                            conflicts: [
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
                            ]
                        }));
                    } else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ hasConflict: false }));
                    }
                } catch (error) {
                    console.error('Merge check error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^branches\/\d+\/merge$/) && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const branchId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { targetBranchId, resolutions } = body;
                    
                    const [branchRows] = await db.execute('SELECT * FROM branches WHERE _id = ?', [branchId]);
                    if (branchRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Branch not found' }));
                        return;
                    }
                    const branch = branchRows[0];
                    
                    // 处理冲突解决
                    if (resolutions) {
                        console.log('Resolving conflicts:', resolutions);
                    }
                    
                    // 创建合并提交
                    const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM commits');
                    const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
                    
                    // 插入新提交
                    await db.execute(
                        'INSERT INTO commits (_id, projectId, branchId, hash, message, author, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
                        [nextId, branch.projectId, targetBranchId, Math.random().toString(36).substring(2, 10), `Merge branch ${branch.name} into target`, req.user.username, new Date()]
                    );
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: `Branch ${branch.name} merged successfully` }));
                } catch (error) {
                    console.error('Merge branch error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+\/commits$/) && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const [commits] = await db.execute('SELECT * FROM commits WHERE projectId = ?', [projectId]);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(commits));
                } catch (error) {
                    console.error('Get commits error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path === 'notifications' && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const [notifications] = await db.execute('SELECT * FROM notifications WHERE userId = ?', [req.user.id]);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(notifications));
                } catch (error) {
                    console.error('Get notifications error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^notifications\/\d+\/read$/) && req.method === 'PUT') {
            authenticateToken(req, res, async () => {
                try {
                    const notificationId = parseInt(path.split('/')[1]);
                    
                    const [notificationRows] = await db.execute('SELECT * FROM notifications WHERE _id = ?', [notificationId]);
                    if (notificationRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Notification not found' }));
                        return;
                    }
                    
                    // 更新通知
                    await db.execute('UPDATE notifications SET read = true WHERE _id = ?', [notificationId]);
                    
                    // 获取更新后的通知
                    const [updatedRows] = await db.execute('SELECT * FROM notifications WHERE _id = ?', [notificationId]);
                    const updatedNotification = updatedRows[0];
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedNotification));
                } catch (error) {
                    console.error('Update notification error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path === 'teams' && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const [teams] = await db.execute('SELECT * FROM teams');
                    // 解析JSON字符串字段
                    const parsedTeams = teams.map(team => ({
                        ...team,
                        members: JSON.parse(team.members || '[]')
                    }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsedTeams));
                } catch (error) {
                    console.error('Get teams error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path === 'teams' && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const body = await parseBody(req);
                    const { name, description, members } = body;
                    
                    // 获取下一个ID
                    const [idRows] = await db.execute('SELECT MAX(_id) as maxId FROM teams');
                    const nextId = idRows[0].maxId ? idRows[0].maxId + 1 : 1;
                    
                    // 插入新团队
                    await db.execute(
                        'INSERT INTO teams (_id, name, description, avatar, members, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
                        [nextId, name, description, 'https://via.placeholder.com/50', JSON.stringify(members || [req.user.username]), new Date().toISOString().split('T')[0]]
                    );
                    
                    const newTeam = {
                        _id: nextId,
                        name,
                        description,
                        avatar: 'https://via.placeholder.com/50',
                        members: members || [req.user.username],
                        createdAt: new Date().toISOString().split('T')[0]
                    };
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(newTeam));
                } catch (error) {
                    console.error('Create team error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^teams\/\d+$/) && req.method === 'PUT') {
            authenticateToken(req, res, async () => {
                try {
                    const teamId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { name, description, members } = body;
                    
                    const [teamRows] = await db.execute('SELECT * FROM teams WHERE _id = ?', [teamId]);
                    if (teamRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Team not found' }));
                        return;
                    }
                    
                    // 构建更新查询
                    const updateFields = [];
                    const updateValues = [];
                    
                    if (name) {
                        updateFields.push('name = ?');
                        updateValues.push(name);
                    }
                    if (description) {
                        updateFields.push('description = ?');
                        updateValues.push(description);
                    }
                    if (members) {
                        updateFields.push('members = ?');
                        updateValues.push(JSON.stringify(members));
                    }
                    
                    updateValues.push(teamId);
                    
                    // 更新团队
                    await db.execute(
                        `UPDATE teams SET ${updateFields.join(', ')} WHERE _id = ?`,
                        updateValues
                    );
                    
                    // 获取更新后的团队
                    const [updatedRows] = await db.execute('SELECT * FROM teams WHERE _id = ?', [teamId]);
                    const updatedTeam = {
                        ...updatedRows[0],
                        members: JSON.parse(updatedRows[0].members || '[]')
                    };
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedTeam));
                } catch (error) {
                    console.error('Update team error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^teams\/\d+$/) && req.method === 'DELETE') {
            authenticateToken(req, res, async () => {
                try {
                    const teamId = parseInt(path.split('/')[1]);
                    
                    const [result] = await db.execute('DELETE FROM teams WHERE _id = ?', [teamId]);
                    if (result.affectedRows === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Team not found' }));
                        return;
                    }
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ message: 'Team deleted successfully' }));
                } catch (error) {
                    console.error('Delete team error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^tasks\/\d+\/history$/) && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const taskId = parseInt(path.split('/')[1]);
                    const [history] = await db.execute('SELECT * FROM history WHERE taskId = ? ORDER BY timestamp DESC', [taskId]);
                    // 解析JSON字符串字段
                    const parsedHistory = history.map(item => ({
                        ...item,
                        oldValue: JSON.parse(item.oldValue || '{}'),
                        newValue: JSON.parse(item.newValue || '{}')
                    }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsedHistory));
                } catch (error) {
                    console.error('Get task history error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^branches\/\d+\/history$/) && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const branchId = parseInt(path.split('/')[1]);
                    const [history] = await db.execute('SELECT * FROM history WHERE branchId = ? ORDER BY timestamp DESC', [branchId]);
                    // 解析JSON字符串字段
                    const parsedHistory = history.map(item => ({
                        ...item,
                        oldValue: JSON.parse(item.oldValue || '{}'),
                        newValue: JSON.parse(item.newValue || '{}')
                    }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsedHistory));
                } catch (error) {
                    console.error('Get branch history error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^projects\/\d+\/history$/) && req.method === 'GET') {
            authenticateToken(req, res, async () => {
                try {
                    const projectId = parseInt(path.split('/')[1]);
                    const [history] = await db.execute('SELECT * FROM history WHERE projectId = ? ORDER BY timestamp DESC', [projectId]);
                    // 解析JSON字符串字段
                    const parsedHistory = history.map(item => ({
                        ...item,
                        oldValue: JSON.parse(item.oldValue || '{}'),
                        newValue: JSON.parse(item.newValue || '{}')
                    }));
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(parsedHistory));
                } catch (error) {
                    console.error('Get project history error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else if (path.match(/^tasks\/\d+\/revert$/) && req.method === 'POST') {
            authenticateToken(req, res, async () => {
                try {
                    const taskId = parseInt(path.split('/')[1]);
                    const body = await parseBody(req);
                    const { historyId } = body;
                    
                    // 获取历史记录
                    const [historyRows] = await db.execute('SELECT * FROM history WHERE _id = ?', [historyId]);
                    if (historyRows.length === 0) {
                        res.writeHead(404, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'History record not found' }));
                        return;
                    }
                    
                    const historyRecord = historyRows[0];
                    const oldValue = JSON.parse(historyRecord.oldValue || '{}');
                    
                    // 回退任务到历史状态
                    const updateFields = [];
                    const updateValues = [];
                    
                    for (const [key, value] of Object.entries(oldValue)) {
                        updateFields.push(`${key} = ?`);
                        updateValues.push(value);
                    }
                    
                    updateValues.push(taskId);
                    
                    if (updateFields.length > 0) {
                        await db.execute(
                            `UPDATE tasks SET ${updateFields.join(', ')} WHERE _id = ?`,
                            updateValues
                        );
                    }
                    
                    // 记录回退操作
                    await recordHistory(
                        historyRecord.projectId,
                        taskId,
                        null,
                        'revert',
                        `回退任务到历史版本 ${historyRecord.timestamp}`,
                        req.user.username,
                        JSON.parse(historyRecord.newValue || '{}'),
                        oldValue
                    );
                    
                    // 获取回退后的任务
                    const [updatedRows] = await db.execute('SELECT * FROM tasks WHERE _id = ?', [taskId]);
                    const updatedTask = {
                        ...updatedRows[0],
                        dependencies: JSON.parse(updatedRows[0].dependencies || '[]')
                    };
                    
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(updatedTask));
                } catch (error) {
                    console.error('Revert task error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Internal server error' }));
                }
            });
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Route not found' }));
        }
    } else {
        // 处理静态文件
        let filePath = req.url === '/' ? '/index.html' : req.url;
        // 移除查询参数
        filePath = filePath.split('?')[0];
        serveStaticFile(req, res, filePath);
    }
});

// 初始化数据库
initDb();

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});