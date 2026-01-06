// 客户列表页面的Ajax交互
const API_BASE_URL = '/api/customers';

// 分页参数
var currentPage = 0;
var pageSize = 20;
var totalPages = 0;
var totalElements = 0;
var searchKeyword = ''; // 搜索关键词

// 页面加载时自动加载客户列表
document.addEventListener('DOMContentLoaded', function() {
    // 等待用户角色加载完成后再加载客户列表
    // 如果用户信息已加载，直接加载列表；否则等待用户信息加载完成
    if (typeof currentUserRole !== 'undefined' && currentUserRole !== 'VIEWER') {
        // 角色已加载，直接加载列表
        loadCustomers();
    } else {
        // 等待用户信息加载完成（最多等待2秒）
        let waitCount = 0;
        const checkRole = setInterval(function() {
            waitCount++;
            if (typeof currentUserRole !== 'undefined' && currentUserRole !== 'VIEWER') {
                clearInterval(checkRole);
                loadCustomers();
            } else if (waitCount >= 20) {
                // 2秒后仍未加载完成，直接加载（可能是VIEWER用户）
                clearInterval(checkRole);
                loadCustomers();
            }
        }, 100);
    }
    
    // 延迟加载统计数据，先让页面显示出来
    setTimeout(function() {
        loadTotalCount();
        updateStats();
        // 启动今日新增的定时刷新（每5秒刷新一次）
        startTodayCountRefresh();
    }, 500);
});

// 页面卸载时停止定时刷新
window.addEventListener('beforeunload', function() {
    stopTodayCountRefresh();
});

// 加载客户总数
function loadTotalCount() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/count', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 5000; // 设置5秒超时
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        totalElements = response.total || 0;
                        updatePaginationInfo();
                    }
                } catch (e) {
                    console.error('解析总数失败:', e);
                }
            } else if (xhr.status === 401) {
                console.warn('未登录，无法获取总数');
            }
        }
    };
    
    xhr.ontimeout = function() {
        // 超时不影响页面使用，分页信息会使用当前页数据更新
        console.warn('获取总数超时，使用当前页数据');
    };
    
    xhr.onerror = function() {
        console.error('获取总数失败');
    };
    
    xhr.send();
}

// 加载客户列表（分页）
function loadCustomers(page = 0, size = 20) {
    currentPage = page;
    pageSize = size;
    
    const loading = document.getElementById('loading');
    const table = document.getElementById('customerTable');
    const tableBody = document.getElementById('customerTableBody');
    const message = document.getElementById('message');
    
    loading.style.display = 'block';
    table.style.display = 'none';
    hideMessage();
    
    // 构建请求URL
    var url = API_BASE_URL + '?page=' + page + '&size=' + size;
    // 确保searchKeyword已定义
    if (typeof searchKeyword !== 'undefined' && searchKeyword) {
        // 如果有搜索关键词，使用搜索接口（需要后端支持）
        url = API_BASE_URL + '/search?keyword=' + encodeURIComponent(searchKeyword) + '&page=' + page + '&size=' + size;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true; // 确保携带Cookie（Session）
    
    // 添加调试日志
    // 请求数据中，不输出URL避免泄露信息
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            loading.style.display = 'none';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    
                    if (response.success) {
                        const data = response.data || [];
                        // 不输出敏感数据到控制台
                        
                        if (data.length > 0) {
                            displayCustomers(data);
                            totalPages = response.totalPages || 0;
                            totalElements = response.total || 0;
                            updatePaginationInfo();
                            updateStats();
                            table.style.display = 'block';
                            showMessage('加载成功，共 ' + totalElements + ' 条记录', 'success');
                        } else if (response.total > 0) {
                            // 如果总数大于0但当前页没有数据，可能是分页问题
                            showMessage('当前页没有数据，但数据库中共有 ' + response.total + ' 条记录', 'error');
                            table.style.display = 'block';
                        } else {
                            showMessage('数据库中没有数据，请先添加客户', 'error');
                            table.style.display = 'block';
                        }
                    } else {
                        showMessage('加载失败: ' + response.message, 'error');
                        console.error('API返回错误:', response);
                    }
                } catch (e) {
                    showMessage('解析响应数据失败: ' + e.message, 'error');
                    console.error('解析错误:', e, '响应内容:', xhr.responseText);
                }
            } else if (xhr.status === 401) {
                showMessage('未登录或登录已过期，请重新登录', 'error');
                console.error('未授权，需要登录');
                setTimeout(function() {
                    window.location.href = '/pages/login.html';
                }, 2000);
            } else {
                let errorMsg = '请求失败，状态码: ' + xhr.status;
                try {
                    const errorResponse = JSON.parse(xhr.responseText);
                    if (errorResponse.message) {
                        errorMsg = errorResponse.message;
                    }
                } catch (e) {
                    // 忽略解析错误
                }
                showMessage(errorMsg, 'error');
                console.error('请求失败:', xhr.status, '响应:', xhr.responseText);
            }
        }
    };
    
    xhr.onerror = function() {
        loading.style.display = 'none';
        showMessage('网络错误，请检查连接和服务器状态', 'error');
        console.error('网络请求错误');
    };
    
    xhr.send();
}

// 显示客户列表
function displayCustomers(customers) {
    const tableBody = document.getElementById('customerTableBody');
    if (!tableBody) {
        console.error('找不到表格tbody元素');
        return;
    }
    
    tableBody.innerHTML = '';
    
    if (!customers || customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 40px;">暂无客户数据</td></tr>';
        return;
    }
    
    customers.forEach(function(customer, index) {
        // 不输出敏感数据到控制台
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="checkbox" value="${customer.id || ''}" onchange="updateSelectAllState()">
            </td>
            <td>${customer.id || ''}</td>
            <td>${escapeHtml(customer.name || '')}</td>
            <td>${escapeHtml(customer.phone || '')}</td>
            <td>${escapeHtml(customer.email || '')}</td>
            <td>${escapeHtml(customer.uploadFileName || '')}</td>
            <td>${formatDateTime(customer.createTime) || ''}</td>
            <td>${formatDateTime(customer.updateTime) || ''}</td>
            <td>
                <span class="status-badge status-success">正常</span>
            </td>
            <td>
                <div class="operation-buttons">
                    ${isAdmin() ? `<button onclick="deleteCustomer(${customer.id || 0})" class="btn btn-danger btn-sm">× 删除</button>
                    <button onclick="editCustomer(${customer.id || 0})" class="btn btn-info btn-sm">修改</button>` : '<span style="color: #999;">只读模式</span>'}
                </div>
            </td>
            <td>
                <span class="remarks-editable" id="remark_${customer.id || 0}" onclick="editRemarks(${customer.id || 0}, this)" data-customer-id="${customer.id || 0}">加载中...</span>
            </td>
        `;
        tableBody.appendChild(row);
    });
    
    // 数据展示完成，不输出敏感信息
    
    // 加载所有客户的备注
    customers.forEach(function(customer) {
        if (customer.id) {
            loadCustomerRemark(customer.id);
        }
    });
}

// HTML转义函数，防止XSS攻击
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 全选/取消全选
function toggleSelectAll(checkbox) {
    const checkboxes = document.querySelectorAll('.data-table tbody .checkbox');
    checkboxes.forEach(function(cb) {
        cb.checked = checkbox.checked;
    });
}

// 更新全选状态
function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('.data-table tbody .checkbox');
    const selectAll = document.querySelector('.select-all-checkbox');
    const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
    selectAll.checked = checkedCount === checkboxes.length && checkboxes.length > 0;
}

// 编辑客户
function editCustomer(id) {
    window.location.href = '/pages/edit.html?id=' + id;
}

// 删除单个客户
function deleteCustomer(id) {
    if (!confirm('确定要删除这个客户吗？此操作不可恢复！')) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_BASE_URL + '/' + id, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showMessage('删除成功', 'success');
                    loadCustomers();
                    // 立即刷新统计信息
                    loadTotalCount();
                    loadTodayCount();
                } else {
                    showMessage('删除失败: ' + response.message, 'error');
                }
            } else {
                const response = JSON.parse(xhr.responseText);
                showMessage('删除失败: ' + (response.message || '服务器错误'), 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 批量删除（优化：使用批量删除接口，避免卡顿）
function batchDelete() {
    const checkboxes = document.querySelectorAll('.data-table tbody .checkbox:checked');
    if (checkboxes.length === 0) {
        showMessage('请至少选择一个客户', 'error');
        return;
    }
    
    if (!confirm('确定要删除选中的 ' + checkboxes.length + ' 个客户吗？此操作不可恢复！')) {
        return;
    }
    
    const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    // 显示删除进度
    const deleteBtn = document.querySelector('.btn-danger');
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.textContent = '正在删除...';
    }
    
    // 使用批量删除接口（一次性删除所有选中的客户）
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_BASE_URL + '/batch', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            // 恢复按钮状态
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '批量删除';
            }
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const deletedCount = response.deletedCount || ids.length;
                        showMessage('成功删除 ' + deletedCount + ' 个客户', 'success');
                        
                        // 刷新列表和统计
                        loadCustomers();
                        loadTotalCount();
                        loadTodayCount();
                    } else {
                        showMessage('删除失败: ' + (response.message || '未知错误'), 'error');
                    }
                } catch (e) {
                    showMessage('解析响应失败: ' + e.message, 'error');
                }
            } else if (xhr.status === 401) {
                showMessage('登录已过期，请重新登录', 'error');
                setTimeout(() => {
                    window.location.href = '/pages/login.html';
                }, 1500);
            } else if (xhr.status === 403) {
                showMessage('权限不足，只有管理员可以删除客户', 'error');
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    showMessage('删除失败: ' + (response.message || '服务器错误'), 'error');
                } catch (e) {
                    showMessage('删除失败，状态码: ' + xhr.status, 'error');
                }
            }
        }
    };
    
    xhr.onerror = function() {
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = '批量删除';
        }
        showMessage('网络错误，请检查连接', 'error');
    };
    
    // 发送批量删除请求
    xhr.send(JSON.stringify({ ids: ids }));
}

// 加载客户备注
function loadCustomerRemark(customerId) {
    const remarkElement = document.getElementById('remark_' + customerId);
    if (!remarkElement) return;
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/' + customerId + '/remark', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        if (response.hasRemark && response.data && response.data.remarks) {
                            remarkElement.textContent = response.data.remarks;
                            remarkElement.title = '点击编辑备注';
                        } else {
                            remarkElement.textContent = '点击添加备注';
                            remarkElement.title = '点击添加备注';
                        }
                    }
                } catch (e) {
                    console.error('解析备注失败:', e);
                    remarkElement.textContent = '点击添加备注';
                }
            } else {
                remarkElement.textContent = '点击添加备注';
            }
        }
    };
    
    xhr.onerror = function() {
        remarkElement.textContent = '点击添加备注';
    };
    
    xhr.send();
}

// 编辑备注（完整功能，支持保存）
function editRemarks(id, element) {
    // 如果当前正在编辑，不重复触发
    if (element.querySelector('input')) {
        return;
    }
    
    const currentText = element.textContent.trim();
    const isPlaceholder = currentText === '点击添加备注' || currentText === '加载中...';
    
    // 创建输入框
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'remarks-input';
    input.value = isPlaceholder ? '' : currentText;
    input.style.width = '200px';
    input.style.maxWidth = '100%';
    
    // 保存备注
    const saveRemark = function() {
        const newText = input.value.trim();
        const oldText = element.textContent.trim();
        
        // 如果内容没有变化，直接恢复显示
        if (newText === oldText || (newText === '' && isPlaceholder)) {
            element.textContent = oldText === '点击添加备注' || oldText === '加载中...' ? '点击添加备注' : oldText;
            return;
        }
        
        // 显示保存中状态
        element.textContent = '保存中...';
        element.style.color = '#999';
        
        // 调用API保存备注
        const xhr = new XMLHttpRequest();
        xhr.open('POST', API_BASE_URL + '/' + id + '/remark', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            // 保存成功，更新显示
                            if (newText) {
                                element.textContent = newText;
                                element.title = '点击编辑备注';
                                element.style.color = '#333';
                            } else {
                                element.textContent = '点击添加备注';
                                element.title = '点击添加备注';
                                element.style.color = '#1890ff';
                            }
                            
                            // 显示成功提示（可选）
                            showMessage('备注保存成功', 'success');
                        } else {
                            // 保存失败，恢复原值
                            element.textContent = oldText === '点击添加备注' || oldText === '加载中...' ? '点击添加备注' : oldText;
                            element.style.color = '#1890ff';
                            showMessage('保存失败: ' + response.message, 'error');
                        }
                    } catch (e) {
                        console.error('解析保存结果失败:', e);
                        element.textContent = oldText === '点击添加备注' || oldText === '加载中...' ? '点击添加备注' : oldText;
                        element.style.color = '#1890ff';
                    }
                } else if (xhr.status === 403) {
                    // 权限不足
                    element.textContent = oldText === '点击添加备注' || oldText === '加载中...' ? '点击添加备注' : oldText;
                    element.style.color = '#1890ff';
                    showMessage('权限不足，只有管理员可以添加备注', 'error');
                } else {
                    // 其他错误
                    element.textContent = oldText === '点击添加备注' || oldText === '加载中...' ? '点击添加备注' : oldText;
                    element.style.color = '#1890ff';
                    showMessage('保存失败，请重试', 'error');
                }
            }
        };
        
        xhr.onerror = function() {
            element.textContent = oldText === '点击添加备注' || oldText === '加载中...' ? '点击添加备注' : oldText;
            element.style.color = '#1890ff';
            showMessage('网络错误，请检查连接', 'error');
        };
        
        xhr.send(JSON.stringify({ remarks: newText }));
    };
    
    // 失去焦点时保存
    input.onblur = saveRemark;
    
    // 按Enter键保存
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            input.blur();
        }
        // ESC键取消
        if (e.key === 'Escape') {
            element.textContent = isPlaceholder ? '点击添加备注' : currentText;
            element.style.color = '#1890ff';
        }
    };
    
    // 替换元素内容为输入框
    element.textContent = '';
    element.style.color = '#333';
    element.appendChild(input);
    input.focus();
    input.select();
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
    
    // 更新首页按钮状态（不使用disabled属性，只用样式，确保onclick可以触发）
    if (firstBtn) {
        const isDisabled = currentPage === 0;
        if (isDisabled) {
            firstBtn.style.opacity = '0.5';
            firstBtn.style.cursor = 'not-allowed';
            firstBtn.title = '已经是首页';
        } else {
            firstBtn.style.opacity = '1';
            firstBtn.style.cursor = 'pointer';
            firstBtn.title = '跳转到首页';
        }
    }
    
    // 更新上一页按钮状态
    if (prevBtn) {
        const isDisabled = currentPage === 0;
        if (isDisabled) {
            prevBtn.style.opacity = '0.5';
            prevBtn.style.cursor = 'not-allowed';
            prevBtn.title = '已经是首页';
        } else {
            prevBtn.style.opacity = '1';
            prevBtn.style.cursor = 'pointer';
            prevBtn.title = '上一页';
        }
    }
    
    // 更新下一页按钮状态
    if (nextBtn) {
        const isDisabled = currentPage >= totalPages - 1;
        if (isDisabled) {
            nextBtn.style.opacity = '0.5';
            nextBtn.style.cursor = 'not-allowed';
            nextBtn.title = '已经是最后一页';
        } else {
            nextBtn.style.opacity = '1';
            nextBtn.style.cursor = 'pointer';
            nextBtn.title = '下一页';
        }
    }
    
    // 更新最后一页按钮状态
    if (lastBtn) {
        const isDisabled = currentPage >= totalPages - 1;
        if (isDisabled) {
            lastBtn.style.opacity = '0.5';
            lastBtn.style.cursor = 'not-allowed';
            lastBtn.title = '已经是最后一页';
        } else {
            lastBtn.style.opacity = '1';
            lastBtn.style.cursor = 'pointer';
            lastBtn.title = '跳转到最后一页';
        }
    }
}

// 首页
function firstPage() {
    // 如果已经在首页，直接返回
    if (currentPage === 0 || totalPages === 0) {
        return;
    }
    loadCustomers(0, pageSize);
}

// 上一页
function previousPage() {
    // 如果已经在第一页，直接返回
    if (currentPage === 0) {
        return;
    }
    loadCustomers(currentPage - 1, pageSize);
}

// 下一页
function nextPage() {
    // 如果已经在最后一页，直接返回
    if (totalPages === 0 || currentPage >= totalPages - 1) {
        return;
    }
    loadCustomers(currentPage + 1, pageSize);
}

// 最后一页
function lastPage() {
    // 如果没有数据或已经在最后一页，直接返回
    if (totalPages === 0 || currentPage >= totalPages - 1) {
        return;
    }
    loadCustomers(totalPages - 1, pageSize);
}

// 跳转到指定页
function goToPage(page) {
    if (page >= 0 && page < totalPages) {
        loadCustomers(page, pageSize);
    }
}

// 改变每页大小
function changePageSize() {
    const sizeSelect = document.getElementById('pageSizeSelect');
    if (sizeSelect) {
        pageSize = parseInt(sizeSelect.value);
        loadCustomers(0, pageSize);
    }
}

// 搜索客户
function searchCustomers() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchKeyword = searchInput.value.trim();
        loadCustomers(0, pageSize);
    }
}

// 清除搜索
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchKeyword = '';
        loadCustomers(0, pageSize);
    }
}

// 更新统计信息
function updateStats() {
    // 更新总客户数
    const totalCountEl = document.getElementById('totalCount');
    if (totalCountEl) {
        totalCountEl.textContent = totalElements;
    }
    
    // 更新当前页显示数
    const currentPageCountEl = document.getElementById('currentPageCount');
    if (currentPageCountEl) {
        const tableBody = document.getElementById('customerTableBody');
        const currentCount = tableBody ? tableBody.querySelectorAll('tr').length : 0;
        currentPageCountEl.textContent = currentCount;
    }
    
    // 更新今日新增
    loadTodayCount();
}

// 加载今日新增数量（从数据库实时查询）
// 添加错误计数，避免频繁报错
let todayCountErrorCount = 0;
const MAX_ERROR_COUNT = 3; // 最多连续错误3次后停止报错

function loadTodayCount() {
    const todayCountEl = document.getElementById('todayCount');
    if (!todayCountEl) return;
    
    // 如果连续错误次数过多，暂时跳过本次请求（避免消耗资源）
    if (todayCountErrorCount >= MAX_ERROR_COUNT * 3) {
        return; // 静默跳过，不打印错误
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/count/today', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.timeout = 5000; // 设置5秒超时
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        const count = response.count || 0;
                        todayCountEl.textContent = count;
                        // 成功时重置错误计数
                        todayCountErrorCount = 0;
                        
                        // 如果有新增，添加动画效果
                        if (count > 0) {
                            todayCountEl.style.animation = 'none';
                            setTimeout(function() {
                                todayCountEl.style.animation = 'pulse 0.5s ease-in-out';
                            }, 10);
                        }
                    } else {
                        // 服务器返回错误，但不要频繁报错
                        if (todayCountErrorCount < MAX_ERROR_COUNT) {
                            console.warn('获取今日新增失败: ' + (response.message || '未知错误'));
                        }
                        todayCountErrorCount++;
                    }
                } catch (e) {
                    // 解析错误，但不要频繁报错
                    if (todayCountErrorCount < MAX_ERROR_COUNT) {
                        console.error('解析今日新增失败:', e);
                    }
                    todayCountErrorCount++;
                }
            } else if (xhr.status === 401) {
                // 未登录，停止刷新
                stopTodayCountRefresh();
                console.warn('未登录，无法获取今日新增');
            } else {
                // 其他HTTP错误，但不要频繁报错
                if (todayCountErrorCount < MAX_ERROR_COUNT) {
                    console.warn('获取今日新增失败，状态码: ' + xhr.status);
                }
                todayCountErrorCount++;
            }
        }
    };
    
    xhr.onerror = function() {
        // 网络错误（如ERR_INTERNET_DISCONNECTED），但不要频繁报错
        if (todayCountErrorCount < MAX_ERROR_COUNT) {
            console.warn('获取今日新增失败: 网络错误（可能是网络断开）');
        }
        todayCountErrorCount++;
        
        // 如果连续错误次数过多，暂时停止刷新（避免消耗资源）
        if (todayCountErrorCount >= MAX_ERROR_COUNT * 3) {
            console.warn('获取今日新增连续失败，暂停自动刷新。网络恢复后请刷新页面。');
            stopTodayCountRefresh();
        }
    };
    
    xhr.ontimeout = function() {
        // 超时错误，但不要频繁报错
        if (todayCountErrorCount < MAX_ERROR_COUNT) {
            console.warn('获取今日新增超时');
        }
        todayCountErrorCount++;
    };
    
    xhr.send();
}

// 定时刷新今日新增（每5秒刷新一次）
let todayCountRefreshInterval = null;

function startTodayCountRefresh() {
    // 重置错误计数
    todayCountErrorCount = 0;
    
    // 先立即加载一次
    loadTodayCount();
    
    // 清除之前的定时器（如果存在）
    if (todayCountRefreshInterval) {
        clearInterval(todayCountRefreshInterval);
    }
    
    // 每5秒刷新一次（如果网络正常）
    // 如果连续错误，会自动停止刷新
    todayCountRefreshInterval = setInterval(function() {
        // 只有在错误次数不太多时才继续刷新
        if (todayCountErrorCount < MAX_ERROR_COUNT * 2) {
            loadTodayCount();
        }
    }, 5000);
}

function stopTodayCountRefresh() {
    if (todayCountRefreshInterval) {
        clearInterval(todayCountRefreshInterval);
        todayCountRefreshInterval = null;
    }
}

// 导出数据
function exportData() {
    const tableBody = document.getElementById('customerTableBody');
    if (!tableBody) {
        showMessage('没有数据可导出', 'error');
        return;
    }
    
    const rows = tableBody.querySelectorAll('tr');
    if (rows.length === 0) {
        showMessage('没有数据可导出', 'error');
        return;
    }
    
    // 构建CSV内容
    let csv = '\uFEFF'; // BOM for Excel UTF-8
    csv += 'ID,姓名,电话,邮箱,关联,创建时间,更新时间\n';
    
    rows.forEach(function(row) {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 7) {
            const id = cells[1].textContent.trim();
            const name = cells[2].textContent.trim();
            const phone = cells[3].textContent.trim();
            const email = cells[4].textContent.trim();
            const uploadFileName = cells[5].textContent.trim();
            const createTime = cells[6].textContent.trim();
            const updateTime = cells[7].textContent.trim();
            
            csv += `"${id}","${name}","${phone}","${email}","${uploadFileName}","${createTime}","${updateTime}"\n`;
        }
    });
    
    // 创建下载链接
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '客户数据_' + new Date().toISOString().slice(0, 10) + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showMessage('数据导出成功', 'success');
}
