// 编辑客户页面的Ajax交互
const API_BASE_URL = '/api/customers';

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('customerForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        updateCustomer();
    });
    
    // 从URL参数获取ID并自动加载
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        document.getElementById('customerId').value = id;
        loadCustomer();
    }
});

// 加载客户信息
function loadCustomer() {
    const customerId = document.getElementById('customerId').value.trim();
    const message = document.getElementById('message');
    const form = document.getElementById('customerForm');
    
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
                    fillForm(response.data);
                    form.style.display = 'block';
                    showMessage('客户信息加载成功', 'success');
                } else {
                    showMessage('加载失败: ' + response.message, 'error');
                    form.style.display = 'none';
                }
            } else {
                const response = JSON.parse(xhr.responseText);
                showMessage('加载失败: ' + (response.message || '客户不存在'), 'error');
                form.style.display = 'none';
            }
        }
    };
    
    xhr.onerror = function() {
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send();
}

// 填充表单
function fillForm(customer) {
    document.getElementById('id').value = customer.id;
    document.getElementById('name').value = customer.name || '';
    document.getElementById('phone').value = customer.phone || '';
    document.getElementById('email').value = customer.email || '';
    document.getElementById('address').value = customer.address || '';
}

// 更新客户
function updateCustomer() {
    const message = document.getElementById('message');
    const customerId = document.getElementById('id').value;
    
    if (!customerId) {
        showMessage('客户ID不能为空', 'error');
        return;
    }
    
    // 获取表单数据
    const customerData = {
        id: parseInt(customerId),
        name: document.getElementById('name').value.trim(),
        phone: document.getElementById('phone').value.trim(),
        email: document.getElementById('email').value.trim(),
        address: document.getElementById('address').value.trim()
    };
    
    // 验证必填字段
    if (!customerData.name) {
        showMessage('姓名不能为空', 'error');
        return;
    }
    
    hideMessage();
    
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', API_BASE_URL + '/' + customerId, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showMessage('客户更新成功！', 'success');
                    // 3秒后跳转到列表页
                    setTimeout(function() {
                        window.location.href = '/pages/list.html';
                    }, 2000);
                } else {
                    showMessage('更新失败: ' + response.message, 'error');
                }
            } else {
                const response = JSON.parse(xhr.responseText);
                showMessage('更新失败: ' + (response.message || '服务器错误'), 'error');
            }
        }
    };
    
    xhr.onerror = function() {
        showMessage('网络错误，请检查连接', 'error');
    };
    
    xhr.send(JSON.stringify(customerData));
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

