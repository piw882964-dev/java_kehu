// 首页的JavaScript
// 注意：AUTH_API 已在 common.js 中定义，这里不需要重复声明
const CUSTOMER_API = '/api/customers';

// 页面加载时
document.addEventListener('DOMContentLoaded', function() {
    // 先显示页面内容，再延迟加载统计数据，避免阻塞页面显示
    const statsContainer = document.getElementById('statsContainer');
    const loadingEl = document.getElementById('loading');
    
    // 立即显示容器和默认值，让用户快速看到页面
    if (statsContainer) {
        statsContainer.style.display = 'grid';
    }
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
    
    // 延迟1秒后加载统计数据，让页面先显示出来
    setTimeout(function() {
        loadStats();
    }, 1000);
    
    // 每30秒自动刷新一次
    setInterval(loadStats, 30000);
});

// 加载统计数据
function loadStats() {
    const loadingEl = document.getElementById('loading');
    const statsContainer = document.getElementById('statsContainer');
    
    // 如果正在加载，不重复加载
    if (window.loadingStats) {
        return;
    }
    window.loadingStats = true;
    
    // 先显示容器，避免页面空白
    if (statsContainer) {
        statsContainer.style.display = 'grid';
    }
    
    if (loadingEl) {
        loadingEl.style.display = 'block';
    }
    
    // 并行加载所有统计数据，但每个请求独立处理，避免一个失败影响全部
    let completedCount = 0;
    const totalCount = 3;
    
    function checkComplete() {
        completedCount++;
        if (completedCount >= totalCount) {
            window.loadingStats = false;
            if (loadingEl) {
                loadingEl.style.display = 'none';
            }
            if (statsContainer) {
                statsContainer.style.display = 'grid';
            }
        }
    }
    
    // 加载客户总数
    loadTotalCustomers()
        .then(checkComplete)
        .catch(function(error) {
            console.error('加载客户总数失败:', error);
            const totalEl = document.getElementById('totalCustomers');
            if (totalEl) {
                totalEl.textContent = '加载失败';
            }
            checkComplete();
        });
    
    // 加载用户总数
    loadTotalUsers()
        .then(checkComplete)
        .catch(function(error) {
            console.error('加载用户总数失败:', error);
            const totalEl = document.getElementById('totalUsers');
            if (totalEl) {
                totalEl.textContent = '加载失败';
            }
            checkComplete();
        });
    
    // 加载今日新增
    loadTodayNew()
        .then(checkComplete)
        .catch(function(error) {
            console.error('加载今日新增失败:', error);
            const todayEl = document.getElementById('todayNew');
            if (todayEl) {
                todayEl.textContent = '加载失败';
            }
            checkComplete();
        });
}

// 加载客户总数
function loadTotalCustomers() {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', CUSTOMER_API + '/count', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 5000; // 设置5秒超时，超时后显示"加载中"，不阻塞页面
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            const totalEl = document.getElementById('totalCustomers');
                            if (totalEl) {
                                const oldValue = parseInt(totalEl.textContent.replace('条', '')) || 0;
                                const newValue = response.total || 0;
                                totalEl.textContent = newValue + '条';
                                
                                // 如果有变化，添加动画效果
                                if (newValue > oldValue) {
                                    totalEl.classList.add('pulse-animation');
                                    setTimeout(function() {
                                        totalEl.classList.remove('pulse-animation');
                                    }, 500);
                                }
                            }
                            resolve();
                        } else {
                            // 失败时显示默认值，不阻塞
                            const totalEl = document.getElementById('totalCustomers');
                            if (totalEl && totalEl.textContent.indexOf('条') === -1) {
                                totalEl.textContent = '-';
                            }
                            resolve(); // 不reject，避免阻塞其他数据加载
                        }
                    } catch (e) {
                        // 解析失败也不阻塞
                        const totalEl = document.getElementById('totalCustomers');
                        if (totalEl && totalEl.textContent.indexOf('条') === -1) {
                            totalEl.textContent = '-';
                        }
                        resolve();
                    }
                } else {
                    // HTTP错误也不阻塞
                    const totalEl = document.getElementById('totalCustomers');
                    if (totalEl && totalEl.textContent.indexOf('条') === -1) {
                        totalEl.textContent = '-';
                    }
                    resolve();
                }
            }
        };
        
        xhr.ontimeout = function() {
            // 超时显示"加载中"，但继续后台加载（不阻塞页面）
            const totalEl = document.getElementById('totalCustomers');
            if (totalEl) {
                totalEl.textContent = '加载中...';
                // 后台继续尝试加载一次
                setTimeout(function() {
                    loadTotalCustomers();
                }, 2000);
            }
            resolve(); // 不reject，让其他统计数据继续加载
        };
        
        xhr.onerror = function() {
            // 网络错误显示"-"，不阻塞
            const totalEl = document.getElementById('totalCustomers');
            if (totalEl) {
                totalEl.textContent = '-';
            }
            resolve();
        };
        
        xhr.send();
    });
}

// 加载用户总数
function loadTotalUsers() {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', AUTH_API + '/users/count', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 5000; // 设置5秒超时
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            const totalEl = document.getElementById('totalUsers');
                            if (totalEl) {
                                totalEl.textContent = (response.total || 0) + '条';
                            }
                            resolve();
                        } else {
                            // 失败时显示默认值
                            const totalEl = document.getElementById('totalUsers');
                            if (totalEl && totalEl.textContent === '') {
                                totalEl.textContent = '-';
                            }
                            resolve();
                        }
                    } catch (e) {
                        const totalEl = document.getElementById('totalUsers');
                        if (totalEl && totalEl.textContent === '') {
                            totalEl.textContent = '-';
                        }
                        resolve();
                    }
                } else {
                    const totalEl = document.getElementById('totalUsers');
                    if (totalEl && totalEl.textContent === '') {
                        totalEl.textContent = '-';
                    }
                    resolve();
                }
            }
        };
        
        xhr.ontimeout = function() {
            const totalEl = document.getElementById('totalUsers');
            if (totalEl) {
                totalEl.textContent = '加载中...';
            }
            resolve();
        };
        
        xhr.onerror = function() {
            const totalEl = document.getElementById('totalUsers');
            if (totalEl) {
                totalEl.textContent = '-';
            }
            resolve();
        };
        
        xhr.send();
    });
}

// 加载今日新增
function loadTodayNew() {
    return new Promise(function(resolve, reject) {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', CUSTOMER_API + '/count/today', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 5000; // 设置5秒超时
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            const todayEl = document.getElementById('todayNew');
                            if (todayEl) {
                                const oldValue = parseInt(todayEl.textContent.replace('条', '')) || 0;
                                const newValue = response.count || 0;
                                todayEl.textContent = newValue + '条';
                                
                                // 如果有新增，添加动画效果
                                if (newValue > oldValue) {
                                    todayEl.classList.add('pulse-animation');
                                    setTimeout(function() {
                                        todayEl.classList.remove('pulse-animation');
                                    }, 500);
                                }
                            }
                            resolve();
                        } else {
                            // 失败时显示默认值
                            const todayEl = document.getElementById('todayNew');
                            if (todayEl && todayEl.textContent === '0条') {
                                todayEl.textContent = '-';
                            }
                            resolve();
                        }
                    } catch (e) {
                        const todayEl = document.getElementById('todayNew');
                        if (todayEl && todayEl.textContent === '0条') {
                            todayEl.textContent = '-';
                        }
                        resolve();
                    }
                } else {
                    const todayEl = document.getElementById('todayNew');
                    if (todayEl && todayEl.textContent === '0条') {
                        todayEl.textContent = '-';
                    }
                    resolve();
                }
            }
        };
        
        xhr.ontimeout = function() {
            // 超时显示"加载中"
            const todayEl = document.getElementById('todayNew');
            if (todayEl) {
                todayEl.textContent = '加载中...';
            }
            resolve();
        };
        
        xhr.onerror = function() {
            const todayEl = document.getElementById('todayNew');
            if (todayEl) {
                todayEl.textContent = '-';
            }
            resolve();
        };
        
        xhr.send();
    });
}

