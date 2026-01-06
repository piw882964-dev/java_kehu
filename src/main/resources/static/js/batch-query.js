// 批量查询页面的JavaScript
const BATCH_QUERY_API = '/api/customers/batch-query';

var queryStartTime = 0;
var queryResults = [];

// 页面加载时
document.addEventListener('DOMContentLoaded', function() {
    // 可以在这里添加示例数据（可选）
    // document.getElementById('queryInput').value = exampleData;
});

// 批量查询
function batchQuery() {
    const queryInput = document.getElementById('queryInput');
    const queryBtn = document.getElementById('queryBtn');
    const queryStatus = document.getElementById('queryStatus');
    const resultTableBody = document.getElementById('resultTableBody');
    
    const inputText = queryInput.value.trim();
    
    if (!inputText) {
        alert('请输入要查询的数据');
        return;
    }
    
    // 解析输入数据
    const queryItems = parseQueryInput(inputText);
    
    if (queryItems.length === 0) {
        alert('没有有效的查询数据');
        return;
    }
    
    if (queryItems.length > 500) {
        alert('每次查询最多500条数据');
        return;
    }
    
    // 禁用按钮
    queryBtn.disabled = true;
    queryBtn.textContent = '查询中...';
    queryStatus.textContent = '正在查询...';
    resultTableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 20px;">正在查询...</td></tr>';
    
    queryStartTime = Date.now();
    
    // 发送批量查询请求
    const xhr = new XMLHttpRequest();
    xhr.open('POST', BATCH_QUERY_API, true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            queryBtn.disabled = false;
            queryBtn.textContent = '按照列表信息查询';
            
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                        queryResults = response.data || [];
                        const matchedCount = response.matched || 0;
                        const elapsedTime = ((Date.now() - queryStartTime) / 1000).toFixed(2);
                        
                        queryStatus.textContent = `查询结果: ${queryResults.length}条 匹配: ${matchedCount}条 耗时: ${elapsedTime}秒`;
                        displayQueryResults(queryResults);
                    } else {
                        alert('查询失败: ' + response.message);
                        resultTableBody.innerHTML = '<tr><td colspan="6" class="no-result">查询失败</td></tr>';
                    }
                } catch (e) {
                    alert('解析响应失败: ' + e.message);
                    resultTableBody.innerHTML = '<tr><td colspan="6" class="no-result">解析失败</td></tr>';
                }
            } else {
                alert('查询失败，状态码: ' + xhr.status);
                resultTableBody.innerHTML = '<tr><td colspan="6" class="no-result">查询失败</td></tr>';
            }
        }
    };
    
    xhr.onerror = function() {
        queryBtn.disabled = false;
        queryBtn.textContent = '按照列表信息查询';
        alert('网络错误，请检查连接');
    };
    
    xhr.send(JSON.stringify({ items: queryItems }));
}

// 解析输入数据
function parseQueryInput(inputText) {
    const lines = inputText.split('\n');
    const queryItems = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(/\s+/);
        const item = {};
        
        if (parts.length === 1) {
            // 只有电话
            item.phone = parts[0];
        } else if (parts.length === 2) {
            // 姓名 + 电话
            item.name = parts[0];
            item.phone = parts[1];
        } else if (parts.length >= 3) {
            // 姓名 + 电话 + 地址
            item.name = parts[0];
            item.phone = parts[1];
            item.address = parts.slice(2).join(' ');
        }
        
        if (item.phone || item.name) {
            queryItems.push(item);
        }
    }
    
    return queryItems;
}

// 显示查询结果
function displayQueryResults(results) {
    const resultTableBody = document.getElementById('resultTableBody');
    
    if (!results || results.length === 0) {
        resultTableBody.innerHTML = '<tr><td colspan="6" class="no-result">没有找到匹配的记录</td></tr>';
        return;
    }
    
    let html = '';
    results.forEach(function(result, index) {
        const queryItem = result.queryItem || {};
        const customer = result.customer;
        const matched = result.matched || false;
        
        if (matched && customer) {
            // 匹配成功，显示客户信息
            html += '<tr>';
            html += '<td><input type="checkbox" class="checkbox result-checkbox"></td>';
            html += '<td>' + escapeHtml(customer.name || '') + '</td>';
            html += '<td>' + escapeHtml(customer.phone || '') + '</td>';
            html += '<td>' + escapeHtml(customer.uploadFileName || '') + '</td>';
            html += '<td>';
            html += '<span class="remarks-editable" id="remark_' + customer.id + '" onclick="editRemarks(' + customer.id + ', this)" data-customer-id="' + customer.id + '">加载中...</span>';
            html += '</td>';
            html += '<td><span class="matched">✓ 已关联</span></td>';
            html += '</tr>';
            
            // 加载备注
            if (customer.id) {
                loadCustomerRemark(customer.id);
            }
        } else {
            // 未匹配，显示查询项信息
            html += '<tr>';
            html += '<td><input type="checkbox" class="checkbox result-checkbox"></td>';
            html += '<td>' + escapeHtml(queryItem.name || '') + '</td>';
            html += '<td>' + escapeHtml(queryItem.phone || '') + '</td>';
            html += '<td>-</td>';
            html += '<td>-</td>';
            html += '<td><span class="not-matched">未找到</span></td>';
            html += '</tr>';
        }
    });
    
    resultTableBody.innerHTML = html;
}

// 转义HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 全选/取消全选结果
function toggleSelectAllResults(checkbox) {
    const checkboxes = document.querySelectorAll('.result-checkbox');
    checkboxes.forEach(function(cb) {
        cb.checked = checkbox.checked;
    });
}

// 导出查询结果
function exportQueryResults() {
    if (!queryResults || queryResults.length === 0) {
        alert('没有查询结果可导出');
        return;
    }
    
    // 构建CSV内容
    let csv = '姓名,电话,关联,邮箱,匹配状态\n';
    
    queryResults.forEach(function(result) {
        const queryItem = result.queryItem || {};
        const customer = result.customer;
        const matched = result.matched || false;
        
        if (matched && customer) {
            csv += '"' + (customer.name || '') + '",';
            csv += '"' + (customer.phone || '') + '",';
            csv += '"' + (result.uploadFileName || '') + '",';
            csv += '"' + (customer.email || '') + '",';
            csv += '"已匹配"\n';
        } else {
            csv += '"' + (queryItem.name || '') + '",';
            csv += '"' + (queryItem.phone || '') + '",';
            csv += '"",';
            csv += '"",';
            csv += '"未匹配"\n';
        }
    });
    
    // 创建下载链接
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', '批量查询结果_' + new Date().getTime() + '.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// 编辑备注（复用list.js的逻辑）
function editRemarks(id, element) {
    if (!isAdmin()) {
        alert('权限不足，只有管理员可以编辑备注');
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
        saveCustomerRemark(id, newText, element);
    };
    
    input.onkeypress = function(e) {
        if (e.key === 'Enter') {
            input.blur();
        }
    };
}

// 保存客户备注
function saveCustomerRemark(customerId, remarkText, element) {
    if (!isAdmin()) {
        return;
    }
    
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/customers/' + customerId + '/remark', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                if (response.success) {
                    element.textContent = remarkText || '点击添加备注';
                } else {
                    alert('保存备注失败: ' + response.message);
                }
            }
        }
    };
    
    xhr.send(JSON.stringify({ remarks: remarkText }));
}

// 加载客户备注
function loadCustomerRemark(customerId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/customers/' + customerId + '/remark', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4 && xhr.status === 200) {
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.success && response.data) {
                    const element = document.getElementById('remark_' + customerId);
                    if (element) {
                        element.textContent = response.data.remarks || '点击添加备注';
                    }
                }
            } catch (e) {
                // 忽略错误
            }
        }
    };
    
    xhr.send();
}

