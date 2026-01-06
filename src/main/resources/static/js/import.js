// 导入客户数据页面的JavaScript

const API_BASE_URL = '/api/customers';
const IMPORT_API = API_BASE_URL + '/import';
const UPLOAD_FILE_API = API_BASE_URL + '/import/upload';  // 第一步：上传文件到服务器
const PROCESS_FILE_API = API_BASE_URL + '/import/process'; // 第二步：处理服务器上的文件
const UPLOAD_TASKS_API = '/api/upload-tasks';

let selectedFile = null;
let currentTaskId = null; // 当前正在处理的任务ID
let taskPollingInterval = null; // 任务状态轮询定时器
let currentUploadInfo = null; // 当前上传信息（文件名、大小等）
let uploadProgressInterval = null; // 上传进度更新定时器
let currentUploadXHR = null; // 当前上传的XMLHttpRequest对象（用于取消上传）
let currentUploadChunkXHRs = []; // 当前分块上传的所有XHR对象
let isUploadCancelled = false; // 上传是否已取消
let currentChunkUploadId = null; // 当前分块上传的ID（用于清理服务器临时文件）

// 检查导入权限（只有管理员可以导入）
function checkImportPermission() {
    // 先初始化页面功能，让页面可以正常显示和使用
    setupDragAndDrop();
    
    // 设置一个标志，表示是否已经收到用户信息加载事件
    let userInfoLoaded = false;
    
    // 主要依赖事件监听，这是最可靠的方式
    window.addEventListener('userInfoLoaded', function(event) {
        userInfoLoaded = true;
        if (event.detail && event.detail.role) {
            currentUserRole = event.detail.role;
            // 如果加载完成且不是管理员，提示并跳转
            if (currentUserRole !== 'ADMIN') {
                alert('权限不足：只有管理员可以导入数据。即将跳转到首页...');
                setTimeout(function() {
                    window.location.href = '/pages/index.html';
                }, 1500);
            } else {
                console.log('权限验证通过：管理员用户');
            }
        }
    }, { once: true });
    
    // 备用检查：如果事件没有触发，等待一段时间后检查（处理common.js加载慢的情况）
    setTimeout(function() {
        // 如果事件已经触发过，就不需要再检查了
        if (userInfoLoaded) {
            return;
        }
        
        // 等待5秒后，如果角色还是默认值VIEWER，可能是真的VIEWER用户，也可能是网络慢
        // 为了不误拦截管理员，这里不主动跳转，让后端处理权限验证
        if (typeof currentUserRole !== 'undefined' && currentUserRole === 'VIEWER') {
            console.warn('用户信息可能未完全加载，允许访问页面，后端会进行权限验证');
            // 不跳转，让用户尝试，后端API会验证权限
        }
    }, 5000);
}

// 页面加载时
document.addEventListener('DOMContentLoaded', function() {
    // 检查权限（异步进行，不阻塞页面加载）
    checkImportPermission();
    
    // 检查是否有正在处理的任务
    checkProcessingTask();
});

// 设置拖拽上传
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });
}

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (file) {
        handleFile(file);
    }
}

// 处理文件
function handleFile(file) {
    // 验证文件类型
    const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv',
        'application/csv'
    ];
    
    const validExtensions = ['.xls', '.xlsx', '.csv'];
    const fileName = file.name.toLowerCase();
    const isValidExtension = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValidExtension && !validTypes.includes(file.type)) {
        alert('不支持的文件格式！请选择 Excel (.xls, .xlsx) 或 CSV (.csv) 文件');
        return;
    }
    
    // 验证文件大小（最大500MB，支持100万条数据）
    const maxSizeBytes = 500 * 1024 * 1024; // 500MB
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    if (file.size > maxSizeBytes) {
        alert(`文件大小不能超过500MB，当前文件大小为 ${fileSizeMB}MB`);
        return;
    }
    
    // 额外提示：如果文件很大，提醒用户
    if (file.size > 100 * 1024 * 1024) { // 超过100MB
        console.log(`上传文件大小: ${fileSizeMB}MB`);
    }
    
    selectedFile = file;
    
    // 显示选中的文件
    const selectedFileDiv = document.getElementById('selectedFile');
    const fileNameDiv = document.getElementById('fileName');
    const fileSizeDiv = document.getElementById('fileSize');
    const importBtn = document.getElementById('importBtn');
    
    fileNameDiv.textContent = file.name;
    fileSizeDiv.textContent = formatFileSize(file.size);
    selectedFileDiv.classList.add('show');
    importBtn.disabled = false;
    
    // 隐藏之前的结果
    document.getElementById('resultSection').classList.remove('show');
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// 导入数据（支持自动拆分大文件）
async function importData() {
    if (!selectedFile) {
        alert('请先选择文件');
        return;
    }
    
    const importBtn = document.getElementById('importBtn');
    const uploadArea = document.getElementById('uploadArea');
    
    // 禁用按钮，显示加载状态
    importBtn.disabled = true;
        importBtn.textContent = '正在分析文件...';
    uploadArea.style.opacity = '0.5';
    
        // 隐藏之前的进度显示
        hideUploadProgress();
    
    // 直接上传文件并处理（一步完成）
    try {
        importBtn.textContent = '正在上传文件...';
        
        // 显示处理进度区域
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.classList.add('show');
            const fileNameEl = document.getElementById('processingFileName');
            const statusText = document.getElementById('processingStatus');
            if (fileNameEl) fileNameEl.textContent = selectedFile.name;
            if (statusText) statusText.textContent = '正在上传文件并处理...';
        }
        
        // 重置取消标志
        isUploadCancelled = false;
        currentUploadXHR = null;
        
        // 直接上传文件并处理（一步完成，后台异步处理）
        const formData = new FormData();
        formData.append('file', selectedFile);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', IMPORT_API, true);
        xhr.withCredentials = true;
        xhr.timeout = 60 * 60 * 1000; // 1小时超时（支持大文件上传）
        
        // 保存XHR对象以便取消
        currentUploadXHR = xhr;
        
        // 上传进度监听
        xhr.upload.onprogress = function(e) {
            if (isUploadCancelled) {
                xhr.abort();
                return;
            }
            
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateUploadProgress(percent, e.loaded, e.total);
            }
        };
        
        const uploadPromise = new Promise((resolve, reject) => {
            xhr.onreadystatechange = function() {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            if (response.success) {
                                resolve(response);
                            } else {
                                reject(new Error(response.message || '上传文件失败'));
                            }
                        } catch (e) {
                            reject(new Error('解析响应失败: ' + e.message));
                        }
                    } else if (xhr.status === 0) {
                        // 状态码0通常表示网络错误或请求被取消，可能是524超时
                        // 如果数据已经上传，后台可能正在处理，尝试检查任务状态
                        const savedTaskId = localStorage.getItem('currentUploadTaskId');
                        if (savedTaskId) {
                            console.log('请求被中断，但可能已经上传成功。正在检查任务状态...');
                            // 不直接reject，而是尝试检查任务状态
                            setTimeout(() => {
                                startTaskPolling(parseInt(savedTaskId));
                            }, 1000);
                            // 返回一个特殊标记，表示需要检查任务状态
                            resolve({ taskId: parseInt(savedTaskId), needCheck: true });
                            return;
                        }
                        reject(new Error('无法连接到服务器，请检查网络连接或服务器是否正常运行'));
                    } else if (xhr.status === 401) {
                        reject(new Error('登录已过期，请重新登录'));
                    } else if (xhr.status === 403) {
                        reject(new Error('权限不足，只有管理员可以导入数据'));
                    } else if (xhr.status === 524) {
                        // Cloudflare 524超时错误，但数据可能已经上传成功
                        // 尝试从localStorage恢复任务ID
                        const savedTaskId = localStorage.getItem('currentUploadTaskId');
                        if (savedTaskId) {
                            console.log('请求超时，但可能已经上传成功。正在检查任务状态...');
                            setTimeout(() => {
                                startTaskPolling(parseInt(savedTaskId));
                            }, 1000);
                            resolve({ taskId: parseInt(savedTaskId), needCheck: true });
                            return;
                        }
                        reject(new Error('上传超时，请稍后检查任务状态。如果文件已上传，数据可能正在后台处理中。'));
                    } else {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            reject(new Error(response.message || '上传文件失败，状态码: ' + xhr.status));
                        } catch (e) {
                            reject(new Error('上传文件失败，状态码: ' + xhr.status));
                        }
                    }
                }
            };
            
            xhr.onerror = function() {
                if (!isUploadCancelled) {
                    reject(new Error('网络错误，请检查连接'));
                }
            };
            
            xhr.ontimeout = function() {
                // 超时可能是Cloudflare的524错误，但数据可能已经上传
                // 尝试从localStorage恢复任务ID
                const savedTaskId = localStorage.getItem('currentUploadTaskId');
                if (savedTaskId) {
                    console.log('请求超时，但可能已经上传成功。正在检查任务状态...');
                    setTimeout(() => {
                        startTaskPolling(parseInt(savedTaskId));
                    }, 1000);
                    resolve({ taskId: parseInt(savedTaskId), needCheck: true });
                    return;
                }
                reject(new Error('上传超时，请稍后重试。如果文件较大，可能需要更长时间，请稍后检查任务状态。'));
            };
        });
        
        xhr.send(formData);
        
        // 等待上传完成（返回taskId）
        const result = await uploadPromise;
        
        // 如果是需要检查的状态（524超时但可能已上传），直接开始轮询
        if (result.needCheck) {
            const taskId = result.taskId;
            if (taskId) {
                console.log('检测到任务ID，开始轮询任务状态: ' + taskId);
                startTaskPolling(taskId);
                // 显示提示信息
                if (processingSection) {
                    const statusText = document.getElementById('processingStatus');
                    if (statusText) statusText.textContent = '文件可能已上传，正在检查任务状态...';
                }
                return; // 不继续执行后续代码
            }
        }
        
        const taskId = result.taskId;
        if (!taskId) {
            throw new Error('服务器未返回任务ID');
        }
        
        // 更新状态：上传完成，开始后台处理
        if (processingSection) {
            const statusText = document.getElementById('processingStatus');
            if (statusText) statusText.textContent = '文件已上传，正在后台处理...';
        }
        
        // 保存任务ID，开始轮询任务状态
        localStorage.setItem('currentUploadTaskId', taskId.toString());
        currentTaskId = taskId;
        
        // 立即开始轮询任务状态（上传完成后立即开始）
        startTaskPolling(taskId);
        
        // 上传完成后清理
        currentUploadXHR = null;
        
    } catch (error) {
        // 如果是用户取消，不显示错误提示
        if (error.message === '上传已取消' || isUploadCancelled) {
            return;
        }
        
        console.error('文件处理失败:', error);
        alert('文件处理失败: ' + error.message);
        importBtn.disabled = false;
        importBtn.textContent = '开始导入';
        uploadArea.style.opacity = '1';
        
        // 清理状态
        currentUploadXHR = null;
        isUploadCancelled = false;
    }
}

// 按数据条数分块上传（每个块包含指定数量的数据条数）
async function uploadFileInChunksByRows(file, rowsPerChunk, totalRows, dataRows) {
    // 重置取消标志
    isUploadCancelled = false;
    currentUploadChunkXHRs = [];
    
    // 计算需要的块数
    const totalChunks = Math.ceil(dataRows / rowsPerChunk);
    const uploadId = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    currentChunkUploadId = uploadId;
    
    console.log(`文件将分成 ${totalChunks} 个块上传，每块 ${rowsPerChunk.toLocaleString()} 条数据`);
    
    // 估算每个块的大小（根据文件大小和数据行数）
    const bytesPerRow = file.size / totalRows;
    const estimatedChunkSize = Math.ceil(rowsPerChunk * bytesPerRow);
    
    // 根据文件大小动态调整并发数（8核32G服务器优化，提升上传速度）
    // 服务器性能强，可以支持更高并发
    let maxConcurrent = 10; // 默认并发10个（提升小文件上传速度）
    if (file.size > 500 * 1024 * 1024) {
        maxConcurrent = 20; // 大文件（>500MB）：并发20个（充分利用服务器性能）
    } else if (file.size > 100 * 1024 * 1024) {
        maxConcurrent = 15; // 中等文件（100-500MB）：并发15个
    } else {
        maxConcurrent = 10; // 小文件（<100MB）：并发10个
    }
    
    const processingSection = document.getElementById('processingSection');
    const statusText = document.getElementById('processingStatus');
    const importBtn = document.getElementById('importBtn');
    
    // 显示上传进度
    showUploadProgress(file.name, file.size);
    
    try {
        let completedChunks = 0;
        let failedChunks = 0;
        
        // 按数据条数计算每个块的字节范围
        for (let i = 0; i < totalChunks; i += maxConcurrent) {
            // 检查是否已取消
            if (isUploadCancelled) {
                throw new Error('上传已取消');
            }
            
            // 准备当前批次的块
            const batchPromises = [];
            const batchEnd = Math.min(i + maxConcurrent, totalChunks);
            
            for (let chunkIndex = i; chunkIndex < batchEnd; chunkIndex++) {
                // 计算当前块应该包含的数据行范围
                const startRow = chunkIndex * rowsPerChunk; // 数据行起始（不包括表头）
                const endRow = Math.min((chunkIndex + 1) * rowsPerChunk, dataRows); // 数据行结束
                const actualRows = endRow - startRow; // 实际包含的行数
                
                // 估算字节范围（基于平均每行字节数）
                const startByte = Math.floor((startRow / dataRows) * file.size);
                const endByte = chunkIndex === totalChunks - 1 
                    ? file.size 
                    : Math.floor((endRow / dataRows) * file.size);
                
                const chunk = file.slice(startByte, endByte);
                
                // 创建上传Promise（并发上传）
                const chunkPromise = uploadChunk(chunk, chunkIndex, totalChunks, uploadId, file.name, file.size)
                    .then(() => {
                        completedChunks++;
                        // 更新进度
                        const progress = Math.round((completedChunks / totalChunks) * 100);
                        updateChunkUploadProgress(completedChunks, totalChunks, importBtn, statusText);
                        console.log(`块 ${chunkIndex + 1}/${totalChunks} 上传完成 (包含约 ${actualRows.toLocaleString()} 条数据)`);
                        return { success: true, chunkIndex };
                    })
                    .catch((error) => {
                        failedChunks++;
                        console.error(`块 ${chunkIndex + 1} 上传失败:`, error);
                        return { success: false, chunkIndex, error };
                    });
                
                batchPromises.push(chunkPromise);
            }
            
            // 等待当前批次的所有块并发上传完成
            const batchResults = await Promise.all(batchPromises);
            
            // 检查是否有失败的块
            const failed = batchResults.filter(r => !r.success);
            if (failed.length > 0 && !isUploadCancelled) {
                console.warn(`${failed.length} 个块上传失败，继续上传剩余块`);
            }
        }
        
        // 检查是否已取消
        if (isUploadCancelled) {
            throw new Error('上传已取消');
        }
        
        // 检查是否所有块都上传成功
        if (completedChunks < totalChunks && failedChunks > 0) {
            throw new Error(`部分块上传失败：成功 ${completedChunks}/${totalChunks}，失败 ${failedChunks}`);
        }
        
        console.log(`所有 ${totalChunks} 个块上传完成（成功: ${completedChunks}，失败: ${failedChunks}），通知服务器合并文件...`);
        
        // 所有块上传完成，通知服务器合并文件并开始处理
        hideUploadProgress();
        if (statusText) {
            statusText.textContent = '上传完成，正在合并文件并处理数据...';
        }
        importBtn.textContent = '上传完成，正在处理数据...';
        
        // 调用合并接口
        const result = await mergeChunksAndProcess(uploadId, file.name);
        
        // 清理上传ID
        currentChunkUploadId = null;
    
        // 处理结果
        if (result.success) {
            // 显示任务处理进度
            if (result.taskId) {
                localStorage.setItem('currentUploadTaskId', result.taskId.toString());
                currentTaskId = result.taskId;
                startTaskPolling(result.taskId);
            }
        } else {
            throw new Error(result.message || '合并文件失败');
        }
    } catch (error) {
        // 清理上传ID
        currentChunkUploadId = null;
        
        // 如果是用户取消，不显示错误
        if (error.message === '上传已取消') {
            console.log('上传已被用户取消');
            throw error;
        }
        
        // 其他错误，清理临时文件
        if (uploadId) {
            cleanupChunkUpload(uploadId);
        }
        throw error;
    }
}

// 并发分块上传文件（按文件大小分块，保持文件完整，不拆分表格内容，优化上传速度）
async function uploadFileInChunksConcurrent(file, chunkSize) {
    // 重置取消标志
    isUploadCancelled = false;
    currentUploadChunkXHRs = [];
    
    const totalChunks = Math.ceil(file.size / chunkSize);
    const uploadId = Date.now() + '_' + Math.random().toString(36).substr(2, 9); // 生成唯一上传ID
    currentChunkUploadId = uploadId; // 保存上传ID以便取消时清理
    
    // 根据文件大小动态调整并发数（8核32G服务器优化，提升上传速度）
    // 服务器性能强，可以支持更高并发
    let maxConcurrent = 10; // 默认并发10个（提升小文件上传速度）
    if (file.size > 500 * 1024 * 1024) { // 大于500MB
        maxConcurrent = 20; // 大文件：并发20个（充分利用服务器性能）
    } else if (file.size > 100 * 1024 * 1024) { // 大于100MB
        maxConcurrent = 15; // 中等文件：并发15个
    } else {
        maxConcurrent = 10; // 小文件：并发10个
    }
    
    console.log(`文件将分成 ${totalChunks} 个块上传，每块约 ${(chunkSize / (1024 * 1024)).toFixed(2)} MB，并发数: ${maxConcurrent}`);
    
    const processingSection = document.getElementById('processingSection');
    const statusText = document.getElementById('processingStatus');
    const importBtn = document.getElementById('importBtn');
    
    // 显示上传进度
    showUploadProgress(file.name, file.size);
    
    try {
        // 并发上传控制：每次最多上传 maxConcurrent 个块
        let completedChunks = 0;
        let failedChunks = 0;
        
        for (let i = 0; i < totalChunks; i += maxConcurrent) {
            // 检查是否已取消
            if (isUploadCancelled) {
                throw new Error('上传已取消');
            }
            
            // 准备当前批次的块
            const batchPromises = [];
            const batchEnd = Math.min(i + maxConcurrent, totalChunks);
            
            for (let chunkIndex = i; chunkIndex < batchEnd; chunkIndex++) {
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const chunk = file.slice(start, end);
                
                // 创建上传Promise（并发上传）
                const chunkPromise = uploadChunk(chunk, chunkIndex, totalChunks, uploadId, file.name, file.size)
                    .then(() => {
                        completedChunks++;
                        // 更新进度
                        updateChunkUploadProgress(completedChunks, totalChunks, importBtn, statusText);
                        return { success: true, chunkIndex };
                    })
                    .catch((error) => {
                        failedChunks++;
                        console.error(`块 ${chunkIndex + 1} 上传失败:`, error);
                        return { success: false, chunkIndex, error };
                    });
                
                batchPromises.push(chunkPromise);
            }
            
            // 等待当前批次的所有块并发上传完成
            const batchResults = await Promise.all(batchPromises);
            
            // 检查是否有失败的块
            const failed = batchResults.filter(r => !r.success);
            if (failed.length > 0 && !isUploadCancelled) {
                // 如果失败数不多，继续上传（可能有网络波动）
                console.warn(`${failed.length} 个块上传失败，继续上传剩余块`);
            }
        }
        
        // 检查是否已取消
        if (isUploadCancelled) {
            throw new Error('上传已取消');
        }
        
        // 检查是否所有块都上传成功
        if (completedChunks < totalChunks && failedChunks > 0) {
            throw new Error(`部分块上传失败：成功 ${completedChunks}/${totalChunks}，失败 ${failedChunks}`);
        }
        
        
        console.log(`所有 ${totalChunks} 个块上传完成（成功: ${completedChunks}，失败: ${failedChunks}），通知服务器合并文件...`);
        
        // 所有块上传完成，通知服务器合并文件并开始处理
        hideUploadProgress();
        if (statusText) {
            statusText.textContent = '上传完成，正在合并文件并处理数据...';
        }
        importBtn.textContent = '上传完成，正在处理数据...';
        
        // 调用合并接口
        const result = await mergeChunksAndProcess(uploadId, file.name);
        
        // 清理上传ID
        currentChunkUploadId = null;
    
        // 处理结果
        if (result.success) {
            // 显示任务处理进度
            if (result.taskId) {
                localStorage.setItem('currentUploadTaskId', result.taskId.toString());
                currentTaskId = result.taskId;
                startTaskPolling(result.taskId);
            }
        } else {
            throw new Error(result.message || '合并文件失败');
        }
    } catch (error) {
        // 清理上传ID
        currentChunkUploadId = null;
        
        // 如果是用户取消，不显示错误
        if (error.message === '上传已取消') {
            console.log('上传已被用户取消');
            throw error;
        }
        
        // 其他错误，清理临时文件
        if (uploadId) {
            cleanupChunkUpload(uploadId);
        }
        throw error;
    }
}

// 更新分块上传进度显示
function updateChunkUploadProgress(completedChunks, totalChunks, importBtn, statusText) {
    const progress = Math.round((completedChunks / totalChunks) * 100);
    
    if (importBtn) {
        importBtn.textContent = `正在上传文件... (${completedChunks}/${totalChunks})`;
    }
    
    if (statusText) {
        statusText.textContent = `正在上传文件... (${completedChunks}/${totalChunks} 块, ${progress}%)`;
    }
    
    // 更新上传进度条
    const uploadProgressBar = document.getElementById('uploadProgressBar');
    const uploadProgressPercent = document.getElementById('uploadProgressPercent');
    if (uploadProgressBar) {
        uploadProgressBar.style.width = progress + '%';
    }
    if (uploadProgressPercent) {
        uploadProgressPercent.textContent = progress + '%';
    }
}

// 上传单个chunk
function uploadChunk(chunk, chunkIndex, totalChunks, uploadId, fileName, totalSize) {
    return new Promise((resolve, reject) => {
        // 检查是否已取消
        if (isUploadCancelled) {
            reject(new Error('上传已取消'));
            return;
        }
        
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex);
        formData.append('totalChunks', totalChunks);
        formData.append('uploadId', uploadId);
        formData.append('fileName', fileName);
        formData.append('totalSize', totalSize);
        
    const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/customers/import/chunk', true);
        xhr.withCredentials = true;
        xhr.timeout = 10 * 60 * 1000; // 每个chunk 10分钟超时（大文件需要更长时间）
        
        // 保存XHR对象以便取消
        currentUploadChunkXHRs.push(xhr);
    
    xhr.onreadystatechange = function() {
            // 检查是否已取消
            if (isUploadCancelled) {
                xhr.abort();
                reject(new Error('上传已取消'));
                return;
            }
            
        if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            resolve(response);
                        } else {
                            reject(new Error(response.message || '上传块失败'));
                        }
                    } catch (e) {
                        reject(new Error('无法解析服务器响应'));
                    }
                } else if (xhr.status === 401) {
                    reject(new Error('登录已过期，请重新登录'));
                } else if (xhr.status === 403) {
                    reject(new Error('权限不足'));
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        reject(new Error(response.message || '服务器错误'));
                    } catch (e) {
                        reject(new Error('服务器错误，状态码 ' + xhr.status));
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('网络错误'));
        };
        
        xhr.ontimeout = function() {
            reject(new Error('上传超时'));
        };
        
        xhr.send(formData);
    });
}

// 合并所有chunk并开始处理
function mergeChunksAndProcess(uploadId, fileName) {
    return new Promise((resolve, reject) => {
        // 检查是否已取消
        if (isUploadCancelled) {
            reject(new Error('上传已取消'));
            return;
        }
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/customers/import/merge', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 30 * 60 * 1000; // 30分钟超时（处理可能需要很长时间）
        
        // 保存XHR对象以便取消
        currentUploadXHR = xhr;
        
        const data = JSON.stringify({
            uploadId: uploadId,
            fileName: fileName
        });
        
        xhr.onreadystatechange = function() {
            // 检查是否已取消
            if (isUploadCancelled) {
                xhr.abort();
                reject(new Error('上传已取消'));
                return;
            }
            
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        reject(new Error('无法解析服务器响应'));
                    }
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        reject(new Error(response.message || '合并文件失败'));
                    } catch (e) {
                        reject(new Error('服务器错误，状态码 ' + xhr.status));
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('网络错误'));
        };
        
        xhr.ontimeout = function() {
            reject(new Error('处理超时，文件较大，处理时间较长'));
        };
        
        xhr.send(data);
    });
}

// 获取Excel文件行数
function getExcelRowCount(file) {
    return new Promise((resolve, reject) => {
        // 检查SheetJS库是否已加载
        if (typeof XLSX === 'undefined') {
            reject(new Error('SheetJS库未加载，无法检测文件大小。请刷新页面重试。'));
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                    reject(new Error('Excel文件为空或格式不正确'));
                    return;
                }
                
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                if (!firstSheet['!ref']) {
                    reject(new Error('Excel工作表为空'));
                    return;
                }
                
                const range = XLSX.utils.decode_range(firstSheet['!ref']);
                const rowCount = range.e.r + 1; // 总行数（+1因为索引从0开始，包括表头）
                
                if (rowCount <= 0) {
                    reject(new Error('文件行数无效'));
                    return;
                }
                
                resolve(rowCount);
            } catch (error) {
                console.error('读取Excel文件失败:', error);
                reject(new Error('无法读取Excel文件: ' + error.message));
            }
        };
        reader.onerror = function() {
            reject(new Error('文件读取失败，请检查文件是否损坏'));
        };
        
        try {
            reader.readAsArrayBuffer(file);
        } catch (error) {
            reject(new Error('无法读取文件: ' + error.message));
        }
    });
}

// 拆分文件并逐个导入
async function splitAndImportFile(file, maxRowsPerFile) {
    const importBtn = document.getElementById('importBtn');
    const uploadArea = document.getElementById('uploadArea');
    
    try {
        // 读取Excel文件
        const reader = new FileReader();
        const fileData = await new Promise((resolve, reject) => {
            reader.onload = (e) => resolve(new Uint8Array(e.target.result));
            reader.onerror = () => reject(new Error('文件读取失败'));
            reader.readAsArrayBuffer(file);
        });
        
        const workbook = XLSX.read(fileData, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        
        // 获取表头（第一行）
        const headerRow = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
            const cell = worksheet[cellAddress];
            headerRow.push(cell ? cell.v : '');
        }
        
        const totalRows = range.e.r; // 总行数（包括表头，索引从0开始）
        const dataRows = totalRows; // 数据行数（totalRows已经包含了所有行，包括表头）
        const numFiles = Math.ceil(dataRows / maxRowsPerFile);
        
        console.log(`文件将拆分为 ${numFiles} 个文件，先上传所有文件，上传完成后再开始处理`);
        
        // 第一步：拆分所有文件并准备上传
        const splitFiles = [];
        for (let fileIndex = 0; fileIndex < numFiles; fileIndex++) {
            const startRow = fileIndex * maxRowsPerFile + 1; // +1 跳过表头（第0行）
            const endRow = Math.min((fileIndex + 1) * maxRowsPerFile, totalRows);
            
            console.log(`准备第 ${fileIndex + 1}/${numFiles} 个文件 (第 ${(startRow).toLocaleString()}-${endRow.toLocaleString()} 行)`);
            
            // 创建新的工作簿
            const newWorkbook = XLSX.utils.book_new();
            const newWorksheet = XLSX.utils.aoa_to_sheet([headerRow]); // 添加表头
            
            // 复制数据行
            for (let row = startRow; row <= endRow; row++) {
                const rowData = [];
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
                    const cell = worksheet[cellAddress];
                    rowData.push(cell ? cell.v : '');
                }
                XLSX.utils.sheet_add_aoa(newWorksheet, [rowData], { origin: -1 });
            }
            
            XLSX.utils.book_append_sheet(newWorkbook, newWorksheet, firstSheetName);
            
            // 转换为Blob
            const wbout = XLSX.write(newWorkbook, { type: 'array', bookType: 'xlsx' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const splitFile = new File([blob], `${file.name.replace(/\.[^/.]+$/, '')}_part${fileIndex + 1}.xlsx`, { type: blob.type });
            
            splitFiles.push({
                file: splitFile,
                index: fileIndex + 1,
                total: numFiles,
                startRow: startRow,
                endRow: endRow,
                expectedCount: endRow - startRow + 1
            });
        }
        
        // 第二步：先串行上传所有文件（避免服务器压力过大，一个接一个上传）
        // 显示上传阶段
        importBtn.textContent = '正在上传文件 (0/' + numFiles + ')...';
        const allTaskIds = [];
        const uploadResults = [];
        
        // 隐藏上传进度区域，显示处理进度区域
        hideUploadProgress();
        const processingSection = document.getElementById('processingSection');
        if (processingSection) {
            processingSection.classList.add('show');
            const fileNameEl = document.getElementById('processingFileName');
            const statusText = document.getElementById('processingStatus');
            if (fileNameEl) fileNameEl.textContent = file.name;
            if (statusText) statusText.textContent = '正在上传文件...';
        }
        
        for (let i = 0; i < splitFiles.length; i++) {
            const splitFileInfo = splitFiles[i];
            
            // 更新上传进度显示
            importBtn.textContent = `正在上传文件 (${i + 1}/${numFiles})...`;
            const statusText = document.getElementById('processingStatus');
            if (statusText) {
                statusText.textContent = `正在上传文件 ${i + 1}/${numFiles}...`;
            }
            
            try {
                // 上传文件（后端会立即开始处理，但前端只等待响应返回，不等待处理完成）
                const result = await uploadSingleFileForSplit(splitFileInfo.file, i, numFiles);
                
                uploadResults.push({
                    success: true,
                    result: result,
                    fileInfo: splitFileInfo
                });
                
                // 收集任务ID（用于后续轮询处理状态）
                if (result && result.taskId) {
                    allTaskIds.push(result.taskId);
                    console.log(`文件 ${i + 1}/${numFiles} 上传完成，任务ID: ${result.taskId}（后台正在处理，不等待）`);
                }
                
                // 上传完成后短暂延迟，避免服务器压力过大
                if (i < splitFiles.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 每个文件上传后延迟500ms
                }
            } catch (error) {
                console.error(`文件 ${i + 1}/${numFiles} 上传失败:`, error);
                uploadResults.push({
                    success: false,
                    error: error,
                    fileInfo: splitFileInfo
                });
            }
        }
        
        // 所有文件上传完成
        console.log(`✅ 所有 ${numFiles} 个文件上传完成，共 ${allTaskIds.length} 个任务，现在等待处理完成...`);
        importBtn.textContent = '上传完成，正在处理数据...';
        
        // 第三步：等待所有任务处理完成
        if (allTaskIds.length > 0) {
            const statusText = document.getElementById('processingStatus');
            if (statusText) {
                statusText.textContent = `上传完成，正在处理 ${allTaskIds.length} 个文件的数据...`;
            }
            
            // 等待所有任务处理完成（轮询状态）
            await waitForAllTasksComplete(allTaskIds);
        }
        
        // 第四步：获取所有任务的最终结果
        let totalSuccess = 0;
        let totalError = 0;
        let totalSkip = 0;
        
        if (allTaskIds.length > 0) {
            const finalResults = await getFinalTaskResults(allTaskIds);
            totalSuccess = finalResults.totalSuccess;
            totalError = finalResults.totalError;
            totalSkip = finalResults.totalSkip;
        } else {
            // 如果没有任务ID，从上传结果中统计
            for (let result of uploadResults) {
                if (result.success && result.result) {
                    totalSuccess += result.result.successCount || 0;
                    totalError += result.result.errorCount || 0;
                    totalSkip += result.result.skipCount || 0;
                } else {
                    totalError += result.fileInfo.expectedCount || 0;
                }
            }
        }
        
        // 显示最终结果
            importBtn.disabled = false;
            importBtn.textContent = '开始导入';
            uploadArea.style.opacity = '1';
            
        // 清除上传信息
        hideUploadProgress();
        localStorage.removeItem('currentUploadInfo');
        
        // 不告诉用户文件被拆分，只显示导入结果
        console.log(`导入完成：共 ${numFiles} 个文件，成功 ${totalSuccess.toLocaleString()} 条，失败 ${totalError.toLocaleString()} 条，跳过 ${totalSkip.toLocaleString()} 条`);
        displayImportResult({
            success: true,
            successCount: totalSuccess,
            errorCount: totalError,
            skipCount: totalSkip,
            message: `导入完成：成功 ${totalSuccess.toLocaleString()} 条，失败 ${totalError.toLocaleString()} 条，跳过 ${totalSkip.toLocaleString()} 条`
        });
        
    } catch (error) {
        console.error('文件处理失败:', error);
        alert('文件处理失败: ' + error.message);
        importBtn.disabled = false;
        importBtn.textContent = '开始导入';
        uploadArea.style.opacity = '1';
    }
}

// 等待所有任务处理完成
async function waitForAllTasksComplete(taskIds) {
    console.log(`等待 ${taskIds.length} 个任务处理完成...`);
    
    const checkInterval = 3000; // 每3秒检查一次
    const maxWaitTime = 60 * 60 * 1000; // 最多等待1小时
    const startTime = Date.now();
    let lastUpdateTime = Date.now();
    
    const processingSection = document.getElementById('processingSection');
    const statusText = document.getElementById('processingStatus');
    const taskStats = document.getElementById('processingStats');
    
    while (Date.now() - startTime < maxWaitTime) {
        const checkResults = await Promise.all(
            taskIds.map(taskId => checkTaskStatus(taskId))
        );
        
        const completedTasks = checkResults.filter(r => r && r.complete).length;
        const allComplete = checkResults.every(r => r && r.complete);
        
        // 每5秒更新一次显示（减少更新频率）
        if (Date.now() - lastUpdateTime >= 5000) {
            if (statusText) {
                statusText.textContent = `正在处理... (${completedTasks}/${taskIds.length} 完成)`;
            }
            
            // 统计总进度
            let totalProcessed = 0;
            let totalAdded = 0;
            let totalError = 0;
            let totalSkip = 0;
            
            checkResults.forEach(result => {
                if (result && result.task) {
                    const task = result.task;
                    totalAdded += task.addedCount || 0;
                    totalError += task.errorCount || 0;
                    totalSkip += task.existingCount || 0;
                    totalProcessed += (task.addedCount || 0) + (task.existingCount || 0) + (task.errorCount || 0);
                }
            });
            
            if (taskStats) {
                taskStats.innerHTML = `
                    <div style="display: flex; gap: 15px; margin-top: 10px;">
                        <span>完成: <strong>${completedTasks}/${taskIds.length}</strong></span>
                        <span style="color: #52c41a;">成功: <strong>${totalAdded.toLocaleString()}</strong></span>
                        <span style="color: #ff7875;">失败: <strong>${totalError.toLocaleString()}</strong></span>
                        <span style="color: #faad14;">跳过: <strong>${totalSkip.toLocaleString()}</strong></span>
                    </div>
                `;
            }
            
            lastUpdateTime = Date.now();
        }
        
        if (allComplete) {
            console.log('所有任务处理完成');
            if (statusText) {
                statusText.textContent = '处理完成';
            }
            return;
        }
        
        // 等待一段时间后再检查
        await new Promise(resolve => setTimeout(resolve, checkInterval));
    }
    
    console.warn('等待超时，可能有任务未完成');
}

// 检查任务状态（返回任务对象和完成状态）
function checkTaskStatus(taskId) {
    return new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', UPLOAD_TASKS_API + '/' + taskId, true);
        xhr.withCredentials = true;
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success && response.data) {
                            const task = response.data;
                            const isComplete = task.status !== '处理中';
                            resolve({
                                complete: isComplete,
                                task: task
                            });
                        } else {
                            resolve({
                                complete: true, // 任务不存在，认为已完成
                                task: null
                            });
                        }
                    } catch (e) {
                        resolve({
                            complete: false,
                            task: null
                        });
                    }
                } else {
                    resolve({
                        complete: false,
                        task: null
                    });
                }
            }
        };
        
        xhr.onerror = function() {
            resolve({
                complete: false,
                task: null
            });
        };
        
        xhr.send();
    });
}


// 获取所有任务的最终结果
async function getFinalTaskResults(taskIds) {
    let totalSuccess = 0;
    let totalError = 0;
    let totalSkip = 0;
    
    for (let taskId of taskIds) {
        try {
            const result = await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('GET', UPLOAD_TASKS_API + '/' + taskId, true);
                xhr.withCredentials = true;
                
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if (xhr.status === 200) {
                            try {
                                const response = JSON.parse(xhr.responseText);
                                resolve(response);
                            } catch (e) {
                                reject(e);
                            }
                        } else {
                            reject(new Error('请求失败'));
                        }
                    }
                };
                
                xhr.onerror = function() {
                    reject(new Error('网络错误'));
                };
                
                xhr.send();
            });
            
            if (result.success && result.data) {
                const task = result.data;
                totalSuccess += task.addedCount || 0;
                totalError += task.errorCount || 0;
                totalSkip += task.existingCount || 0;
            }
        } catch (error) {
            console.error(`获取任务 ${taskId} 结果失败:`, error);
        }
    }
    
    return { totalSuccess, totalError, totalSkip };
}

// 上传拆分后的文件（只上传，等待响应返回，但不过度等待处理完成）
function uploadSingleFileForSplit(file, fileIndex, totalFiles) {
    return new Promise((resolve, reject) => {
    // 创建FormData
    const formData = new FormData();
        formData.append('file', file);
        
        // 发送请求
        const xhr = new XMLHttpRequest();
        xhr.open('POST', IMPORT_API, true);
        
        // 设置超时时间为30分钟
        xhr.timeout = 30 * 60 * 1000;
        xhr.withCredentials = true;
        
        // 上传进度监听
        let lastProgress = 0;
        xhr.upload.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                // 只更新当前文件的上传进度（不显示详细信息，避免混乱）
                if (percent - lastProgress >= 10) {
                    console.log(`文件 ${fileIndex + 1}/${totalFiles} 上传进度: ${percent}%`);
                    lastProgress = percent;
                }
            }
        };
        
        // 超时处理
        xhr.ontimeout = function() {
            reject(new Error('上传超时'));
        };
        
        xhr.onreadystatechange = function() {
            // 检查是否已取消
            if (isUploadCancelled) {
                xhr.abort();
                return;
            }
            
            if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                            // 上传成功，立即返回（不等待处理完成）
                            // 后端已经开始处理，但我们先返回taskId
                            resolve(response);
                        } else {
                            reject(new Error(response.message || '上传失败'));
                        }
                    } catch (e) {
                        reject(new Error('无法解析服务器响应'));
                    }
                } else if (xhr.status === 401) {
                    reject(new Error('登录已过期，请重新登录'));
                } else if (xhr.status === 403) {
                    reject(new Error('权限不足'));
                } else if (xhr.status === 524) {
                    reject(new Error('上传超时'));
                    } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        reject(new Error(response.message || '服务器错误'));
                    } catch (e) {
                        reject(new Error('服务器错误，状态码 ' + xhr.status));
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            reject(new Error('网络错误'));
        };
        
        xhr.send(formData);
    });
}

// 上传单个文件（支持只上传不等待处理完成）
function uploadSingleFile(file, isSplitFile = false, waitForProcessing = true) {
    return new Promise((resolve, reject) => {
        const importBtn = document.getElementById('importBtn');
        const uploadArea = document.getElementById('uploadArea');
        
        if (!isSplitFile) {
            importBtn.textContent = '正在上传文件...';
            
            // 更新处理进度区域的显示
            const processingSection = document.getElementById('processingSection');
            if (processingSection) {
                const statusText = document.getElementById('processingStatus');
                if (statusText) {
                    statusText.textContent = '正在上传文件...';
                }
            }
        }
        
        // 保存上传信息到 localStorage
        const uploadInfo = {
            fileName: file.name,
            fileSize: file.size,
            startTime: Date.now(),
            isSplitFile: isSplitFile
        };
        currentUploadInfo = uploadInfo;
        localStorage.setItem('currentUploadInfo', JSON.stringify(uploadInfo));
        
        // 显示上传进度区域
        showUploadProgress(file.name, file.size);
        
        // 创建FormData
        const formData = new FormData();
        formData.append('file', file);
    
    // 发送请求
    const xhr = new XMLHttpRequest();
    xhr.open('POST', IMPORT_API, true);
        
        // 保存XHR对象以便取消
        currentUploadXHR = xhr;
        
        // 设置超时时间为30分钟
        xhr.timeout = 30 * 60 * 1000;
        xhr.withCredentials = true;
        
        // 上传进度监听（优化：减少localStorage写入频率，每5%更新一次）
        let lastSavedPercent = 0;
        xhr.upload.onprogress = function(e) {
            // 检查是否已取消
            if (isUploadCancelled) {
                xhr.abort();
                return;
            }
            
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateUploadProgress(percent, e.loaded, e.total);
                
                // 减少localStorage写入频率（每5%或完成时保存一次）
                if (percent - lastSavedPercent >= 5 || percent === 100) {
                    uploadInfo.uploadPercent = percent;
                    uploadInfo.uploaded = e.loaded;
                    uploadInfo.total = e.total;
                    localStorage.setItem('currentUploadInfo', JSON.stringify(uploadInfo));
                    lastSavedPercent = percent;
                }
            }
        };
        
        // 上传完成（请求发送完成，但响应可能还未收到）
        xhr.upload.onload = function() {
            updateUploadProgress(100, uploadInfo.total, uploadInfo.total);
            // 上传完成，现在等待服务器处理
            const uploadProgressSection = document.getElementById('uploadProgressSection');
            if (uploadProgressSection) {
                const statusText = uploadProgressSection.querySelector('#uploadStatusText');
                if (statusText) {
                    statusText.textContent = '上传完成，正在处理数据...';
                }
            }
            
            // 更新处理进度区域的显示
            if (!isSplitFile) {
                importBtn.textContent = '上传完成，正在处理数据...';
                const processingSection = document.getElementById('processingSection');
                if (processingSection) {
                    const statusText = document.getElementById('processingStatus');
                    if (statusText) {
                        statusText.textContent = '上传完成，正在处理数据...';
                    }
                }
            }
        };
        
        // 超时处理
        xhr.ontimeout = function() {
            hideUploadProgress();
            localStorage.removeItem('currentUploadInfo');
            reject(new Error('导入超时：文件较大，处理时间较长'));
        };
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success) {
                            // 如果是并行上传模式（waitForProcessing=false），只上传不等待处理
                            if (!waitForProcessing) {
                                // 上传完成，但不等待处理，只返回taskId
                                resolve(response);
                            } else {
                                // 上传完成，隐藏上传进度，显示任务处理进度
                                hideUploadProgress();
                                
                                // 保存任务ID
                                if (response.taskId) {
                                    localStorage.setItem('currentUploadTaskId', response.taskId.toString());
                                    currentTaskId = response.taskId;
                                    // 清除上传信息
                                    localStorage.removeItem('currentUploadInfo');
                                    // 开始轮询任务状态
                                    startTaskPolling(response.taskId);
                                }
                                resolve(response);
                        }
                    } else {
                            reject(new Error(response.message || '导入失败'));
                    }
                } catch (e) {
                        reject(new Error('无法解析服务器响应'));
                }
            } else if (xhr.status === 401) {
                    reject(new Error('登录已过期，请重新登录'));
            } else if (xhr.status === 403) {
                    reject(new Error('权限不足，只有管理员可以导入数据'));
                } else if (xhr.status === 524) {
                    // Cloudflare 超时错误（100秒限制）
                    hideUploadProgress();
                    localStorage.removeItem('currentUploadInfo');
                    reject(new Error('请求超时，请稍后重试。如果问题持续，请联系管理员。'));
            } else {
                    hideUploadProgress();
                    localStorage.removeItem('currentUploadInfo');
                try {
                    const response = JSON.parse(xhr.responseText);
                        reject(new Error(response.message || '服务器错误'));
                } catch (e) {
                        reject(new Error('服务器错误，状态码 ' + xhr.status));
                }
            }
        }
    };
    
    xhr.onerror = function() {
            hideUploadProgress();
            localStorage.removeItem('currentUploadInfo');
            reject(new Error('网络错误，请检查连接'));
        };
        
        // 请求被中断（用户离开页面等）
        xhr.onabort = function() {
            hideUploadProgress();
            // 保留上传信息，以便用户返回时知道有未完成的上传
            console.warn('上传被中断');
    };
    
    xhr.send(formData);
    });
}

// 显示上传进度
function showUploadProgress(fileName, fileSize) {
    const uploadProgressSection = document.getElementById('uploadProgressSection');
    if (!uploadProgressSection) {
        return;
    }
    
    const fileNameEl = uploadProgressSection.querySelector('#uploadFileName');
    const progressBar = uploadProgressSection.querySelector('#uploadProgressBar');
    const progressPercent = uploadProgressSection.querySelector('#uploadProgressPercent');
    const statusText = uploadProgressSection.querySelector('#uploadStatusText');
    const uploadedSize = uploadProgressSection.querySelector('#uploadedSize');
    const cancelBtn = document.getElementById('cancelUploadBtn');
    
    if (fileNameEl) fileNameEl.textContent = fileName;
    if (statusText) statusText.textContent = '正在上传...';
    if (progressBar) progressBar.style.width = '0%';
    if (progressPercent) progressPercent.textContent = '0%';
    if (uploadedSize) {
        uploadedSize.textContent = `0 / ${formatFileSize(fileSize)}`;
    }
    
    // 显示取消按钮
    if (cancelBtn) {
        cancelBtn.style.display = 'inline-block';
    }
    
    uploadProgressSection.classList.add('show');
}

// 更新上传进度
function updateUploadProgress(percent, uploaded, total) {
    const uploadProgressSection = document.getElementById('uploadProgressSection');
    if (!uploadProgressSection) {
        return;
    }
    
    const progressBar = uploadProgressSection.querySelector('#uploadProgressBar');
    const progressPercent = uploadProgressSection.querySelector('#uploadProgressPercent');
    const uploadedSize = uploadProgressSection.querySelector('#uploadedSize');
    
    if (progressBar) progressBar.style.width = percent + '%';
    if (progressPercent) progressPercent.textContent = percent + '%';
    if (uploadedSize) {
        uploadedSize.textContent = `${formatFileSize(uploaded)} / ${formatFileSize(total)}`;
    }
}

// 隐藏上传进度
function hideUploadProgress() {
    const uploadProgressSection = document.getElementById('uploadProgressSection');
    const cancelBtn = document.getElementById('cancelUploadBtn');
    
    if (uploadProgressSection) {
        uploadProgressSection.classList.remove('show');
    }
    
    // 隐藏取消按钮
    if (cancelBtn) {
        cancelBtn.style.display = 'none';
    }
    
    currentUploadInfo = null;
}

// 取消上传
function cancelUpload() {
    if (!confirm('确定要取消上传吗？已上传的数据可能会丢失。')) {
        return;
    }
    
    console.log('用户取消了上传');
    isUploadCancelled = true;
    
    // 取消普通上传
    if (currentUploadXHR) {
        currentUploadXHR.abort();
        currentUploadXHR = null;
        console.log('已取消普通上传');
    }
    
    // 取消所有分块上传
    if (currentUploadChunkXHRs && currentUploadChunkXHRs.length > 0) {
        currentUploadChunkXHRs.forEach(xhr => {
            if (xhr && xhr.readyState !== 4) {
                xhr.abort();
            }
        });
        currentUploadChunkXHRs = [];
        console.log('已取消所有分块上传');
    }
    
    // 如果有分块上传ID，通知服务器清理临时文件
    if (currentChunkUploadId) {
        cleanupChunkUpload(currentChunkUploadId);
        currentChunkUploadId = null;
    }
    
    // 清理状态
    hideUploadProgress();
    localStorage.removeItem('currentUploadInfo');
    
    // 恢复按钮状态
    const importBtn = document.getElementById('importBtn');
    const uploadArea = document.getElementById('uploadArea');
    if (importBtn) {
        importBtn.disabled = false;
        importBtn.textContent = '开始导入';
    }
    if (uploadArea) {
        uploadArea.style.opacity = '1';
    }
    
    // 显示提示
    alert('上传已取消');
}

// 清理分块上传的临时文件（通知服务器）
function cleanupChunkUpload(uploadId) {
    // 异步清理，不等待结果
    fetch('/api/customers/import/chunk/cleanup', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ uploadId: uploadId })
    }).catch(error => {
        console.warn('清理临时文件失败:', error);
    });
}

// 显示导入结果
function displayImportResult(response) {
    const resultSection = document.getElementById('resultSection');
    const successCount = document.getElementById('successCount');
    const errorCount = document.getElementById('errorCount');
    const skipCount = document.getElementById('skipCount');
    const errorList = document.getElementById('errorList');
    
    const success = response.successCount || 0;
    const error = response.errorCount || 0;
    const skip = response.skipCount || 0;
    const errors = response.errors || [];
    
    successCount.textContent = success;
    errorCount.textContent = error;
    skipCount.textContent = skip;
    
    // 显示错误列表
    if (errors.length > 0) {
        errorList.innerHTML = '<h4>错误详情：</h4>';
        errors.forEach(function(error, index) {
            const errorItem = document.createElement('div');
            errorItem.className = 'error-item';
            errorItem.textContent = `第${error.row || index + 1}行: ${error.message || error}`;
            errorList.appendChild(errorItem);
        });
    } else {
        errorList.innerHTML = '';
    }
    
    resultSection.classList.add('show');
    
    // 如果成功导入，3秒后刷新客户列表
    if (success > 0) {
        setTimeout(function() {
            if (confirm('导入完成！是否跳转到客户列表查看？')) {
                window.location.href = '/pages/list.html';
            }
        }, 1000);
    }
    
    // 如果任务完成，清除任务ID和停止轮询
    if (response.taskId) {
        if (response.successCount > 0 && response.errorCount === 0) {
            // 任务成功完成
            localStorage.removeItem('currentUploadTaskId');
            currentTaskId = null;
            stopTaskPolling();
        }
    }
}

// 检查是否有正在处理的任务
function checkProcessingTask() {
    // 先检查是否有未完成的上传
    const savedUploadInfo = localStorage.getItem('currentUploadInfo');
    if (savedUploadInfo) {
        try {
            const uploadInfo = JSON.parse(savedUploadInfo);
            // 检查上传是否还在进行中（上传时间少于5分钟，认为可能还在进行）
            const uploadDuration = Date.now() - uploadInfo.startTime;
            if (uploadDuration < 5 * 60 * 1000) {
                // 显示上传进度（但实际可能已经中断）
                showUploadProgress(uploadInfo.fileName, uploadInfo.fileSize);
                if (uploadInfo.uploadPercent) {
                    updateUploadProgress(uploadInfo.uploadPercent, uploadInfo.uploaded || 0, uploadInfo.total || uploadInfo.fileSize);
                }
                // 提示用户上传可能已中断
                const statusText = document.querySelector('#uploadStatusText');
                if (statusText) {
                    statusText.textContent = '上传可能已中断，请重新上传';
                }
            } else {
                // 超过5分钟，清除上传信息
                localStorage.removeItem('currentUploadInfo');
            }
        } catch (e) {
            console.error('解析上传信息失败:', e);
            localStorage.removeItem('currentUploadInfo');
        }
    }
    
    // 检查localStorage中是否有保存的任务ID（上传完成后的任务处理）
    const savedTaskId = localStorage.getItem('currentUploadTaskId');
    
    if (savedTaskId) {
        // 查询任务状态
        checkTaskStatus(savedTaskId);
    } else {
        // 查询最新正在处理的任务
        checkLatestProcessingTask();
    }
}

// 检查最新正在处理的任务
function checkLatestProcessingTask() {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', UPLOAD_TASKS_API + '/processing/latest', true);
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data) {
                        const task = response.data;
                        // 显示正在处理的任务
                        showProcessingTask(task);
                        // 开始轮询任务状态
                        startTaskPolling(task.id);
                    }
                } catch (e) {
                    console.error('解析任务信息失败:', e);
                }
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('查询正在处理的任务失败');
    };
    
    xhr.send();
}

// 检查任务状态
function checkTaskStatus(taskId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', UPLOAD_TASKS_API + '/' + taskId, true);
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data) {
                        const task = response.data;
                        if (task.status === '处理中') {
                            // 任务还在处理中，显示并开始轮询
                            showProcessingTask(task);
                            startTaskPolling(task.id);
                        } else {
                            // 任务已完成，清除保存的ID
                            localStorage.removeItem('currentUploadTaskId');
                            currentTaskId = null;
                        }
                    } else {
                        // 任务不存在，清除保存的ID
                        localStorage.removeItem('currentUploadTaskId');
                        currentTaskId = null;
                    }
                } catch (e) {
                    console.error('解析任务信息失败:', e);
                }
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('查询任务状态失败');
    };
    
    xhr.send();
}

// 显示正在处理的任务
function showProcessingTask(task) {
    const processingSection = document.getElementById('processingSection');
    if (!processingSection) {
        return;
    }
    
    currentTaskId = task.id;
    localStorage.setItem('currentUploadTaskId', task.id.toString());
    
    const fileName = document.getElementById('processingFileName');
    const taskStatus = document.getElementById('processingStatus');
    const taskProgress = document.getElementById('processingProgress');
    const taskStats = document.getElementById('processingStats');
    
    if (fileName) fileName.textContent = task.fileName || '未知文件';
    if (taskStatus) taskStatus.textContent = '处理中...';
    
    // 显示进度信息
    const total = task.totalCount || 0;
    const added = task.addedCount || 0;
    const error = task.errorCount || 0;
    const skip = task.existingCount || 0;
    const processed = added + error + skip;
    
    if (taskProgress) {
        if (total > 0) {
            const percent = Math.round((processed / total) * 100);
            taskProgress.innerHTML = `
                <div style="background: #f0f0f0; height: 20px; border-radius: 10px; overflow: hidden; margin: 10px 0;">
                    <div style="background: #1890ff; height: 100%; width: ${percent}%; transition: width 0.3s; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
                        ${percent}%
                    </div>
                </div>
            `;
        } else {
            taskProgress.innerHTML = '<div style="color: #999; margin: 10px 0;">正在初始化...</div>';
        }
    }
    
    if (taskStats) {
        taskStats.innerHTML = `
            <div style="display: flex; gap: 15px; margin-top: 10px;">
                <span>总数: <strong>${total.toLocaleString()}</strong></span>
                <span style="color: #52c41a;">成功: <strong>${added.toLocaleString()}</strong></span>
                <span style="color: #ff7875;">失败: <strong>${error.toLocaleString()}</strong></span>
                <span style="color: #faad14;">跳过: <strong>${skip.toLocaleString()}</strong></span>
            </div>
        `;
    }
    
    processingSection.classList.add('show');
}

// 上传完成后立即检查一次任务状态（不进行轮询）
function checkTaskStatusOnce(taskId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', UPLOAD_TASKS_API + '/' + taskId, true);
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data) {
                        const task = response.data;
                        
                        if (task.status === '处理中') {
                            // 任务还在处理中，只显示一次，不进行轮询
                            showProcessingTask(task);
                        } else {
                            // 任务已完成，显示最终结果
                            showTaskComplete(task);
                            localStorage.removeItem('currentUploadTaskId');
                            currentTaskId = null;
                        }
                    }
                } catch (e) {
                    console.error('解析任务信息失败:', e);
                }
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('查询任务状态失败');
    };
    
    xhr.send();
}

// 开始轮询任务状态
function startTaskPolling(taskId) {
    // 如果已经在轮询，先停止
    stopTaskPolling();
    
    currentTaskId = taskId;
    
    // 每3秒轮询一次任务状态
    taskPollingInterval = setInterval(function() {
        checkTaskStatusForPolling(taskId);
    }, 3000);
}

// 轮询任务状态（用于定时更新）
function checkTaskStatusForPolling(taskId) {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', UPLOAD_TASKS_API + '/' + taskId, true);
    xhr.withCredentials = true;
    
    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) {
            if (xhr.status === 200) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    if (response.success && response.data) {
                        const task = response.data;
                        
                        if (task.status === '处理中') {
                            // 更新显示
                            showProcessingTask(task);
                        } else {
                            // 任务完成，显示最终结果
                            showTaskComplete(task);
                            stopTaskPolling();
                            localStorage.removeItem('currentUploadTaskId');
                            currentTaskId = null;
                        }
                    } else {
                        // 任务不存在，停止轮询
                        stopTaskPolling();
                        localStorage.removeItem('currentUploadTaskId');
                        currentTaskId = null;
                        hideProcessingTask();
                    }
                } catch (e) {
                    console.error('解析任务信息失败:', e);
                }
            }
        }
    };
    
    xhr.onerror = function() {
        console.error('查询任务状态失败');
    };
    
    xhr.send();
}

// 显示任务完成结果
function showTaskComplete(task) {
    // 隐藏正在处理区域
    hideProcessingTask();
    
    // 显示最终结果
    displayImportResult({
        success: true,
        successCount: task.addedCount || 0,
        errorCount: task.errorCount || 0,
        skipCount: task.existingCount || 0,
        taskId: task.id,
        message: `任务完成：${task.status}`
    });
}

// 隐藏正在处理的任务
function hideProcessingTask() {
    const processingSection = document.getElementById('processingSection');
    if (processingSection) {
        processingSection.classList.remove('show');
    }
}

// 停止轮询
function stopTaskPolling() {
    if (taskPollingInterval) {
        clearInterval(taskPollingInterval);
        taskPollingInterval = null;
    }
}

// 页面卸载时停止轮询（可选，因为任务会在后台继续）
window.addEventListener('beforeunload', function() {
    // 不停止轮询，任务会在后台继续
    // stopTaskPolling();
});

// 第一步：上传文件到服务器（只上传，不处理）
function uploadFileToServer(file) {
    return new Promise((resolve, reject) => {
        const formData = new FormData();
        formData.append('file', file);
        
        const xhr = new XMLHttpRequest();
        xhr.open('POST', UPLOAD_FILE_API, true);
        xhr.withCredentials = true;
        xhr.timeout = 60 * 60 * 1000; // 1小时超时（支持大文件上传）
        
        // 保存XHR对象以便取消
        currentUploadXHR = xhr;
        
        // 上传进度监听
        let lastSavedPercent = 0;
        xhr.upload.onprogress = function(e) {
            if (isUploadCancelled) {
                xhr.abort();
                return;
            }
            
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateUploadProgress(percent, e.loaded, e.total);
                
                // 每5%更新一次进度
                if (percent - lastSavedPercent >= 5 || percent === 100) {
                    lastSavedPercent = percent;
                }
            }
        };
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            resolve({
                                success: true,
                                fileId: response.fileId,
                                fileName: response.fileName,
                                fileSize: response.fileSize
                            });
                        } else {
                            reject(new Error(response.message || '上传文件失败'));
                        }
                    } catch (e) {
                        reject(new Error('解析响应失败: ' + e.message));
                    }
                } else if (xhr.status === 401) {
                    reject(new Error('登录已过期，请重新登录'));
                } else if (xhr.status === 403) {
                    reject(new Error('权限不足，只有管理员可以导入数据'));
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        reject(new Error(response.message || '上传文件失败，状态码: ' + xhr.status));
                    } catch (e) {
                        reject(new Error('上传文件失败，状态码: ' + xhr.status));
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            if (!isUploadCancelled) {
                reject(new Error('网络错误，请检查连接'));
            }
        };
        
        xhr.ontimeout = function() {
            reject(new Error('上传超时，请稍后重试'));
        };
        
        xhr.send(formData);
    });
}

// 第二步：通知服务器处理文件（异步处理）
function processServerFile(fileId) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', PROCESS_FILE_API, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.timeout = 30000; // 30秒超时（只是启动处理，应该很快）
        
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            resolve({
                                success: true,
                                taskId: response.taskId,
                                message: response.message
                            });
                        } else {
                            reject(new Error(response.message || '处理文件失败'));
                        }
                    } catch (e) {
                        reject(new Error('解析响应失败: ' + e.message));
                    }
                } else if (xhr.status === 0) {
                    // 状态码0表示请求未发送或服务器未响应（可能是网络问题、CORS或服务器未启动）
                    reject(new Error('无法连接到服务器，请检查网络连接或服务器是否正常运行'));
                } else if (xhr.status === 401) {
                    reject(new Error('登录已过期，请重新登录'));
                } else if (xhr.status === 403) {
                    reject(new Error('权限不足，只有管理员可以导入数据'));
                } else {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        reject(new Error(response.message || '处理文件失败，状态码: ' + xhr.status));
                    } catch (e) {
                        reject(new Error('处理文件失败，状态码: ' + xhr.status));
                    }
                }
            }
        };
        
        xhr.onerror = function() {
            // 网络错误时，状态码通常是0
            reject(new Error('网络错误，请检查连接或服务器是否正常运行'));
        };
        
        xhr.ontimeout = function() {
            reject(new Error('请求超时，请稍后重试'));
        };
        
        xhr.send(JSON.stringify({ fileId: fileId }));
    });
}

