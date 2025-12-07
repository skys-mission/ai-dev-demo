// 工具函数模块

// 转义HTML字符
const escapeHtml = (text) => {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// 消息提示函数
const showMessage = (title, message, type = 'info') => {
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const modalFooter = modal.querySelector('.modal-footer');
    
    // 设置模态框内容
    modalTitle.textContent = title;
    modalBody.innerHTML = `<div class="message-content ${type}"><p>${escapeHtml(message)}</p></div>`;
    
    // 移除footer内容，只显示提示信息
    if (modalFooter) {
        modalFooter.innerHTML = '';
    }
    
    modal.classList.add('active');
};

// 关闭模态框
const closeModal = () => {
    const modal = document.getElementById('modal');
    modal.classList.remove('active');
};

// 初始化主题
const initTheme = () => {
    const theme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.querySelector('.icon').textContent = theme === 'dark' ? '☀️' : '🌙';
};

// 切换主题
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.querySelector('.icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
};

// 显示/隐藏侧边栏
const toggleSidebar = () => {
    const sidebar = document.querySelector('.sidebar');
    sidebar.classList.toggle('active');
};

// 切换面板
const togglePanel = (panelId) => {
    const panels = ['scriptPanel', 'historyPanel'];
    panels.forEach(id => {
        const panel = document.getElementById(id);
        if (id === panelId) {
            panel.classList.add('active');
        } else {
            panel.classList.remove('active');
        }
    });
};

// 创建Utils命名空间
const Utils = {
    escapeHtml,
    showMessage,
    closeModal,
    initTheme,
    toggleTheme,
    toggleSidebar,
    togglePanel,
    
    // 初始化工具函数
    init() {
        // 为模态框关闭按钮添加事件监听器
        const modalCloseBtn = document.getElementById('modal-close');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', Utils.closeModal);
        }
        
        // 为模态框外部添加点击事件监听器，点击外部关闭模态框
        const modal = document.getElementById('modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    Utils.closeModal();
                }
            });
        }
    }
};

// 导出模块
window.Utils = Utils;
