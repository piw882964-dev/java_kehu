// 添加客户页面的Ajax交互
const API_BASE_URL = '/api/customers';

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('customerForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        addCustomer();
    });
});

// 添加客户
function addCustomer() {
    const message = document.getElementById('message');
    const form = document.getElementById('customerForm');
    
    // 获取表单数据
    const customerData = {
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
    xhr.open('POST', API_BASE_URL, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 201) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    showMessage('客户添加成功！', 'success');
                    form.reset();
                    // 3秒后跳转到列表页
                    setTimeout(function() {
                        window.location.href = '/pages/list.html';
                    }, 2000);
                } else {
                    showMessage('添加失败: ' + response.message, 'error');
                }
            } else {
                const response = JSON.parse(xhr.responseText);
                showMessage('添加失败: ' + (response.message || '服务器错误'), 'error');
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

