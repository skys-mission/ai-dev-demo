// 脚本管理模块
const ScriptManager = (() => {
    let scripts = [];

    const loadScripts = async () => {
        try {
            const savedScripts = localStorage.getItem('shardScripts');
            scripts = savedScripts ? JSON.parse(savedScripts) : [];
            updateScriptList();
        } catch (error) {
            console.error('加载脚本失败:', error);
            scripts = [];
            Utils.showMessage('错误', '加载脚本失败', 'error');
        }
        return scripts;
    };

    const saveScript = async (script) => {
        try {
            // 生成唯一ID
            const newScript = {
                ...script,
                id: Date.now().toString()
            };
            scripts.push(newScript);
            localStorage.setItem('shardScripts', JSON.stringify(scripts));
            return newScript;
        } catch (error) {
            console.error('保存脚本失败:', error);
            throw error;
        }
    };

    const updateScript = async (id, updatedScript) => {
        try {
            const index = scripts.findIndex(script => script.id === id);
            if (index === -1) {
                throw new Error('脚本不存在');
            }
            scripts[index] = updatedScript;
            localStorage.setItem('shardScripts', JSON.stringify(scripts));
            return updatedScript;
        } catch (error) {
            console.error('更新脚本失败:', error);
            throw error;
        }
    };

    const deleteScript = async (id) => {
        try {
            scripts = scripts.filter(script => script.id !== id);
            localStorage.setItem('shardScripts', JSON.stringify(scripts));
        } catch (error) {
            console.error('删除脚本失败:', error);
            throw error;
        }
    };

    const updateScriptList = () => {
        const list = document.getElementById('script-list');
        if (!list) return;
        
        list.innerHTML = '';

        if (!Array.isArray(scripts)) {
            scripts = [];
        }

        scripts.forEach(script => {
            const li = document.createElement('li');
            li.className = 'script-item';
            li.innerHTML = `
                <div class="script-info">
                    <div class="script-name">${Utils.escapeHtml(script.name)}</div>
                    <div class="script-description">${Utils.escapeHtml(script.description)}</div>
                </div>
                <div class="script-actions">
                    <button class="btn btn-secondary btn-sm" onclick="ScriptManager.useScript('${script.id}')">使用</button>
                    <button class="btn btn-secondary btn-sm" onclick="ScriptManager.editScript('${script.id}')">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="ScriptManager.deleteScript('${script.id}')">删除</button>
                </div>
            `;
            list.appendChild(li);
        });
    };

    const addScript = () => {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalHeader = modal.querySelector('.modal-header');
        let modalFooter = modal.querySelector('.modal-footer');

        // 如果modal-footer不存在，则创建它
        if (!modalFooter) {
            modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            modal.querySelector('.modal-content').appendChild(modalFooter);
        }

        // 更新标题
        modalTitle.textContent = '添加自定义脚本';

        // 更新内容
        modalBody.innerHTML = `
                <div class="form-group">
                    <label for="scriptName">脚本名称</label>
                    <input type="text" id="scriptName" class="form-control">
                </div>
                <div class="form-group">
                    <label for="scriptDescription">脚本描述</label>
                    <textarea id="scriptDescription" class="form-control" rows="2"></textarea>
                </div>
                <div class="form-group" style="max-height: 200px; overflow-y: auto;">
                    <label for="scriptCode">脚本代码</label>
                    <textarea id="scriptCode" class="form-control" rows="4" placeholder="function(value) { return value % shardTotal; }"></textarea>
                </div>
        `;

        // 更新页脚
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="Utils.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="ScriptManager.saveNewScript()">保存</button>
        `;



        modal.classList.add('active');
    };

    const saveNewScript = async () => {
        const name = document.getElementById('scriptName').value.trim();
        const description = document.getElementById('scriptDescription').value.trim();
        const code = document.getElementById('scriptCode').value.trim();

        if (!name) {
            Utils.showMessage('提示', '请输入脚本名称');
            return;
        }

        if (!code) {
            Utils.showMessage('提示', '请输入脚本代码');
            return;
        }

        try {
            // 验证脚本语法
            new Function('value', code);
        } catch (e) {
            Utils.showMessage('错误', '脚本语法错误: ' + e.message, 'error');
            return;
        }

        const script = {
            name,
            description,
            script: code // 后端期望的字段名是script
        };

        try {
            await saveScript(script);
            Utils.closeModal();
            Utils.showMessage('提示', '脚本保存成功');
            loadScripts(); // 重新加载脚本列表
            // 刷新脚本选择器
            ShardAlgorithm.refreshCustomScripts();
        } catch (error) {
            Utils.showMessage('错误', '保存脚本失败: ' + error.message, 'error');
        }
    };

    const editScript = (id) => {
        const script = scripts.find(s => s.id === id);
        if (!script) return;

        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalHeader = modal.querySelector('.modal-header');
        let modalFooter = modal.querySelector('.modal-footer');

        // 如果modal-footer不存在，则创建它
        if (!modalFooter) {
            modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            modal.querySelector('.modal-content').appendChild(modalFooter);
        }

        // 更新标题
        modalTitle.textContent = '编辑自定义脚本';

        // 更新内容
        modalBody.innerHTML = `
                <div class="form-group">
                    <label for="editScriptName">脚本名称</label>
                    <input type="text" id="editScriptName" class="form-control" value="${Utils.escapeHtml(script.name)}">
                </div>
                <div class="form-group">
                    <label for="editScriptDescription">脚本描述</label>
                    <textarea id="editScriptDescription" class="form-control" rows="2">${Utils.escapeHtml(script.description)}</textarea>
                </div>
                <div class="form-group" style="max-height: 200px; overflow-y: auto;">
                    <label for="editScriptCode">脚本代码</label>
                    <textarea id="editScriptCode" class="form-control" rows="4">${Utils.escapeHtml(script.script)}</textarea>
                </div>
        `;

        // 更新页脚
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="Utils.closeModal()">取消</button>
            <button class="btn btn-primary" onclick="ScriptManager.updateScript('${script.id}')">保存</button>
        `;



        modal.classList.add('active');
    };

    const updateScriptUI = async (id) => {
        const name = document.getElementById('editScriptName').value.trim();
        const description = document.getElementById('editScriptDescription').value.trim();
        const code = document.getElementById('editScriptCode').value.trim();

        if (!name) {
            Utils.showMessage('提示', '请输入脚本名称');
            return;
        }

        if (!code) {
            Utils.showMessage('提示', '请输入脚本代码');
            return;
        }

        try {
            // 验证脚本语法
            new Function('value', code);
        } catch (e) {
            Utils.showMessage('错误', '脚本语法错误: ' + e.message, 'error');
            return;
        }

        const updatedScript = {
            id,
            name,
            description,
            script: code // 后端期望的字段名是script
        };

        try {
            await updateScript(id, updatedScript);
            Utils.closeModal();
            Utils.showMessage('提示', '脚本更新成功');
            loadScripts(); // 重新加载脚本列表
            // 刷新脚本选择器
            ShardAlgorithm.refreshCustomScripts();
        } catch (error) {
            Utils.showMessage('错误', '更新脚本失败: ' + error.message, 'error');
        }
    };

    const useScript = (id) => {
        const script = scripts.find(s => s.id === id);
        if (script) {
            document.getElementById('custom-script').value = script.script;
            Utils.showMessage('提示', '脚本已加载到编辑器中');
        }
    };

    const deleteScriptUI = async (id) => {
        try {
            await deleteScript(id);
            Utils.showMessage('提示', '脚本删除成功');
            loadScripts(); // 重新加载脚本列表
            // 刷新脚本选择器
            ShardAlgorithm.refreshCustomScripts();
        } catch (error) {
            Utils.showMessage('错误', '删除脚本失败: ' + error.message, 'error');
        }
    };

    const getScriptById = (id) => {
        return scripts.find(script => script.id === id);
    };

    const showScriptManager = async () => {
        const modal = document.getElementById('modal');
        const modalTitle = document.getElementById('modal-title');
        const modalBody = document.getElementById('modal-body');
        const modalHeader = modal.querySelector('.modal-header');
        let modalFooter = modal.querySelector('.modal-footer');

        // 如果modal-footer不存在，则创建它
        if (!modalFooter) {
            modalFooter = document.createElement('div');
            modalFooter.className = 'modal-footer';
            modal.querySelector('.modal-content').appendChild(modalFooter);
        }

        // 更新标题
        modalTitle.textContent = '管理脚本';

        // 更新内容
        modalBody.innerHTML = `
                <div class="script-manager-header">
                    <h4>已保存的脚本</h4>
                    <button id="add-script-btn" class="btn btn-primary btn-sm">添加脚本</button>
                </div>
                <ul id="script-list" class="script-list"></ul>
        `;

        // 更新页脚
        modalFooter.innerHTML = `
            <button class="btn btn-secondary" onclick="Utils.closeModal()">关闭</button>
        `;



        // 为添加脚本按钮添加事件监听器
        const addScriptBtn = modalBody.querySelector('#add-script-btn');
        if (addScriptBtn) {
            addScriptBtn.addEventListener('click', addScript);
        }

        // 加载脚本列表
        await loadScripts();

        modal.classList.add('active');
    };

    return {
        loadScripts,
        addScript,
        saveNewScript,
        editScript,
        updateScript: updateScriptUI,
        deleteScript: deleteScriptUI,
        useScript,
        updateScriptList,
        getScriptById,
        showScriptManager
    };
})();
