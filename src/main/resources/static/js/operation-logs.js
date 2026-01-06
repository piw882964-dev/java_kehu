// 操作日志页面的Ajax交互
const API_BASE_URL = '/api/operation-logs';

// 分页参数
var currentPage = 0;
var pageSize = 20;
var totalPages = 0;
var totalElements = 0;

// 搜索条件
var searchParams = {
    username: '',
    operation: '',
    module: '',
    startTime: null,
    endTime: null
};

// 页面加载时
document.addEventListener('DOMContentLoaded', function() {
    loadLogs();
});

// 加载日志列表
function loadLogs(page = 0) {
    currentPage = page;
    
    const loading = document.getElementById('loading');
    const table = document.getElementById('logTable');
    const tableBody = document.getElementById('logTableBody');
    
    loading.style.display = 'block';
    table.style.display = 'none';
    hideMessage();
    
    // 构建URL
    let url = API_BASE_URL + '?page=' + currentPage + '&size=' + pageSize;
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            loading.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const data = response.data || [];
                        displayLogs(data);
                        totalPages = response.totalPages || 0;
                        totalElements = response.total || 0;
                        updatePaginationInfo();
                        table.style.display = 'block';
                    } else {
                        showMessage('加载失败: ' + response.message, 'error');
                        if (response.message && response.message.indexOf('权限不足') !== -1) {
                            setTimeout(function() {
                                window.location.href = '/pages/list.html';
                            }, 2000);
                        }
                    }
                } catch (e) {
                    showMessage('解析响应数据失败: ' + e.message, 'error');
                    console.error('解析错误:', e);
                }
            } else if (xhr.status === 401) {
                showMessage('未登录或登录已过期，请重新登录', 'error');
                setTimeout(function() {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else if (xhr.status === 403) {
                showMessage('权限不足，只有管理员可以查看操作日志', 'error');
                setTimeout(function() {
                    window.location.href = '/pages/list.html';
                }, 2000);
            } else {
                showMessage('加载失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        loading.style.display = 'none';
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 执行搜索
function doSearch(page = 0) {
    currentPage = page;
    
    // 收集搜索条件
    const username = document.getElementById('username').value.trim();
    const operation = document.getElementById('operation').value;
    const module = document.getElementById('module').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    // 构建查询参数
    let url = API_BASE_URL + '/search?page=' + currentPage + '&size=' + pageSize;
    if (username) url += '&username=' + encodeURIComponent(username);
    if (operation) url += '&operation=' + encodeURIComponent(operation);
    if (module) url += '&module=' + encodeURIComponent(module);
    if (startTime) {
        const isoStartTime = new Date(startTime).toISOString();
        url += '&startTime=' + encodeURIComponent(isoStartTime);
    }
    if (endTime) {
        const isoEndTime = new Date(endTime).toISOString();
        url += '&endTime=' + encodeURIComponent(isoEndTime);
    }
    
    const loading = document.getElementById('loading');
    const table = document.getElementById('logTable');
    const tableBody = document.getElementById('logTableBody');
    
    loading.style.display = 'block';
    table.style.display = 'none';
    hideMessage();
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            loading.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const data = response.data || [];
                        displayLogs(data);
                        totalPages = response.totalPages || 0;
                        totalElements = response.total || 0;
                        updatePaginationInfo();
                        table.style.display = 'block';
                        showMessage('搜索成功，共找到 ' + totalElements + ' 条记录', 'success');
                    } else {
                        showMessage('搜索失败: ' + response.message, 'error');
                    }
                } catch (e) {
                    showMessage('解析响应数据失败: ' + e.message, 'error');
                    console.error('解析错误:', e);
                }
            } else if (xhr.status === 401) {
                showMessage('未登录或登录已过期，请重新登录', 'error');
                setTimeout(function() {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else if (xhr.status === 403) {
                showMessage('权限不足，只有管理员可以查看操作日志', 'error');
                setTimeout(function() {
                    window.location.href = '/pages/list.html';
                }, 2000);
            } else {
                showMessage('搜索失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        loading.style.display = 'none';
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 显示日志列表
function displayLogs(logs) {
    const tableBody = document.getElementById('logTableBody');
    tableBody.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px;">未找到操作日志</td></tr>';
        return;
    }
    
    logs.forEach(function(log) {
        const row = document.createElement('tr');
        
        // 操作类型显示名称
        const operationNames = {
            'CREATE': '创建',
            'UPDATE': '更新',
            'DELETE': '删除',
            'IMPORT': '导入',
            'EXPORT': '导出',
            'SEARCH': '搜索',
            'ADVANCED_SEARCH': '高级搜索',
            'LOGIN': '登录',
            'LOGOUT': '登出',
            'BACKUP': '备份',
            'RESTORE': '恢复'
        };
        
        const operationName = operationNames[log.operation] || log.operation;
        
        // 结果标签样式
        let resultHtml = '';
        if (log.result === 'SUCCESS') {
            resultHtml = '<span class="status-badge status-success">成功</span>';
        } else if (log.result === 'FAILURE') {
            resultHtml = '<span class="status-badge status-error">失败</span>';
        } else {
            resultHtml = '<span>-</span>';
        }
        
        row.innerHTML = `
            <td>${log.id || ''}</td>
            <td>${escapeHtml(log.username || '')}</td>
            <td>${operationName}</td>
            <td>${escapeHtml(log.module || '')}</td>
            <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.description || '')}">${escapeHtml(log.description || '')}</td>
            <td>${escapeHtml(log.ipAddress || '')}</td>
            <td>${formatDateTime(log.operationTime) || ''}</td>
            <td>${log.targetId || ''}</td>
            <td>${resultHtml}</td>
            <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(log.errorMessage || '')}">${escapeHtml(log.errorMessage || '')}</td>
        `;
        tableBody.appendChild(row);
    });
}

// 清空表单
function clearForm() {
    document.getElementById('username').value = '';
    document.getElementById('operation').value = '';
    document.getElementById('module').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
    loadLogs(0);
}

// 更新分页信息
function updatePaginationInfo() {
    const paginationInfo = document.getElementById('paginationInfo');
    const pageInfo = document.getElementById('pageInfo');
    const firstBtn = document.getElementById('firstBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const lastBtn = document.getElementById('lastBtn');
    
    if (paginationInfo) {
        const start = totalElements > 0 ? currentPage * pageSize + 1 : 0;
        const end = Math.min((currentPage + 1) * pageSize, totalElements);
        paginationInfo.textContent = `显示第 ${start}-${end} 条，共 ${totalElements} 条记录`;
    }
    
    if (pageInfo) {
        pageInfo.textContent = `第 ${currentPage + 1} 页 / 共 ${totalPages || 1} 页`;
    }
    
    if (firstBtn) {
        firstBtn.disabled = currentPage === 0;
        firstBtn.style.opacity = currentPage === 0 ? '0.5' : '1';
        firstBtn.style.cursor = currentPage === 0 ? 'not-allowed' : 'pointer';
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 0;
        prevBtn.style.opacity = currentPage === 0 ? '0.5' : '1';
        prevBtn.style.cursor = currentPage === 0 ? 'not-allowed' : 'pointer';
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages - 1;
        nextBtn.style.opacity = currentPage >= totalPages - 1 ? '0.5' : '1';
        nextBtn.style.cursor = currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer';
    }
    
    if (lastBtn) {
        lastBtn.disabled = currentPage >= totalPages - 1;
        lastBtn.style.opacity = currentPage >= totalPages - 1 ? '0.5' : '1';
        lastBtn.style.cursor = currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer';
    }
}

// 首页
function firstPage() {
    if (currentPage > 0) {
        // 检查是否有搜索条件
        const hasSearch = document.getElementById('username').value.trim() || 
                         document.getElementById('operation').value || 
                         document.getElementById('module').value ||
                         document.getElementById('startTime').value ||
                         document.getElementById('endTime').value;
        if (hasSearch) {
            doSearch(0);
        } else {
            loadLogs(0);
        }
    }
}

// 上一页
function previousPage() {
    if (currentPage > 0) {
        const hasSearch = document.getElementById('username').value.trim() || 
                         document.getElementById('operation').value || 
                         document.getElementById('module').value ||
                         document.getElementById('startTime').value ||
                         document.getElementById('endTime').value;
        if (hasSearch) {
            doSearch(currentPage - 1);
        } else {
            loadLogs(currentPage - 1);
        }
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages - 1) {
        const hasSearch = document.getElementById('username').value.trim() || 
                         document.getElementById('operation').value || 
                         document.getElementById('module').value ||
                         document.getElementById('startTime').value ||
                         document.getElementById('endTime').value;
        if (hasSearch) {
            doSearch(currentPage + 1);
        } else {
            loadLogs(currentPage + 1);
        }
    }
}

// 最后一页
function lastPage() {
    if (totalPages > 0 && currentPage < totalPages - 1) {
        const hasSearch = document.getElementById('username').value.trim() || 
                         document.getElementById('operation').value || 
                         document.getElementById('module').value ||
                         document.getElementById('startTime').value ||
                         document.getElementById('endTime').value;
        if (hasSearch) {
            doSearch(totalPages - 1);
        } else {
            loadLogs(totalPages - 1);
        }
    }
}

// 改变每页大小
function changePageSize() {
    const sizeSelect = document.getElementById('pageSizeSelect');
    if (sizeSelect) {
        pageSize = parseInt(sizeSelect.value);
        const hasSearch = document.getElementById('username').value.trim() || 
                         document.getElementById('operation').value || 
                         document.getElementById('module').value ||
                         document.getElementById('startTime').value ||
                         document.getElementById('endTime').value;
        if (hasSearch) {
            doSearch(0);
        } else {
            loadLogs(0);
        }
    }
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 格式化日期时间
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '';
    const date = new Date(dateTimeStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 显示消息
function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';
    
    setTimeout(function() {
        hideMessage();
    }, 3000);
}

// 隐藏消息
function hideMessage() {
    const message = document.getElementById('message');
    message.style.display = 'none';
}

