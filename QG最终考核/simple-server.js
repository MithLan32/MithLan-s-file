const http = require('http');
const fs = require('fs');
const path = require('path');

// 简单的服务器实现
const server = http.createServer((req, res) => {
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
        
        // 简单的模拟响应
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            message: 'API endpoint working',
            path: path
        }));
        return;
    }
    
    // 处理静态文件