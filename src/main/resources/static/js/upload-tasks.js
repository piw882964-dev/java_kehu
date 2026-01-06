// 上传任务列表页面的JavaScript
const API_BASE_URL = '/api/upload-tasks';

var currentPage = 0;
var pageSize = 20;
var totalPages = 0;
var totalElements = 0;
var selectedTaskIds = [];

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadTasks();
});

// 加载任务列表
function loadTasks() {
    const loadingEl = document.getElementById('loading');
    const tableEl = document.getElementById('taskTable');
    
    loadingEl.style.display = 'block';
    tableEl.style.display = 'none';
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '?page=' + currentPage + '&size=' + pageSize, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            loadingEl.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        displayTasks(response.data);
                        totalPages = response.totalPages || 0;
                        totalElements = response.total || 0;
                        updatePaginationInfo();
                        updatePageButtons();
                    } else {
                        showMessage('加载失败: ' + response.message, 'error');
                    }
                } catch (e) {
                    showMessage('解析数据失败: ' + e.message, 'error');
                }
            } else {
                showMessage('加载失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.send();
}

// 显示任务列表
function displayTasks(tasks) {
    const tbody = document.getElementById('taskTableBody');
    const tableEl = document.getElementById('taskTable');
    
    if (!tasks || tasks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 20px;">暂无数据</td></tr>';
        tableEl.style.display = 'block';
        return;
    }
    
    let html = '';
    tasks.forEach(function(task) {
        const statusClass = getStatusClass(task.status);
        const uploadTime = formatDateTime(task.uploadTime);
        const completeTime = task.completeTime ? formatDateTime(task.completeTime) : '-';
        const remarks = task.remarks || '';
        
        html += '<tr>';
        html += '<td><input type="checkbox" class="checkbox task-checkbox" value="' + task.id + '" onchange="updateSelectedTasks()"></td>';
        html += '<td>' + task.id + '</td>';
        html += '<td>' + escapeHtml(task.fileName || '') + '</td>';
        html += '<td>' + (task.totalCount || 0) + '</td>';
        html += '<td>' + (task.addedCount || 0) + '</td>';
        html += '<td>' + (task.existingCount || 0) + '</td>';
        html += '<td><span class="status-badge ' + statusClass + '">' + escapeHtml(task.status || '处理中') + '</span></td>';
        html += '<td>' + uploadTime + '</td>';
        html += '<td>' + completeTime + '</td>';
        html += '<td>';
        if (isAdmin()) {
            html += '<button onclick="deleteTask(' + task.id + ')" class="btn btn-danger btn-sm">× 删除</button>';
        } else {
            html += '<span style="color: #999;">只读模式</span>';
        }
        html += '</td>';
        html += '<td>';
        html += '<span class="remarks-editable" id="remark_' + task.id + '" onclick="editRemarks(' + task.id + ', this)" data-task-id="' + task.id + '">' + 
                (remarks || '点击添加备注') + '</span>';
        html += '</td>';
        html += '</tr>';
    });
    
    tbody.innerHTML = html;
    tableEl.style.display = 'block';
    
    // 加载备注
    tasks.forEach(function(task) {
        loadTaskRemark(task.id);
    });
}

// 获取状态样式类
function getStatusClass(status) {
    if (status === '添加完成') {
        return 'status-complete';
    } else if (status === '处理失败') {
        return 'status-failed';
    } else {
        return 'status-processing';
    }
}

// 格式化日期时间
function formatDateTime(dateTimeStr) {
    if (!dateTimeStr) return '-';
    try {
        const date = new Date(dateTimeStr);
        const year = date.getFullYear().toString().substr(2);
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes + ':' + seconds;
    } catch (e) {
        return dateTimeStr;
    }
}

// 转义HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 全选/取消全选
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.task-checkbox');
    checkboxes.forEach(function(cb) {
        cb.checked = checkbox.checked;
    });
    updateSelectedTasks();
}

// 更新选中的任务
function updateSelectedTasks() {
    selectedTaskIds = [];
    const checkboxes = document.querySelectorAll('.task-checkbox:checked');
    checkboxes.forEach(function(cb) {
        selectedTaskIds.push(parseInt(cb.value));
    });
    
    const batchDeleteBtn = document.getElementById('batchDeleteBtn');
    if (selectedTaskIds.length > 0 && isAdmin()) {
        batchDeleteBtn.style.display = 'inline-block';
    } else {
        batchDeleteBtn.style.display = 'none';
    }
}

// 删除任务
function deleteTask(id) {
    if (!isAdmin()) {
        showMessage('权限不足，只有管理员可以删除任务', 'error');
        return;
    }
    
    if (!confirm('确定要删除这个任务吗？')) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_BASE_URL + '/' + id, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showMessage('删除成功', 'success');
                    loadTasks();
                } else {
                    showMessage('删除失败: ' + response.message, 'error');
                }
            } else {
                showMessage('删除失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.send();
}

// 批量删除任务
function batchDeleteTasks() {
    if (!isAdmin()) {
        showMessage('权限不足，只有管理员可以删除任务', 'error');
        return;
    }
    
    if (selectedTaskIds.length === 0) {
        showMessage('请先选择要删除的任务', 'error');
        return;
    }
    
    if (!confirm('确定要删除选中的 ' + selectedTaskIds.length + ' 个任务吗？')) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_BASE_URL + '/batch', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showMessage('批量删除成功', 'success');
                    selectedTaskIds = [];
                    loadTasks();
                } else {
                    showMessage('批量删除失败: ' + response.message, 'error');
                }
            } else {
                showMessage('批量删除失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.send(JSON.stringify(selectedTaskIds));
}

// 编辑备注
function editRemarks(id, element) {
    if (!isAdmin()) {
        showMessage('权限不足，只有管理员可以编辑备注', 'error');
        return;
    }
    
    const currentText = element.textContent.trim();
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'remarks-input';
    input.value = currentText === '点击添加备注' ? '' : currentText;
    
    element.innerHTML = '';
    element.appendChild(input);
    input.focus();
    input.select();
    
    input.onblur = function() {
        const newText = input.value.trim();
        element.textContent = newText || '点击添加备注';
        saveTaskRemark(id, newText, element);
    };
    
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
}

// 保存任务备注
function saveTaskRemark(taskId, remarkText, element) {
    if (!isAdmin()) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', API_BASE_URL + '/' + taskId + '/remark', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    element.textContent = remarkText || '点击添加备注';
                } else {
                    showMessage('保存备注失败: ' + response.message, 'error');
                }
            }
        }
    };
    
    xhr.send(JSON.stringify({ remarks: remarkText }));
}

// 加载任务备注
function loadTaskRemark(taskId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/' + taskId, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.success && response.data) {
                    const task = response.data;
                    const element = document.getElementById('remark_' + taskId);
                    if (element) {
                        element.textContent = task.remarks || '点击添加备注';
                    }
                }
            } catch (e) {
                console.error('加载备注失败:', e);
            }
        }
    };
    
    xhr.send();
}

// 分页相关函数
function changePageSize() {
    pageSize = parseInt(document.getElementById('pageSizeSelect').value);
    currentPage = 0;
    loadTasks();
}

function previousPage() {
    if (currentPage > 0) {
        currentPage--;
        loadTasks();
    }
}

function nextPage() {
    if (currentPage < totalPages - 1) {
        currentPage++;
        loadTasks();
    }
}

function updatePaginationInfo() {
    const start = currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, totalElements);
    document.getElementById('paginationInfo').textContent = 
        '显示第 ' + start + '-' + end + ' 条，共 ' + totalElements + ' 条记录';
}

function updatePageButtons() {
    document.getElementById('pageInfo').textContent = 
        '第 ' + (currentPage + 1) + ' 页 / 共 ' + totalPages + ' 页';
    document.getElementById('prevBtn').disabled = currentPage === 0;
    document.getElementById('nextBtn').disabled = currentPage >= totalPages - 1;
}

// 显示消息
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = 'message ' + type;
    messageEl.style.display = 'block';
    
    setTimeout(function() {
        messageEl.style.display = 'none';
    }, 3000);
}

