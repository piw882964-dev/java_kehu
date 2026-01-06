// 通用功能JavaScript文件

const AUTH_API = '/api/auth';

// 全局变量：用户角色
var currentUserRole = 'VIEWER';

// 页面加载时检查登录状态并显示用户信息
document.addEventListener('DOMContentLoaded', function() {
    // 立即加载用户信息，确保角色正确设置
    loadUserInfo();
});

// 加载用户信息（同时刷新Session缓存）
function loadUserInfo() {
    const userNameElement = document.getElementById('userName');
    if (!userNameElement) return;

    // 防止重复调用
    if (window.loadingUserInfo) {
        return;
    }
    window.loadingUserInfo = true;

    const xhr = new XMLHttpRequest();
    xhr.open('GET', AUTH_API + '/current', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true; // 确保携带Cookie（重要：保持Session）
    xhr.timeout = 8000; // 设置8秒超时（大数据量时可能需要更长时间）

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            window.loadingUserInfo = false;
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data) {
                        const userData = response.data;
                        currentUserRole = userData.role || 'VIEWER';
                        const realName = userData.realName || userData.username || '管理员';
                        const roleText = currentUserRole === 'ADMIN' ? '管理员' : '查看者';
                        
                        // 已取消登录限时，不再显示剩余时间
                        userNameElement.textContent = '登录人:【' + realName + ' - ' + roleText + '】';
                        
                        // 触发自定义事件，通知其他脚本用户信息已加载
                        window.dispatchEvent(new CustomEvent('userInfoLoaded', { 
                            detail: { role: currentUserRole, userData: userData } 
                        }));
                        
                        // 根据角色控制页面功能
                        controlPageFeatures();
                        
                        // 如果当前页面是列表页，重新渲染客户列表以更新权限显示
                        if (window.location.pathname.includes('list.html')) {
                            // 重新渲染表格中的操作按钮
                            updateCustomerListPermissions();
                        }
                        
                        // 已取消登录限时，不再需要定期刷新Session
                    } else {
                        // 未登录，延迟跳转避免循环（增加延迟时间，避免频繁跳转）
                        setTimeout(function() {
                            if (!window.location.pathname.includes('login.html')) {
                                clearSessionRefresh();
                                window.location.href = '/pages/login.html';
                            }
                        }, 1000);
                    }
                } catch (e) {
                    console.error('解析用户信息失败:', e);
                    // 解析失败不立即跳转，避免循环
                    if (userNameElement) {
                        userNameElement.textContent = '登录人:【加载失败】';
                    }
                }
            } else if (xhr.status === 401) {
                // 401未授权，延迟跳转避免循环（增加延迟时间）
                setTimeout(function() {
                    if (!window.location.pathname.includes('login.html')) {
                        clearSessionRefresh();
                        window.location.href = '/pages/login.html';
                    }
                }, 1000);
            } else {
                // 其他错误，不跳转，只显示错误
                if (userNameElement) {
                    userNameElement.textContent = '登录人:【连接失败】';
                }
            }
            // 其他错误不跳转，避免循环刷新
        }
    };

    xhr.ontimeout = function() {
        window.loadingUserInfo = false;
        // 超时不跳转，避免循环
        if (userNameElement) {
            userNameElement.textContent = '登录人:【加载中...】';
        }
    };

    xhr.onerror = function() {
        window.loadingUserInfo = false;
        // 网络错误不跳转，避免循环
        if (userNameElement) {
            userNameElement.textContent = '登录人:【连接失败】';
        }
    };

    xhr.send();
}

// 刷新Session（静默刷新，延长有效期）
function refreshSession() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', AUTH_API + '/current', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                // Session已刷新（已取消限时，此函数保留用于兼容性）
            } else if (xhr.status === 401) {
                // Session失效（可能是服务器重启等），跳转到登录页
                clearSessionRefresh();
                window.location.href = '/pages/login.html';
            }
        }
    };
    
    xhr.send();
}

// 清除Session刷新定时器
function clearSessionRefresh() {
    if (window.sessionRefreshInterval) {
        clearInterval(window.sessionRefreshInterval);
        window.sessionRefreshInterval = null;
    }
}

// 根据用户角色控制页面功能显示
function controlPageFeatures() {
    const isAdmin = currentUserRole === 'ADMIN';
    
    // 隐藏/显示菜单项
    const addMenu = document.querySelector('a[href="/pages/add.html"]');
    const editMenu = document.querySelector('a[href="/pages/edit.html"]');
    const deleteMenu = document.querySelector('a[href="/pages/delete.html"]');
    
    if (!isAdmin) {
        if (addMenu) addMenu.style.display = 'none';
        if (editMenu) editMenu.style.display = 'none';
        if (deleteMenu) deleteMenu.style.display = 'none';
    }
    
    // 隐藏/显示功能按钮（在列表页）
    const addButtons = document.querySelectorAll('.btn-success, a[href="/pages/add.html"], button[onclick*="add"], button[onclick*="添加"]');
    const editButtons = document.querySelectorAll('.btn-info, button[onclick*="edit"], button[onclick*="修改"]');
    const deleteButtons = document.querySelectorAll('.btn-danger, button[onclick*="delete"], button[onclick*="删除"], button[onclick*="batchDelete"]');
    
    if (!isAdmin) {
        addButtons.forEach(function(btn) {
            if (btn.textContent.includes('添加') || btn.textContent.includes('添加客户')) {
                btn.style.display = 'none';
            }
        });
        editButtons.forEach(function(btn) {
            if (btn.textContent.includes('修改') || btn.textContent.includes('编辑')) {
                btn.style.display = 'none';
            }
        });
        deleteButtons.forEach(function(btn) {
            if (btn.textContent.includes('删除') || btn.textContent.includes('批量删除')) {
                btn.style.display = 'none';
            }
        });
    }
}

// 检查是否有管理员权限
function isAdmin() {
    // 确保角色已加载，如果未加载则返回false
    if (typeof currentUserRole === 'undefined') {
        return false;
    }
    return currentUserRole === 'ADMIN';
}

// 更新客户列表的权限显示（在角色加载完成后调用）
function updateCustomerListPermissions() {
    if (!window.location.pathname.includes('list.html')) {
        return;
    }
    
    const tableBody = document.getElementById('customerTableBody');
    if (!tableBody) {
        return;
    }
    
    const rows = tableBody.querySelectorAll('tr');
    const isAdminUser = isAdmin();
    
    rows.forEach(function(row) {
        const operationCell = row.querySelector('td:nth-child(9)'); // 操作列
        if (!operationCell) {
            return;
        }
        
        const customerId = row.querySelector('input[type="checkbox"]')?.value;
        if (!customerId) {
            return;
        }
        
        // 更新操作按钮
        if (isAdminUser) {
            operationCell.innerHTML = `
                <div class="operation-buttons">
                    <button onclick="deleteCustomer(${customerId})" class="btn btn-danger btn-sm">× 删除</button>
                    <button onclick="editCustomer(${customerId})" class="btn btn-info btn-sm">修改</button>
                </div>
            `;
        } else {
            operationCell.innerHTML = '<span style="color: #999;">只读模式</span>';
        }
    });
}

// 退出登录（美化版）
function logout() {
    // 清除Session刷新定时器
    clearSessionRefresh();
    showLogoutModal();
}

// 显示退出登录确认弹窗
function showLogoutModal() {
    // 创建弹窗HTML
    const modalHTML = `
        <div class="modal-overlay" id="logoutModal">
            <div class="modal-dialog">
                <div class="modal-header">
                    <div class="modal-icon warning">⚠️</div>
                    <h3 class="modal-title">确认退出</h3>
                </div>
                <div class="modal-body">
                    确定要退出登录吗？退出后需要重新登录才能访问系统。
                </div>
                <div class="modal-footer">
                    <button class="modal-btn modal-btn-default" onclick="closeLogoutModal()">取消</button>
                    <button class="modal-btn modal-btn-primary" onclick="confirmLogout()">确定退出</button>
                </div>
            </div>
        </div>
    `;
    
    // 移除已存在的弹窗
    const existingModal = document.getElementById('logoutModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    // 添加弹窗到页面
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // 显示弹窗
    const modal = document.getElementById('logoutModal');
    setTimeout(function() {
        modal.classList.add('show');
    }, 10);
    
    // 点击遮罩层关闭
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeLogoutModal();
        }
    });
    
    // ESC键关闭
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('show')) {
            closeLogoutModal();
        }
    });
}

// 关闭退出登录弹窗
function closeLogoutModal() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        modal.classList.remove('show');
        setTimeout(function() {
            modal.remove();
        }, 300);
    }
}

// 确认退出登录
function confirmLogout() {
    const modal = document.getElementById('logoutModal');
    if (modal) {
        // 显示加载状态
        const confirmBtn = modal.querySelector('.modal-btn-primary');
        const originalText = confirmBtn.textContent;
        confirmBtn.disabled = true;
        confirmBtn.textContent = '退出中...';
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', AUTH_API + '/logout', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true; // 确保携带Cookie

        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                // 无论成功失败都跳转到登录页
                closeLogoutModal();
                // 显示退出成功提示
                showToast('退出成功，正在跳转...', 'success');
                setTimeout(function() {
                    window.location.href = '/pages/login.html';
                }, 500);
            }
        };

        xhr.onerror = function() {
            closeLogoutModal();
            showToast('退出失败，正在跳转...', 'warning');
            setTimeout(function() {
                window.location.href = '/pages/login.html';
            }, 500);
        };

        xhr.send();
    }
}

// 显示Toast提示（可选，用于退出提示）
function showToast(message, type) {
    // 移除已存在的toast
    const existingToast = document.getElementById('toastMessage');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.id = 'toastMessage';
    toast.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#52c41a' : '#faad14'};
        color: white;
        padding: 12px 20px;
        border-radius: 4px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10001;
        animation: slideInRight 0.3s ease;
        font-size: 14px;
    `;
    toast.textContent = message;
    
    // 添加动画样式
    if (!document.getElementById('toastStyles')) {
        const style = document.createElement('style');
        style.id = 'toastStyles';
        style.textContent = `
            @keyframes slideInRight {
                from {
                    transform: translateX(100%);
                    opacity: 0;
                }
                to {
                    transform: translateX(0);
                    opacity: 1;
                }
            }
            @keyframes slideOutRight {
                from {
                    transform: translateX(0);
                    opacity: 1;
                }
                to {
                    transform: translateX(100%);
                    opacity: 0;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // 3秒后自动消失
    setTimeout(function() {
        toast.style.animation = 'slideOutRight 0.3s ease';
        setTimeout(function() {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    }, 2000);
}
