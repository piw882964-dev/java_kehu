// 数据备份页面的Ajax交互
const API_BASE_URL = '/api/backup';

var selectedFile = null;

// 页面加载时
document.addEventListener('DOMContentLoaded', function() {
    loadBackupList();
});

// 创建备份
function createBackup() {
    const createBtn = document.getElementById('createBackupBtn');
    const backupStatus = document.getElementById('backupStatus');
    
    createBtn.disabled = true;
    createBtn.textContent = '创建中...';
    backupStatus.style.display = 'block';
    backupStatus.innerHTML = '<span style="color: #1890ff;">正在创建备份，请稍候...</span>';
    hideMessage();
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE_URL + '/create', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            createBtn.disabled = false;
            createBtn.textContent = '创建备份';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        backupStatus.innerHTML = '<span style="color: #52c41a;">✓ 备份创建成功：' + response.fileName + '</span>';
                        showMessage('备份创建成功', 'success');
                        // 刷新备份列表
                        setTimeout(function() {
                            loadBackupList();
                        }, 1000);
                    } else {
                        backupStatus.innerHTML = '<span style="color: #ff4d4f;">✗ 备份失败：' + response.message + '</span>';
                        showMessage('备份失败: ' + response.message, 'error');
                    }
                } catch (e) {
                    backupStatus.innerHTML = '<span style="color: #ff4d4f;">✗ 解析响应失败</span>';
                    showMessage('解析响应数据失败: ' + e.message, 'error');
                    console.error('解析错误:', e);
                }
            } else if (xhr.status === 401) {
                backupStatus.innerHTML = '<span style="color: #ff4d4f;">✗ 未登录或登录已过期</span>';
                showMessage('未登录或登录已过期，请重新登录', 'error');
                setTimeout(function() {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else if (xhr.status === 403) {
                backupStatus.innerHTML = '<span style="color: #ff4d4f;">✗ 权限不足</span>';
                showMessage('权限不足，只有管理员可以创建备份', 'error');
            } else {
                backupStatus.innerHTML = '<span style="color: #ff4d4f;">✗ 备份失败，状态码: ' + xhr.status + '</span>';
                showMessage('备份失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        createBtn.disabled = false;
        createBtn.textContent = '创建备份';
        backupStatus.innerHTML = '<span style="color: #ff4d4f;">✗ 网络错误</span>';
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 加载备份文件列表
function loadBackupList() {
    const loading = document.getElementById('loading');
    const backupList = document.getElementById('backupList');
    const backupListContent = document.getElementById('backupListContent');
    const noBackupFiles = document.getElementById('noBackupFiles');
    
    loading.style.display = 'block';
    backupList.style.display = 'none';
    noBackupFiles.style.display = 'none';
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/list', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            loading.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const files = response.data || [];
                        displayBackupList(files);
                        if (files.length === 0) {
                            noBackupFiles.style.display = 'block';
                            backupList.style.display = 'none';
                        } else {
                            backupList.style.display = 'block';
                            noBackupFiles.style.display = 'none';
                        }
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
                showMessage('权限不足，只有管理员可以查看备份列表', 'error');
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

// 显示备份文件列表
function displayBackupList(files) {
    const backupListContent = document.getElementById('backupListContent');
    backupListContent.innerHTML = '';
    
    files.forEach(function(fileName) {
        const item = document.createElement('div');
        item.className = 'backup-file-item';
        
        item.innerHTML = `
            <div class="file-name">${escapeHtml(fileName)}</div>
            <div class="file-actions">
                <button onclick="downloadBackup('${escapeHtml(fileName)}')" class="btn btn-info btn-sm">下载</button>
                <button onclick="deleteBackup('${escapeHtml(fileName)}')" class="btn btn-danger btn-sm">删除</button>
            </div>
        `;
        
        backupListContent.appendChild(item);
    });
}

// 下载备份文件
function downloadBackup(fileName) {
    const url = API_BASE_URL + '/download/' + encodeURIComponent(fileName);
    window.open(url, '_blank');
    showMessage('开始下载: ' + fileName, 'success');
}

// 删除备份文件
function deleteBackup(fileName) {
    if (!confirm('确定要删除备份文件 "' + fileName + '" 吗？此操作不可恢复！')) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_BASE_URL + '/' + encodeURIComponent(fileName), true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        showMessage('删除成功', 'success');
                        loadBackupList();
                    } else {
                        showMessage('删除失败: ' + response.message, 'error');
                    }
                } catch (e) {
                    showMessage('解析响应数据失败', 'error');
                    console.error('解析错误:', e);
                }
            } else if (xhr.status === 401) {
                showMessage('未登录或登录已过期，请重新登录', 'error');
                setTimeout(function() {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else if (xhr.status === 403) {
                showMessage('权限不足，只有管理员可以删除备份', 'error');
            } else {
                showMessage('删除失败，状态码: ' + xhr.status, 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        if (file.name.toLowerCase().endsWith('.sql')) {
            selectedFile = file;
            const selectedFileName = document.getElementById('selectedFileName');
            const selectedFileDiv = document.getElementById('selectedFile');
            const restoreBtn = document.getElementById('restoreBtn');
            
            selectedFileName.textContent = '已选择: ' + file.name + ' (' + formatFileSize(file.size) + ')';
            selectedFileDiv.style.display = 'block';
            restoreBtn.disabled = false;
        } else {
            showMessage('请选择 .sql 格式的备份文件', 'error');
            event.target.value = '';
        }
    }
}

// 处理拖拽
function handleDragOver(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.add('dragover');
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
}

function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove('dragover');
    
    const files = event.dataTransfer.files;
    if (files.length > 0) {
        const file = files[0];
        if (file.name.toLowerCase().endsWith('.sql')) {
            selectedFile = file;
            const selectedFileName = document.getElementById('selectedFileName');
            const selectedFileDiv = document.getElementById('selectedFile');
            const restoreBtn = document.getElementById('restoreBtn');
            
            selectedFileName.textContent = '已选择: ' + file.name + ' (' + formatFileSize(file.size) + ')';
            selectedFileDiv.style.display = 'block';
            restoreBtn.disabled = false;
        } else {
            showMessage('请选择 .sql 格式的备份文件', 'error');
        }
    }
}

// 清除选择的文件
function clearSelectedFile() {
    selectedFile = null;
    document.getElementById('fileInput').value = '';
    document.getElementById('selectedFile').style.display = 'none';
    document.getElementById('restoreBtn').disabled = true;
}

// 恢复数据库
function restoreDatabase() {
    if (!selectedFile) {
        showMessage('请先选择要恢复的备份文件', 'error');
        return;
    }
    
    if (!confirm('⚠️ 警告：恢复操作会覆盖现有数据库的所有数据！\n\n确定要继续吗？')) {
        return;
    }
    
    if (!confirm('最后确认：此操作不可撤销，确定要继续恢复吗？')) {
        return;
    }
    
    const restoreBtn = document.getElementById('restoreBtn');
    restoreBtn.disabled = true;
    restoreBtn.textContent = '恢复中...';
    hideMessage();
    
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE_URL + '/restore', true);
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            restoreBtn.disabled = false;
            restoreBtn.textContent = '恢复数据库';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        showMessage('数据库恢复成功！页面将在3秒后刷新...', 'success');
                        clearSelectedFile();
                        setTimeout(function() {
                            window.location.reload();
                        }, 3000);
                    } else {
                        showMessage('恢复失败: ' + response.message, 'error');
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
                showMessage('权限不足，只有管理员可以恢复数据库', 'error');
            } else {
                let errorMsg = '恢复失败，状态码: ' + xhr.status;
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    if (errorResponse.message) {
                        errorMsg = errorResponse.message;
                    }
                } catch (e) {
                    // 忽略解析错误
                }
                showMessage(errorMsg, 'error');
            }
        }
    };
    
    xhr.upload.onprogress = function(event) {
        if (event.lengthComputable) {
            const percentComplete = (event.loaded / event.total) * 100;
            restoreBtn.textContent = '上传中... ' + Math.round(percentComplete) + '%';
        }
    };
    
    xhr.onerror = function() {
        restoreBtn.disabled = false;
        restoreBtn.textContent = '恢复数据库';
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send(formData);
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// HTML转义
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 显示消息
function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';
    
    setTimeout(function() {
        hideMessage();
    }, 5000);
}

// 隐藏消息
function hideMessage() {
    const message = document.getElementById('message');
    message.style.display = 'none';
}

