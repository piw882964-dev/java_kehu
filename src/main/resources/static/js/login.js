// 登录页面的Ajax交互
const API_BASE_URL = '/api/auth';

// 表单提交处理
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });

    // 检查是否已登录
    checkLoginStatus();
});

// 检查登录状态（优化：减少不必要的验证）
function checkLoginStatus() {
    // 只在页面首次加载时检查一次，避免重复刷新
    if (sessionStorage.getItem('loginChecked')) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('GET', API_BASE_URL + '/current', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    // 设置超时，避免长时间等待
    xhr.timeout = 3000;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        // 已登录，跳转到首页
                        sessionStorage.setItem('loginChecked', 'true');
                        window.location.href = '/pages/index.html';
                    }
                } catch (e) {
                    // 解析失败，忽略
                }
            }
        }
    };
    
    xhr.ontimeout = function() {
        // 超时忽略，不进行任何操作
    };
    
    xhr.onerror = function() {
        // 错误忽略，不进行任何操作
    };
    
    xhr.send();
}

// 登录
function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const loginBtn = document.getElementById('loginBtn');
    const message = document.getElementById('message');

    if (!username) {
        showMessage('请输入用户名', 'error');
        return;
    }

    if (!password) {
        showMessage('请输入密码', 'error');
        return;
    }

    hideMessage();
    loginBtn.disabled = true;
    loginBtn.textContent = '登录中...';

    const loginData = {
        username: username,
        password: password
    };

    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_BASE_URL + '/login', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    // 重要：设置withCredentials确保Cookie（Session）被保存和跨域携带
    xhr.withCredentials = true;
    
    // 设置请求超时时间（15秒）
    xhr.timeout = 15000;

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            loginBtn.disabled = false;
            loginBtn.textContent = '登录';

            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    // 登录成功，不输出敏感信息
                    if (response.success) {
                        showMessage('登录成功，正在跳转...', 'success');
                        // 登录成功后直接跳转，不需要验证Session（登录接口已返回成功）
                        // 清除之前的标记
                        sessionStorage.removeItem('loginChecked');
                        
                        // 立即跳转，不等待验证（减少延迟，让用户快速看到页面）
                        setTimeout(function() {
                            window.location.href = '/pages/index.html';
                        }, 100);
                    } else {
                        showMessage('登录失败: ' + response.message, 'error');
                    }
                } catch (e) {
                    showMessage('解析登录响应失败: ' + e.message, 'error');
                    console.error('解析错误:', e);
                }
            } else if (xhr.status === 0) {
                // status为0通常表示网络错误或请求被取消
                showMessage('目前网络波动，请稍等后重试', 'error');
            } else {
                try {
                    const response = JSON.parse(xhr.responseText);
                    showMessage('登录失败: ' + (response.message || '服务器错误'), 'error');
                } catch (e) {
                    // 如果无法解析响应，可能是网络问题
                    if (xhr.status >= 500) {
                        showMessage('目前网络波动，请稍等后重试', 'error');
                    } else {
                        showMessage('登录失败，状态码: ' + xhr.status, 'error');
                    }
                }
            }
        }
    };

    // 处理网络错误
    xhr.onerror = function() {
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
        showMessage('目前网络波动，请稍等后重试', 'error');
    };
    
    // 处理请求超时
    xhr.ontimeout = function() {
        loginBtn.disabled = false;
        loginBtn.textContent = '登录';
        showMessage('目前网络波动，请稍等后重试', 'error');
    };

    xhr.send(JSON.stringify(loginData));
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

// 验证Session并跳转（登录成功后验证Session是否保存成功）
function verifySessionBeforeRedirect() {
    let retryCount = 0;
    const maxRetries = 3;
    
    function doVerify() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', API_BASE_URL + '/current', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 3000; // 设置3秒超时
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            // Session验证成功，跳转
                            window.location.href = '/pages/index.html';
                        } else {
                            // Session未保存，重试
                            if (retryCount < maxRetries) {
                                retryCount++;
                                setTimeout(doVerify, 500);
                            } else {
                                showMessage('Session保存失败，请重新登录', 'error');
                            }
                        }
                    } catch (e) {
                        // 解析失败，重试
                        if (retryCount < maxRetries) {
                            retryCount++;
                            setTimeout(doVerify, 500);
                        } else {
                            showMessage('验证失败，请重新登录', 'error');
                        }
                    }
                } else {
                    // 请求失败，重试
                    if (retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(doVerify, 500);
                    } else {
                        showMessage('验证失败，请重新登录', 'error');
                    }
                }
            }
        };
        
        xhr.ontimeout = function() {
            // 超时重试
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(doVerify, 500);
            } else {
                showMessage('连接超时，请重试', 'error');
            }
        };
        
        xhr.onerror = function() {
            // 错误重试
            if (retryCount < maxRetries) {
                retryCount++;
                setTimeout(doVerify, 500);
            } else {
                showMessage('网络错误，请重试', 'error');
            }
        };
        
        xhr.send();
    }
    
    doVerify();
}

// 验证Session并跳转（保留此函数以防其他地方调用）
function verifySessionAndRedirect() {
    verifySessionBeforeRedirect();
}

