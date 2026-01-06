// 高级搜索页面的Ajax交互
const API_BASE_URL = '/api/customers';

// 分页参数
var currentPage = 0;
var pageSize = 20;
var totalPages = 0;
var totalElements = 0;

// 搜索条件
var searchParams = {};

// 页面加载时
document.addEventListener('DOMContentLoaded', function() {
    // 搜索表单会在用户提交时执行
});

// 执行高级搜索
function doAdvancedSearch(page = 0) {
    currentPage = page;
    
    // 收集搜索条件
    const name = document.getElementById('name').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const email = document.getElementById('email').value.trim();
    const address = document.getElementById('address').value.trim();
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    
    // 构建查询参数
    let url = API_BASE_URL + '/advanced-search?page=' + currentPage + '&size=' + pageSize;
    if (name) url += '&name=' + encodeURIComponent(name);
    if (phone) url += '&phone=' + encodeURIComponent(phone);
    if (email) url += '&email=' + encodeURIComponent(email);
    if (address) url += '&address=' + encodeURIComponent(address);
    if (startTime) {
        // 将datetime-local格式转换为ISO格式
        const isoStartTime = new Date(startTime).toISOString();
        url += '&startTime=' + encodeURIComponent(isoStartTime);
    }
    if (endTime) {
        const isoEndTime = new Date(endTime).toISOString();
        url += '&endTime=' + encodeURIComponent(isoEndTime);
    }
    
    const loading = document.getElementById('loading');
    const table = document.getElementById('resultTable');
    const tableBody = document.getElementById('resultTableBody');
    
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
                        displayResults(data);
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

// 显示搜索结果
function displayResults(customers) {
    const tableBody = document.getElementById('resultTableBody');
    tableBody.innerHTML = '';
    
    if (!customers || customers.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 40px;">未找到匹配的客户数据</td></tr>';
        return;
    }
    
    customers.forEach(function(customer) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${customer.id || ''}</td>
            <td>${escapeHtml(customer.name || '')}</td>
            <td>${escapeHtml(customer.phone || '')}</td>
            <td>${escapeHtml(customer.email || '')}</td>
            <td>${escapeHtml(customer.address || '')}</td>
            <td>${escapeHtml(customer.uploadFileName || '')}</td>
            <td>${formatDateTime(customer.createTime) || ''}</td>
            <td>${formatDateTime(customer.updateTime) || ''}</td>
            <td>
                ${isAdmin() ? `<button onclick="editCustomer(${customer.id || 0})" class="btn btn-info btn-sm">修改</button>` : '<span style="color: #999;">只读模式</span>'}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 清空表单
function clearForm() {
    document.getElementById('name').value = '';
    document.getElementById('phone').value = '';
    document.getElementById('email').value = '';
    document.getElementById('address').value = '';
    document.getElementById('startTime').value = '';
    document.getElementById('endTime').value = '';
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
        doAdvancedSearch(0);
    }
}

// 上一页
function previousPage() {
    if (currentPage > 0) {
        doAdvancedSearch(currentPage - 1);
    }
}

// 下一页
function nextPage() {
    if (currentPage < totalPages - 1) {
        doAdvancedSearch(currentPage + 1);
    }
}

// 最后一页
function lastPage() {
    if (totalPages > 0 && currentPage < totalPages - 1) {
        doAdvancedSearch(totalPages - 1);
    }
}

// 改变每页大小
function changePageSize() {
    const sizeSelect = document.getElementById('pageSizeSelect');
    if (sizeSelect) {
        pageSize = parseInt(sizeSelect.value);
        doAdvancedSearch(0);
    }
}

// 编辑客户
function editCustomer(id) {
    window.location.href = '/pages/edit.html?id=' + id;
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

