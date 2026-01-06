// 删除客户页面的Ajax交互
const API_BASE_URL = '/api/customers';

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('deleteForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        deleteCustomer();
    });
});

// 加载客户信息
function loadCustomer() {
    const customerId = document.getElementById('customerId').value.trim();
    const message = document.getElementById('message');
    const customerInfo = document.getElementById('customerInfo');
    
    if (!customerId) {
        showMessage('请输入客户ID', 'error');
        return;
    }
    
    hideMessage();
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/' + customerId, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success && response.data) {
                    displayCustomerInfo(response.data);
                    customerInfo.style.display = 'block';
                    showMessage('客户信息加载成功', 'success');
                } else {
                    showMessage('加载失败: ' + response.message, 'error');
                    customerInfo.style.display = 'none';
                }
            } else {
                const response = JSON.parse(xhr.responseText);
                showMessage('加载失败: ' + (response.message || '客户不存在'), 'error');
                customerInfo.style.display = 'none';
            }
        }
    };
    
    xhr.onerror = function() {
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 显示客户信息
function displayCustomerInfo(customer) {
    document.getElementById('infoId').textContent = customer.id || '';
    document.getElementById('infoName').textContent = customer.name || '';
    document.getElementById('infoPhone').textContent = customer.phone || '';
    document.getElementById('infoEmail').textContent = customer.email || '';
    document.getElementById('infoAddress').textContent = customer.address || '';
}

// 删除客户
function deleteCustomer() {
    const customerId = document.getElementById('customerId').value.trim();
    const message = document.getElementById('message');
    
    if (!customerId) {
        showMessage('请输入客户ID', 'error');
        return;
    }
    
    // 确认删除
    if (!confirm('确定要删除这个客户吗？此操作不可恢复！')) {
        return;
    }
    
    hideMessage();
    
    const xhr = new XMLHttpRequest();
    xhr.open('DELETE', API_BASE_URL + '/' + customerId, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showMessage('客户删除成功！', 'success');
                    document.getElementById('customerInfo').style.display = 'none';
                    document.getElementById('customerId').value = '';
                    // 3秒后跳转到列表页
                    setTimeout(function() {
                        window.location.href = '/pages/list.html';
                    }, 2000);
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

// 显示消息
function showMessage(text, type) {
    const message = document.getElementById('message');
    message.textContent = text;
    message.className = 'message ' + type;
    message.style.display = 'block';
}

// 隐藏消息
function hideMessage() {
    const message = document.getElementById('message');
    message.style.display = 'none';
}

