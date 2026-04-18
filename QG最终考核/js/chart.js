// 图表模块
class Chart {
    // 绘制折线图
    static drawLineChart(canvasId, data, labels) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 计算尺寸
        const padding = 40;
        const chartWidth = canvas.width - padding * 2;
        const chartHeight = canvas.height - padding * 2;
        
        // 找到数据的最大值和最小值
        const maxValue = Math.max(...data);
        const minValue = Math.min(...data);
        const valueRange = maxValue - minValue || 1;
        
        // 绘制坐标轴
        ctx.beginPath();
        ctx.moveTo(padding, padding);
        ctx.lineTo(padding, canvas.height - padding);
        ctx.lineTo(canvas.width - padding, canvas.height - padding);
        ctx.strokeStyle = '#333';
        ctx.stroke();
        
        // 绘制数据点和线条
        ctx.beginPath();
        data.forEach((value, index) => {
            const x = padding + (index / (data.length - 1)) * chartWidth;
            const y = canvas.height - padding - ((value - minValue) / valueRange) * chartHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
            
            // 绘制数据点
            ctx.fillStyle = '#4CAF50';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        });
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 绘制标签
        ctx.fillStyle = '#333';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        labels.forEach((label, index) => {
            const x = padding + (index / (labels.length - 1)) * chartWidth;
            ctx.fillText(label, x, canvas.height - padding + 20);
        });
        
        // 绘制数值
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const value = minValue + (valueRange / 5) * i;
            const y = canvas.height - padding - (i / 5) * chartHeight;
            ctx.fillText(value.toFixed(1), padding - 10, y + 4);
        }
    }
    
    // 绘制饼图
    static drawPieChart(canvasId, data, labels, colors) {
        const canvas = document.getElementById(canvasId);
        const ctx = canvas.getContext('2d');
        
        // 清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        
        const total = data.reduce((sum, value) => sum + value, 0);
        let startAngle = 0;
        
        data.forEach((value, index) => {
            const sliceAngle = (value / total) * Math.PI * 2;
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = colors[index] || `hsl(${index * 60}, 70%, 50%)`;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制标签
            const labelAngle = startAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + 30);
            const labelY = centerY + Math.sin(labelAngle) * (radius + 30);
            ctx.fillStyle = '#333';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`${labels[index]}: ${value}`, labelX, labelY);
            
            startAngle += sliceAngle;
        });
    }
}

// 动态进度条模块
class ProgressBar {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.progress = 0;
        this.setupProgressBar();
    }
    
    setupProgressBar() {
        this.progressBar = document.createElement('div');
        this.progressBar.style.cssText = `
            width: 100%;
            height: 20px;
            background-color: #e0e0e0;
            border-radius: 10px;
            overflow: hidden;
        `;
        
        this.progressFill = document.createElement('div');
        this.progressFill.style.cssText = `
            height: 100%;
            width: 0%;
            background-color: #4CAF50;
            border-radius: 10px;
            transition: width 0.5s ease;
        `;
        
        this.progressText = document.createElement('div');
        this.progressText.style.cssText = `
            margin-top: 5px;
            font-size: 14px;
            text-align: center;
        `;
        
        this.progressBar.appendChild(this.progressFill);
        this.container.appendChild(this.progressBar);
        this.container.appendChild(this.progressText);
    }
    
    setProgress(progress) {
        this.progress = Math.max(0, Math.min(100, progress));
        this.progressFill.style.width = `${this.progress}%`;
        this.progressText.textContent = `进度: ${this.progress}%`;
        
        // 根据进度更改颜色
        if (this.progress < 30) {
            this.progressFill.style.backgroundColor = '#f44336';
        } else if (this.progress < 70) {
            this.progressFill.style.backgroundColor = '#ff9800';
        } else {
            this.progressFill.style.backgroundColor = '#4CAF50';
        }
    }
    
    animateProgress(targetProgress, duration = 1000) {
        const startProgress = this.progress;
        const progressDiff = targetProgress - startProgress;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsedTime = currentTime - startTime;
            const progress = startProgress + (progressDiff * (elapsedTime / duration));
            
            this.setProgress(progress);
            
            if (elapsedTime < duration) {
                requestAnimationFrame(animate);
            } else {
                this.setProgress(targetProgress);
            }
        };
        
        requestAnimationFrame(animate);
    }
}

export { Chart, ProgressBar };