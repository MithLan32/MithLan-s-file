// 原生富文本编辑器模块
class RichEditor {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        this.setupEditor();
        this.setupToolbar();
    }
    
    setupEditor() {
        this.editor = document.createElement('div');
        this.editor.contentEditable = true;
        this.editor.style.cssText = `
            width: 100%;
            min-height: 200px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            padding: 10px;
            font-family: Arial, sans-serif;
            line-height: 1.5;
        `;
        this.container.appendChild(this.editor);
    }
    
    setupToolbar() {
        const toolbar = document.createElement('div');
        toolbar.style.cssText = `
            display: flex;
            gap: 8px;
            margin-bottom: 10px;
            padding: 8px;
            background-color: #f8f9fa;
            border-radius: 4px;
            border: 1px solid #e0e0e0;
        `;
        
        // 加粗按钮
        const boldButton = this.createToolbarButton('B', () => this.execCommand('bold'));
        toolbar.appendChild(boldButton);
        
        // 斜体按钮
        const italicButton = this.createToolbarButton('I', () => this.execCommand('italic'));
        toolbar.appendChild(italicButton);
        
        // 下划线按钮
        const underlineButton = this.createToolbarButton('U', () => this.execCommand('underline'));
        toolbar.appendChild(underlineButton);
        
        // 插入代码块按钮
        const codeButton = this.createToolbarButton('Code', () => this.insertCodeBlock());
        toolbar.appendChild(codeButton);
        
        // 插入链接按钮
        const linkButton = this.createToolbarButton('Link', () => this.insertLink());
        toolbar.appendChild(linkButton);
        
        this.container.insertBefore(toolbar, this.editor);
    }
    
    createToolbarButton(text, callback) {
        const button = document.createElement('button');
        button.textContent = text;
        button.style.cssText = `
            padding: 4px 8px;
            border: 1px solid #e0e0e0;
            border-radius: 4px;
            background-color: white;
            cursor: pointer;
            font-size: 12px;
        `;
        button.addEventListener('click', callback);
        return button;
    }
    
    execCommand(command) {
        document.execCommand(command, false, null);
        this.editor.focus();
    }
    
    insertCodeBlock() {
        const codeBlock = document.createElement('pre');
        codeBlock.innerHTML = '<code>Enter code here</code>';
        codeBlock.style.cssText = `
            background-color: #f5f5f5;
            padding: 10px;
            border-radius: 4px;
            font-family: monospace;
            white-space: pre-wrap;
        `;
        this.insertElement(codeBlock);
    }
    
    insertLink() {
        const url = prompt('Enter URL:');
        if (url) {
            const linkText = prompt('Enter link text:');
            if (linkText) {
                const link = document.createElement('a');
                link.href = url;
                link.target = '_blank';
                link.textContent = linkText;
                this.insertElement(link);
            }
        }
    }
    
    insertElement(element) {
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(element);
            
            // 移动光标到元素后面
            const newRange = document.createRange();
            newRange.setStartAfter(element);
            newRange.collapse(true);
            selection.removeAllRanges();
            selection.addRange(newRange);
        } else {
            this.editor.appendChild(element);
        }
        this.editor.focus();
    }
    
    getContent() {
        return this.editor.innerHTML;
    }
    
    setContent(html) {
        this.editor.innerHTML = html;
    }
}

// 数据导出模块
class DataExporter {
    // 导出为CSV
    static exportToCSV(data, filename) {
        const headers = Object.keys(data[0] || {});
        const csvContent = [
            headers.join(','),
            ...data.map(row => headers.map(header => {
                const value = row[header];
                return typeof value === 'string' && value.includes(',') ? `"${value}"` : value;
            }).join(','))
        ].join('\n');
        
        this.downloadFile(csvContent, filename, 'text/csv');
    }
    
    // 导出为PDF
    static exportToPDF(content, filename) {
        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; }
                    h1 { color: #333; }
                    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
                    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                    th { background-color: #f2f2f2; }
                </style>
            </head>
            <body>
                ${content}
            </body>
            </html>
        `;
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        const printWindow = window.open(url, '_blank');
        printWindow.onload = function() {
            printWindow.print();
            setTimeout(() => {
                printWindow.close();
                URL.revokeObjectURL(url);
            }, 1000);
        };
    }
    
    // 通用下载函数
    static downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

export { RichEditor, DataExporter };