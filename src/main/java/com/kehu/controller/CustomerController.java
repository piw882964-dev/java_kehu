package com.kehu.controller;

import com.kehu.entity.Customer;
import com.kehu.entity.CustomerRemark;
import com.kehu.entity.UploadTask;
import com.kehu.entity.User;
import com.kehu.util.FileMultipartFile;
import com.kehu.service.ChunkUploadService;
import com.kehu.service.CustomerService;
import com.kehu.service.CustomerRemarkService;
import com.kehu.service.ExcelImportService;
import com.kehu.service.OperationLogService;
import com.kehu.service.UploadTaskService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Async;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpSession;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    @Autowired
    private CustomerService customerService;

    @Autowired
    private ExcelImportService excelImportService;

    @Autowired
    private CustomerRemarkService customerRemarkService;

    @Autowired
    private UploadTaskService uploadTaskService;

    @Autowired
    private OperationLogService operationLogService;

    @Autowired
    private ChunkUploadService chunkUploadService;

    @Autowired
    private com.kehu.service.FileUploadService fileUploadService;  // 保留用于旧的接口（已废弃但未删除）

    private static final Logger logger = LoggerFactory.getLogger(CustomerController.class);

    /**
     * 获取所有客户（不分页，适用于数据量较小的情况）
     */
    @GetMapping("/all")
    public ResponseEntity<Map<String, Object>> getAllCustomers() {
        Map<String, Object> response = new HashMap<>();
        try {
            List<Customer> customers = customerService.getAllCustomers();
            response.put("success", true);
            response.put("data", customers);
            response.put("total", customers.size());
            response.put("message", "查询成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 分页查询客户（支持大数据量）
     * @param page 页码（从0开始，默认0）
     * @param size 每页大小（默认20）
     * @return 分页结果
     */
    @GetMapping
    public ResponseEntity<Map<String, Object>> getCustomers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Map<String, Object> response = new HashMap<>();
        try {
            Page<Customer> customerPage = customerService.getAllCustomers(page, size);
            
            logger.debug("查询客户数据: page={}, size={}, total={}, totalPages={}, currentPageSize={}", 
                page, size, customerPage.getTotalElements(), customerPage.getTotalPages(), customerPage.getContent().size());
            
            // 为每个客户添加关联的文件名
            List<Map<String, Object>> customerDataList = new ArrayList<>();
            for (Customer customer : customerPage.getContent()) {
                Map<String, Object> customerMap = new HashMap<>();
                customerMap.put("id", customer.getId());
                customerMap.put("name", customer.getName());
                customerMap.put("phone", customer.getPhone());
                customerMap.put("email", customer.getEmail());
                customerMap.put("address", customer.getAddress());
                customerMap.put("uploadTaskId", customer.getUploadTaskId());
                customerMap.put("createTime", customer.getCreateTime());
                customerMap.put("updateTime", customer.getUpdateTime());
                
                // 获取关联的文件名
                if (customer.getUploadTaskId() != null) {
                    Optional<UploadTask> taskOpt = uploadTaskService.getTaskById(customer.getUploadTaskId());
                    if (taskOpt.isPresent()) {
                        customerMap.put("uploadFileName", taskOpt.get().getFileName());
                    } else {
                        customerMap.put("uploadFileName", "");
                    }
                } else {
                    customerMap.put("uploadFileName", "");
                }
                
                customerDataList.add(customerMap);
            }
            
            response.put("success", true);
            response.put("data", customerDataList);
            response.put("total", customerPage.getTotalElements());
            response.put("totalPages", customerPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("message", "查询成功，共 " + customerPage.getTotalElements() + " 条记录");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // 查询错误不需要记录日志
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取客户总数（优化：添加超时和错误处理）
     */
    @GetMapping("/count")
    public ResponseEntity<Map<String, Object>> getTotalCount() {
        Map<String, Object> response = new HashMap<>();
        try {
            // 使用线程池执行，避免阻塞
            long count = customerService.getTotalCount();
            response.put("success", true);
            response.put("total", count);
            response.put("message", "查询成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // 如果查询失败，返回0而不是错误，避免前端一直重试
            // 获取总数失败时静默处理
            response.put("success", true);
            response.put("total", 0);
            response.put("message", "数据加载中，请稍后刷新");
            return ResponseEntity.ok(response);
        }
    }

    /**
     * 获取今日新增客户数量（优化：添加错误处理）
     */
    @GetMapping("/count/today")
    public ResponseEntity<Map<String, Object>> getTodayNewCount() {
        Map<String, Object> response = new HashMap<>();
        try {
            long count = customerService.getTodayNewCount();
            response.put("success", true);
            response.put("count", count);
            response.put("message", "查询成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // 如果查询失败，返回0而不是错误，避免前端一直重试
            // 获取今日新增失败时静默处理
            response.put("success", true);
            response.put("count", 0);
            response.put("message", "数据加载中，请稍后刷新");
            return ResponseEntity.ok(response);
        }
    }

    /**
     * 搜索客户（简单搜索）
     * @param keyword 搜索关键词
     * @param page 页码
     * @param size 每页大小
     * @return 分页结果
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchCustomers(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Page<Customer> customerPage = customerService.searchCustomers(keyword, page, size);
            
            // 为每个客户添加关联的文件名
            List<Map<String, Object>> customerDataList = new ArrayList<>();
            for (Customer customer : customerPage.getContent()) {
                Map<String, Object> customerMap = new HashMap<>();
                customerMap.put("id", customer.getId());
                customerMap.put("name", customer.getName());
                customerMap.put("phone", customer.getPhone());
                customerMap.put("email", customer.getEmail());
                customerMap.put("address", customer.getAddress());
                customerMap.put("uploadTaskId", customer.getUploadTaskId());
                customerMap.put("createTime", customer.getCreateTime());
                customerMap.put("updateTime", customer.getUpdateTime());
                
                // 获取关联的文件名
                if (customer.getUploadTaskId() != null) {
                    Optional<UploadTask> taskOpt = uploadTaskService.getTaskById(customer.getUploadTaskId());
                    if (taskOpt.isPresent()) {
                        customerMap.put("uploadFileName", taskOpt.get().getFileName());
                    } else {
                        customerMap.put("uploadFileName", "");
                    }
                } else {
                    customerMap.put("uploadFileName", "");
                }
                
                customerDataList.add(customerMap);
            }
            
            // 记录操作日志
            User user = (User) session.getAttribute("user");
            if (user != null) {
                operationLogService.logSuccess(
                    user.getUsername(),
                    "SEARCH",
                    "CUSTOMER",
                    "搜索客户: " + keyword,
                    getClientIpAddress(request),
                    null
                );
            }
            
            response.put("success", true);
            response.put("data", customerDataList);
            response.put("total", customerPage.getTotalElements());
            response.put("totalPages", customerPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("message", "搜索成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "搜索失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 高级搜索：多条件组合查询
     */
    @GetMapping("/advanced-search")
    public ResponseEntity<Map<String, Object>> advancedSearch(
            @RequestParam(required = false) String name,
            @RequestParam(required = false) String phone,
            @RequestParam(required = false) String email,
            @RequestParam(required = false) String address,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endTime,
            @RequestParam(required = false) Long uploadTaskId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Page<Customer> customerPage = customerService.advancedSearch(
                name, phone, email, address, startTime, endTime, uploadTaskId, page, size);
            
            // 为每个客户添加关联的文件名
            List<Map<String, Object>> customerDataList = new ArrayList<>();
            for (Customer customer : customerPage.getContent()) {
                Map<String, Object> customerMap = new HashMap<>();
                customerMap.put("id", customer.getId());
                customerMap.put("name", customer.getName());
                customerMap.put("phone", customer.getPhone());
                customerMap.put("email", customer.getEmail());
                customerMap.put("address", customer.getAddress());
                customerMap.put("uploadTaskId", customer.getUploadTaskId());
                customerMap.put("createTime", customer.getCreateTime());
                customerMap.put("updateTime", customer.getUpdateTime());
                
                // 获取关联的文件名
                if (customer.getUploadTaskId() != null) {
                    Optional<UploadTask> taskOpt = uploadTaskService.getTaskById(customer.getUploadTaskId());
                    if (taskOpt.isPresent()) {
                        customerMap.put("uploadFileName", taskOpt.get().getFileName());
                    } else {
                        customerMap.put("uploadFileName", "");
                    }
                } else {
                    customerMap.put("uploadFileName", "");
                }
                
                customerDataList.add(customerMap);
            }
            
            // 记录操作日志
            User user = (User) session.getAttribute("user");
            if (user != null) {
                StringBuilder desc = new StringBuilder("高级搜索: ");
                if (name != null && !name.isEmpty()) desc.append("姓名=").append(name).append(" ");
                if (phone != null && !phone.isEmpty()) desc.append("电话=").append(phone).append(" ");
                if (email != null && !email.isEmpty()) desc.append("邮箱=").append(email).append(" ");
                operationLogService.logSuccess(
                    user.getUsername(),
                    "ADVANCED_SEARCH",
                    "CUSTOMER",
                    desc.toString().trim(),
                    getClientIpAddress(request),
                    null
                );
            }
            
            response.put("success", true);
            response.put("data", customerDataList);
            response.put("total", customerPage.getTotalElements());
            response.put("totalPages", customerPage.getTotalPages());
            response.put("currentPage", page);
            response.put("pageSize", size);
            response.put("message", "搜索成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "搜索失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 批量查询客户
     * @param request 包含查询项列表的请求体
     * @return 查询结果
     */
    @PostMapping("/batch-query")
    public ResponseEntity<Map<String, Object>> batchQueryCustomers(@RequestBody Map<String, Object> request) {
        Map<String, Object> response = new HashMap<>();
        try {
            @SuppressWarnings("unchecked")
            List<Map<String, String>> items = (List<Map<String, String>>) request.get("items");
            
            if (items == null || items.isEmpty()) {
                response.put("success", false);
                response.put("message", "查询项不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            if (items.size() > 500) {
                response.put("success", false);
                response.put("message", "每次查询最多500条");
                return ResponseEntity.badRequest().body(response);
            }
            
            List<Map<String, Object>> results = customerService.batchQueryCustomers(items);
            
            // 为匹配的客户添加关联的文件名
            for (Map<String, Object> result : results) {
                if (result.get("matched") != null && (Boolean) result.get("matched")) {
                    Customer customer = (Customer) result.get("customer");
                    if (customer != null && customer.getUploadTaskId() != null) {
                        Optional<UploadTask> taskOpt = uploadTaskService.getTaskById(customer.getUploadTaskId());
                        if (taskOpt.isPresent()) {
                            result.put("uploadFileName", taskOpt.get().getFileName());
                        } else {
                            result.put("uploadFileName", "");
                        }
                    } else {
                        result.put("uploadFileName", "");
                    }
                }
            }
            
            response.put("success", true);
            response.put("data", results);
            response.put("total", results.size());
            response.put("matched", results.stream().filter(r -> (Boolean) r.get("matched")).count());
            response.put("message", "查询成功");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            // 批量查询失败不需要记录日志
            response.put("success", false);
            response.put("message", "批量查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping("/{id:[0-9]+}")
    public ResponseEntity<Map<String, Object>> getCustomerById(@PathVariable Long id) {
        Map<String, Object> response = new HashMap<>();
        try {
            Optional<Customer> customer = customerService.getCustomerById(id);
            if (customer.isPresent()) {
                response.put("success", true);
                response.put("data", customer.get());
                response.put("message", "查询成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "客户不存在");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PostMapping
    public ResponseEntity<Map<String, Object>> createCustomer(
            @RequestBody Customer customer,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            Customer savedCustomer = customerService.saveCustomer(customer);
            
            // 记录操作日志
            User user = (User) session.getAttribute("user");
            if (user != null) {
                operationLogService.logSuccess(
                    user.getUsername(),
                    "CREATE",
                    "CUSTOMER",
                    "创建客户: " + savedCustomer.getName() + " (ID: " + savedCustomer.getId() + ")",
                    getClientIpAddress(request),
                    savedCustomer.getId()
                );
            }
            
            response.put("success", true);
            response.put("data", savedCustomer);
            response.put("message", "添加成功");
            return ResponseEntity.status(HttpStatus.CREATED).body(response);
        } catch (Exception e) {
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            if (user != null) {
                operationLogService.logFailure(
                    user.getUsername(),
                    "CREATE",
                    "CUSTOMER",
                    "创建客户失败: " + customer.getName(),
                    getClientIpAddress(request),
                    null,
                    e.getMessage()
                );
            }
            
            response.put("success", false);
            response.put("message", "添加失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @PutMapping("/{id:[0-9]+}")
    public ResponseEntity<Map<String, Object>> updateCustomer(
            @PathVariable Long id,
            @RequestBody Customer customer,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以更新
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以更新客户");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            Optional<Customer> existingCustomer = customerService.getCustomerById(id);
            if (existingCustomer.isPresent()) {
                customer.setId(id);
                Customer updatedCustomer = customerService.saveCustomer(customer);
                
                // 记录操作日志
                User user = (User) session.getAttribute("user");
                operationLogService.logSuccess(
                    user.getUsername(),
                    "UPDATE",
                    "CUSTOMER",
                    "更新客户: " + updatedCustomer.getName() + " (ID: " + id + ")",
                    getClientIpAddress(request),
                    id
                );
                
                response.put("success", true);
                response.put("data", updatedCustomer);
                response.put("message", "更新成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "客户不存在");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            operationLogService.logFailure(
                user.getUsername(),
                "UPDATE",
                "CUSTOMER",
                "更新客户失败 (ID: " + id + ")",
                getClientIpAddress(request),
                id,
                e.getMessage()
            );
            
            response.put("success", false);
            response.put("message", "更新失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @DeleteMapping("/{id:[0-9]+}")
    public ResponseEntity<Map<String, Object>> deleteCustomer(
            @PathVariable Long id,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以删除
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以删除客户");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            Optional<Customer> customer = customerService.getCustomerById(id);
            if (customer.isPresent()) {
                String customerName = customer.get().getName();
                customerService.deleteCustomer(id);
                
                // 记录操作日志
                User user = (User) session.getAttribute("user");
                operationLogService.logSuccess(
                    user.getUsername(),
                    "DELETE",
                    "CUSTOMER",
                    "删除客户: " + customerName + " (ID: " + id + ")",
                    getClientIpAddress(request),
                    id
                );
                
                response.put("success", true);
                response.put("message", "删除成功");
                return ResponseEntity.ok(response);
            } else {
                response.put("success", false);
                response.put("message", "客户不存在");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
        } catch (Exception e) {
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            operationLogService.logFailure(
                user.getUsername(),
                "DELETE",
                "CUSTOMER",
                "删除客户失败 (ID: " + id + ")",
                getClientIpAddress(request),
                id,
                e.getMessage()
            );
            
            response.put("success", false);
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 批量删除客户（优化性能，避免卡顿）
     */
    @DeleteMapping("/batch")
    public ResponseEntity<Map<String, Object>> batchDeleteCustomers(
            @RequestBody Map<String, Object> request,
            HttpSession session,
            HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以删除
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以删除客户");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            @SuppressWarnings("unchecked")
            List<Integer> ids = (List<Integer>) request.get("ids");
            
            if (ids == null || ids.isEmpty()) {
                response.put("success", false);
                response.put("message", "请选择要删除的客户");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 转换为Long类型
            List<Long> longIds = ids.stream()
                    .map(Integer::longValue)
                    .collect(java.util.stream.Collectors.toList());
            
            // 批量删除
            int deletedCount = customerService.batchDeleteCustomers(longIds);
            
            // 记录操作日志
            User user = (User) session.getAttribute("user");
            operationLogService.logSuccess(
                user.getUsername(),
                "DELETE",
                "CUSTOMER",
                "批量删除客户: 共 " + deletedCount + " 条 (IDs: " + ids.size() + " 个)",
                getClientIpAddress(httpRequest),
                null
            );
            
            response.put("success", true);
            response.put("message", "成功删除 " + deletedCount + " 个客户");
            response.put("deletedCount", deletedCount);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("批量删除客户失败", e);
            
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            operationLogService.logFailure(
                user.getUsername(),
                "DELETE",
                "CUSTOMER",
                "批量删除客户失败",
                getClientIpAddress(httpRequest),
                null,
                e.getMessage()
            );
            
            response.put("success", false);
            response.put("message", "批量删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 导入客户数据（Excel/CSV）
     * @param file 上传的文件
     * @param session HTTP会话
     * @param request HTTP请求
     * @return 导入结果
     */
    /**
     * 直接导入文件（流式导入 + 批量入库）
     * 接收文件后立即异步处理，返回taskId用于查询进度
     */
    @PostMapping("/import")
    public ResponseEntity<Map<String, Object>> importCustomers(
            @RequestParam("file") MultipartFile file,
            HttpSession session,
            HttpServletRequest request) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以导入
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以导入数据");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                response.put("success", false);
                response.put("message", "请选择要导入的文件");
                return ResponseEntity.badRequest().body(response);
            }
            
            String fileName = file.getOriginalFilename();
            if (fileName == null || fileName.isEmpty()) {
                response.put("success", false);
                response.put("message", "文件名不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证文件大小（最大1GB）
            long maxSizeBytes = 1024 * 1024 * 1024; // 1GB
            if (file.getSize() > maxSizeBytes) {
                response.put("success", false);
                double fileSizeMB = file.getSize() / (1024.0 * 1024.0);
                response.put("message", String.format("文件大小不能超过1GB，当前文件大小为%.2fMB", fileSizeMB));
                return ResponseEntity.badRequest().body(response);
            }
            
            logger.info("开始接收文件并异步处理: {}, 大小: {} MB", fileName, file.getSize() / (1024.0 * 1024.0));
            
            // 创建上传任务记录
            UploadTask uploadTask = new UploadTask();
            uploadTask.setFileName(fileName);
            uploadTask.setStatus("处理中");
            logger.info("准备保存任务记录: fileName={}", fileName);
            uploadTask = uploadTaskService.saveTask(uploadTask);
            logger.info("任务记录已保存: taskId={}, fileName={}", uploadTask.getId(), fileName);
            
            // 异步处理文件（流式导入 + 批量入库）
            User user = (User) session.getAttribute("user");
            logger.info("准备启动异步处理: taskId={}, user={}", uploadTask.getId(), user != null ? user.getUsername() : "null");
            importFileAsync(file, uploadTask.getId(), user, getClientIpAddress(request));
            
            response.put("success", true);
            response.put("message", "文件上传成功，正在后台处理");
            response.put("taskId", uploadTask.getId());
            
            logger.info("文件处理已启动: taskId={}, fileName={}", uploadTask.getId(), fileName);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("导入失败", e);
            
            // 记录失败日志
            User user = (User) session.getAttribute("user");
            if (user != null) {
                operationLogService.logFailure(
                    user.getUsername(),
                    "IMPORT",
                    "CUSTOMER",
                    "导入客户数据失败: " + (file != null ? file.getOriginalFilename() : "未知文件"),
                    getClientIpAddress(request),
                    null,
                    e.getMessage()
                );
            }
            
            response.put("success", false);
            response.put("message", "导入失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 异步处理导入文件（流式导入 + 批量入库）
     */
    @Async("taskExecutor")
    public void importFileAsync(MultipartFile file, Long taskId, User user, String clientIp) {
        UploadTask uploadTask = null;
        try {
            uploadTask = uploadTaskService.getTaskById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在: " + taskId));
            
            String fileName = file.getOriginalFilename();
            logger.info("开始异步处理文件: taskId={}, fileName={}", taskId, fileName);
            
            // 使用流式导入，避免内存溢出（边解析边批量入库）
            Map<String, Object> importResult;
            try {
                if (fileName.toLowerCase().endsWith(".csv")) {
                    importResult = excelImportService.parseAndImportCsvFileStream(file, taskId);
                } else if (fileName.toLowerCase().endsWith(".xls") || fileName.toLowerCase().endsWith(".xlsx")) {
                    importResult = excelImportService.parseAndImportExcelFileStream(file, taskId);
                } else {
                    uploadTask.setStatus("失败");
                    uploadTaskService.saveTask(uploadTask);
                    logger.error("不支持的文件格式: {}", fileName);
                    return;
                }
            } catch (OutOfMemoryError e) {
                logger.error("内存溢出，文件过大", e);
                uploadTask.setStatus("失败");
                uploadTaskService.saveTask(uploadTask);
                return;
            } catch (Exception e) {
                logger.error("文件解析或导入失败", e);
                uploadTask.setStatus("失败");
                uploadTaskService.saveTask(uploadTask);
                return;
            }
            
            // 重新获取任务（流式导入过程中可能已经更新了进度）
            uploadTask = uploadTaskService.getTaskById(taskId).orElse(uploadTask);
            
            // 更新上传任务总数（从导入结果获取，如果流式导入没有设置）
            Integer totalCount = (Integer) importResult.get("totalCount");
            if (totalCount != null && (uploadTask.getTotalCount() == null || uploadTask.getTotalCount() == 0)) {
                uploadTask.setTotalCount(totalCount);
            }
            
            // 更新上传任务状态（流式导入过程中已经更新了addedCount，这里只更新其他统计信息）
            Integer successCount = importResult.get("successCount") != null ? (Integer) importResult.get("successCount") : 
                                 (importResult.get("totalCount") != null ? (Integer) importResult.get("totalCount") : 0);
            Integer skipCount = importResult.get("skipCount") != null ? (Integer) importResult.get("skipCount") : 0;
            Integer errorCount = importResult.get("errorCount") != null ? (Integer) importResult.get("errorCount") : 0;
            
            // 不要重新设置 addedCount，因为流式导入过程中已经通过 updateTaskProgress 更新了
            uploadTask.setExistingCount(skipCount);
            uploadTask.setErrorCount(errorCount);
            
            // 如果流式导入没有更新 addedCount，才设置（兼容旧逻辑）
            if (uploadTask.getAddedCount() == null || uploadTask.getAddedCount() == 0) {
                uploadTask.setAddedCount(successCount);
            }
            
            // 判断任务状态
            if (errorCount > 0) {
                uploadTask.setStatus("部分失败");
            } else if (skipCount > 0 && successCount > 0) {
                uploadTask.setStatus("部分跳过");
            } else if (successCount > 0) {
                uploadTask.setStatus("完成");
            } else {
                uploadTask.setStatus("失败");
            }
            uploadTaskService.saveTask(uploadTask);
            
            // 清除缓存
            customerService.invalidateCountCache();
            
            // 记录操作日志
            if (user != null) {
                operationLogService.logSuccess(
                    user.getUsername(),
                    "IMPORT",
                    "CUSTOMER",
                    "导入客户数据: " + fileName + " (成功:" + successCount + ", 跳过:" + skipCount + ", 失败:" + errorCount + ")",
                    clientIp,
                    taskId
                );
            }
            
            logger.info("导入完成: taskId={}, success={}, error={}, skip={}", 
                taskId, successCount, errorCount, skipCount);
            
        } catch (Exception e) {
            logger.error("异步处理文件失败: taskId=" + taskId, e);
            try {
                if (uploadTask != null) {
                    uploadTask.setStatus("失败");
                    uploadTaskService.saveTask(uploadTask);
                }
            } catch (Exception ex) {
                logger.error("更新任务状态失败", ex);
            }
        }
    }

    /**
     * 【已废弃】第一步：上传文件到服务器（先保存文件，不处理）
     * 已改为直接使用 /import 接口，直接处理上传流，不保存到服务器
     * @param file 上传的文件
     * @param session HTTP会话
     * @return 上传结果，包含fileId用于后续处理
     */
    // @PostMapping("/import/upload")  // 已废弃，使用 /import 接口直接处理
    public ResponseEntity<Map<String, Object>> uploadFileToServer(
            @RequestParam("file") MultipartFile file,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以导入
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以导入数据");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            // 验证文件
            if (file == null || file.isEmpty()) {
                response.put("success", false);
                response.put("message", "请选择要上传的文件");
                return ResponseEntity.badRequest().body(response);
            }
            
            String fileName = file.getOriginalFilename();
            if (fileName == null || fileName.isEmpty()) {
                response.put("success", false);
                response.put("message", "文件名不能为空");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 验证文件大小（最大1GB）
            long maxSizeBytes = 1024 * 1024 * 1024; // 1GB
            if (file.getSize() > maxSizeBytes) {
                response.put("success", false);
                double fileSizeMB = file.getSize() / (1024.0 * 1024.0);
                response.put("message", String.format("文件大小不能超过1GB，当前文件大小为%.2fMB", fileSizeMB));
                return ResponseEntity.badRequest().body(response);
            }
            
            logger.info("开始上传文件到服务器: {}, 大小: {} MB", fileName, file.getSize() / (1024.0 * 1024.0));
            
            // 保存文件到服务器临时目录
            String fileId = fileUploadService.saveUploadedFile(file);
            
            response.put("success", true);
            response.put("message", "文件上传成功");
            response.put("fileId", fileId);
            response.put("fileName", fileName);
            response.put("fileSize", file.getSize());
            
            logger.info("文件上传成功: fileId={}, fileName={}", fileId, fileName);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("上传文件失败", e);
            response.put("success", false);
            response.put("message", "上传文件失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 【已废弃】第二步：处理服务器上的文件（服务器端拆分和处理）
     * 已改为直接使用 /import 接口，直接处理上传流，不保存到服务器
     * @param request 包含fileId的请求体
     * @param session HTTP会话
     * @param httpRequest HTTP请求
     * @return 处理结果，包含taskId用于查询进度
     */
    // @PostMapping("/import/process")  // 已废弃，使用 /import 接口直接处理
    public ResponseEntity<Map<String, Object>> processUploadedFile(
            @RequestBody Map<String, String> request,
            HttpSession session,
            HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以导入
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以导入数据");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        String fileId = request.get("fileId");
        if (fileId == null || fileId.isEmpty()) {
            response.put("success", false);
            response.put("message", "fileId不能为空");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            // 获取服务器上的文件
            java.io.File serverFile = fileUploadService.getUploadedFile(fileId);
            if (serverFile == null || !serverFile.exists()) {
                response.put("success", false);
                response.put("message", "文件不存在，可能已被删除或上传失败");
                return ResponseEntity.badRequest().body(response);
            }
            
            String fileName = fileUploadService.getOriginalFileName(fileId);
            if (fileName == null) {
                fileName = serverFile.getName();
            }
            
            logger.info("开始处理服务器上的文件: fileId={}, fileName={}, size={} MB", 
                fileId, fileName, serverFile.length() / (1024.0 * 1024.0));
            
            // 创建上传任务记录
            UploadTask uploadTask = new UploadTask();
            uploadTask.setFileName(fileName);
            uploadTask.setStatus("处理中");
            uploadTask = uploadTaskService.saveTask(uploadTask);
            
            // 异步处理文件（服务器端拆分和处理）
            processServerFileAsync(fileId, serverFile, fileName, uploadTask.getId(), 
                (User) session.getAttribute("user"), getClientIpAddress(httpRequest));
            
            response.put("success", true);
            response.put("message", "文件处理已开始，正在服务器端处理");
            response.put("taskId", uploadTask.getId());
            
            logger.info("文件处理已启动: taskId={}, fileId={}, fileName={}", uploadTask.getId(), fileId, fileName);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("处理文件失败: fileId=" + fileId, e);
            response.put("success", false);
            response.put("message", "处理文件失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 异步处理服务器上的文件（服务器端拆分和处理）
     */
    @Async("taskExecutor")
    public void processServerFileAsync(String fileId, java.io.File serverFile, String fileName, 
                                       Long taskId, User user, String clientIp) {
        UploadTask uploadTask = null;
        try {
            uploadTask = uploadTaskService.getTaskById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在: " + taskId));
            
            logger.info("开始异步处理服务器文件: taskId={}, fileId={}, fileName={}", taskId, fileId, fileName);
            
            // 将File转换为MultipartFile
            String contentType = "application/octet-stream";
            if (fileName.toLowerCase().endsWith(".xlsx")) {
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else if (fileName.toLowerCase().endsWith(".xls")) {
                contentType = "application/vnd.ms-excel";
            } else if (fileName.toLowerCase().endsWith(".csv")) {
                contentType = "text/csv";
            }
            MultipartFile multipartFile = new FileMultipartFile(serverFile, fileName, contentType);
            
            // 使用流式导入处理文件（服务器端会自动分批处理）
            Map<String, Object> importResult;
            if (fileName.toLowerCase().endsWith(".csv")) {
                importResult = excelImportService.parseAndImportCsvFileStream(multipartFile, taskId);
            } else if (fileName.toLowerCase().endsWith(".xls") || fileName.toLowerCase().endsWith(".xlsx")) {
                importResult = excelImportService.parseAndImportExcelFileStream(multipartFile, taskId);
            } else {
                uploadTask.setStatus("失败");
                uploadTaskService.saveTask(uploadTask);
                logger.error("不支持的文件格式: {}", fileName);
                return;
            }
            
            // 重新获取任务（流式导入过程中可能已经更新了进度）
            uploadTask = uploadTaskService.getTaskById(taskId).orElse(uploadTask);
            
            // 更新任务状态（流式导入过程中已经更新了addedCount和totalCount，这里只更新其他统计信息）
            int successCount = (Integer) importResult.get("successCount");
            int skipCount = (Integer) importResult.get("skipCount");
            int errorCount = (Integer) importResult.get("errorCount");
            
            // 如果流式导入没有更新 totalCount，才设置
            Integer totalCount = (Integer) importResult.get("totalCount");
            if (totalCount != null && (uploadTask.getTotalCount() == null || uploadTask.getTotalCount() == 0)) {
                uploadTask.setTotalCount(totalCount);
            }
            
            // 不要重新设置 addedCount，因为流式导入过程中已经通过 updateTaskProgress 更新了
            uploadTask.setExistingCount(skipCount);
            uploadTask.setErrorCount(errorCount);
            
            // 如果流式导入没有更新 addedCount，才设置（兼容旧逻辑）
            if (uploadTask.getAddedCount() == null || uploadTask.getAddedCount() == 0) {
                uploadTask.setAddedCount(successCount);
            }
            
            if (errorCount > 0) {
                uploadTask.setStatus("部分失败");
            } else if (skipCount > 0 && successCount > 0) {
                uploadTask.setStatus("部分跳过");
            } else if (successCount > 0) {
                uploadTask.setStatus("完成");
            } else {
                uploadTask.setStatus("失败");
            }
            uploadTaskService.saveTask(uploadTask);
            
            // 记录操作日志
            if (user != null) {
                operationLogService.logSuccess(
                    user.getUsername(),
                    "IMPORT",
                    "CUSTOMER",
                    "导入客户数据: " + fileName + " (成功:" + successCount + ", 跳过:" + skipCount + ", 失败:" + errorCount + ")",
                    clientIp,
                    taskId
                );
            }
            
            // 清理临时文件
            fileUploadService.deleteUploadedFile(fileId);
            if (serverFile.exists()) {
                try {
                    serverFile.delete();
                } catch (Exception e) {
                    logger.warn("删除服务器文件失败: " + serverFile.getPath(), e);
                }
            }
            
            logger.info("异步处理完成: taskId={}, success={}, error={}, skip={}", 
                taskId, successCount, errorCount, skipCount);
                
        } catch (Exception e) {
            logger.error("异步处理服务器文件失败: taskId=" + taskId + ", fileId=" + fileId + ", fileName=" + fileName, e);
            
            // 更新任务状态为失败
            try {
                if (uploadTask == null) {
                    uploadTask = uploadTaskService.getTaskById(taskId).orElse(null);
                }
                if (uploadTask != null) {
                    uploadTask.setStatus("失败");
                    uploadTaskService.saveTask(uploadTask);
                }
            } catch (Exception ex) {
                logger.error("更新任务状态失败", ex);
            }
            
            // 记录失败日志
            if (user != null) {
                try {
                    operationLogService.logFailure(
                        user.getUsername(),
                        "IMPORT",
                        "CUSTOMER",
                        "导入客户数据失败: " + fileName,
                        clientIp,
                        taskId,
                        e.getMessage()
                    );
                } catch (Exception logEx) {
                    logger.error("记录失败日志失败", logEx);
                }
            }
            
            // 清理临时文件
            try {
                fileUploadService.deleteUploadedFile(fileId);
                if (serverFile != null && serverFile.exists()) {
                    serverFile.delete();
                }
            } catch (Exception cleanupEx) {
                // 清理临时文件失败时静默处理
            }
        }
    }

    /**
     * 接收文件块（分块上传）
     */
    @PostMapping("/import/chunk")
    public ResponseEntity<Map<String, Object>> uploadChunk(
            @RequestParam("chunk") MultipartFile chunk,
            @RequestParam("chunkIndex") int chunkIndex,
            @RequestParam("totalChunks") int totalChunks,
            @RequestParam("uploadId") String uploadId,
            @RequestParam("fileName") String fileName,
            @RequestParam("totalSize") long totalSize,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以导入数据");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            chunkUploadService.saveChunk(uploadId, chunkIndex, chunk, fileName, totalSize, totalChunks);
            response.put("success", true);
            response.put("message", "块上传成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("接收文件块失败", e);
            response.put("success", false);
            response.put("message", "接收文件块失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }
    
    /**
     * 合并所有块并开始处理
     */
    @PostMapping("/import/merge")
    public ResponseEntity<Map<String, Object>> mergeChunksAndProcess(
            @RequestBody Map<String, String> request,
            HttpSession session,
            HttpServletRequest httpRequest) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以导入数据");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        String uploadId = request.get("uploadId");
        String fileName = request.get("fileName");
        
        if (uploadId == null || fileName == null) {
            response.put("success", false);
            response.put("message", "参数错误：uploadId 和 fileName 不能为空");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            // 检查所有块是否都已接收
            if (!chunkUploadService.isAllChunksReceived(uploadId)) {
                response.put("success", false);
                response.put("message", "还有块未接收完成");
                return ResponseEntity.badRequest().body(response);
            }
            
            // 合并所有块为完整文件
            java.io.File mergedFile = chunkUploadService.mergeChunks(uploadId);
            
            // 创建上传任务
            UploadTask uploadTask = new UploadTask();
            uploadTask.setFileName(fileName);
            uploadTask.setStatus("处理中");
            uploadTask = uploadTaskService.saveTask(uploadTask);
            
            // 异步处理文件（避免524超时错误）
            // 立即返回taskId，让前端开始轮询，后台异步处理文件
            processMergedFileAsync(uploadId, mergedFile, fileName, uploadTask.getId(), 
                (User) session.getAttribute("user"), getClientIpAddress(httpRequest));
            
            // 立即返回，不等待处理完成（避免Cloudflare 524超时）
            response.put("success", true);
            response.put("taskId", uploadTask.getId());
            response.put("message", "文件合并完成，正在后台处理，请等待...");
            
            logger.info("文件合并完成，开始异步处理: taskId={}, fileName={}", uploadTask.getId(), fileName);
            
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            logger.error("合并文件块失败", e);
            chunkUploadService.cleanup(uploadId);
            response.put("success", false);
            response.put("message", "合并文件块失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 异步处理合并后的文件（避免524超时错误）
     * 使用自定义线程池 taskExecutor（8核32G优化配置）
     */
    @Async("taskExecutor")
    public void processMergedFileAsync(String uploadId, java.io.File mergedFile, String fileName, 
                                       Long taskId, User user, String clientIp) {
        UploadTask uploadTask = null;
        try {
            uploadTask = uploadTaskService.getTaskById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在: " + taskId));
            
            logger.info("开始异步处理文件: taskId={}, fileName={}", taskId, fileName);
            
            // 将File转换为MultipartFile
            String contentType = "application/octet-stream";
            if (fileName.toLowerCase().endsWith(".xlsx")) {
                contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            } else if (fileName.toLowerCase().endsWith(".xls")) {
                contentType = "application/vnd.ms-excel";
            } else if (fileName.toLowerCase().endsWith(".csv")) {
                contentType = "text/csv";
            }
            MultipartFile multipartFile = new FileMultipartFile(mergedFile, fileName, contentType);
            
            // 使用流式导入处理文件
            Map<String, Object> importResult;
            if (fileName.toLowerCase().endsWith(".csv")) {
                importResult = excelImportService.parseAndImportCsvFileStream(multipartFile, taskId);
            } else if (fileName.toLowerCase().endsWith(".xls") || fileName.toLowerCase().endsWith(".xlsx")) {
                importResult = excelImportService.parseAndImportExcelFileStream(multipartFile, taskId);
            } else {
                uploadTask.setStatus("失败");
                uploadTaskService.saveTask(uploadTask);
                logger.error("不支持的文件格式: {}", fileName);
                return;
            }
            
            // 重新获取任务（可能状态已更新）
            uploadTask = uploadTaskService.getTaskById(taskId)
                .orElseThrow(() -> new RuntimeException("任务不存在: " + taskId));
            
            // 重新获取任务（流式导入过程中可能已经更新了进度）
            uploadTask = uploadTaskService.getTaskById(taskId).orElse(uploadTask);
            
            // 更新任务状态（流式导入过程中已经更新了addedCount和totalCount，这里只更新其他统计信息）
            int successCount = (Integer) importResult.get("successCount");
            int skipCount = (Integer) importResult.get("skipCount");
            int errorCount = (Integer) importResult.get("errorCount");
            
            // 如果流式导入没有更新 totalCount，才设置
            Integer totalCount = (Integer) importResult.get("totalCount");
            if (totalCount != null && (uploadTask.getTotalCount() == null || uploadTask.getTotalCount() == 0)) {
                uploadTask.setTotalCount(totalCount);
            }
            
            // 不要重新设置 addedCount，因为流式导入过程中已经通过 updateTaskProgress 更新了
            // uploadTask.setAddedCount(successCount);  // 删除：避免覆盖流式导入过程中的进度更新
            uploadTask.setExistingCount(skipCount);
            uploadTask.setErrorCount(errorCount);
            
            // 如果流式导入没有更新 addedCount，才设置（兼容旧逻辑）
            if (uploadTask.getAddedCount() == null || uploadTask.getAddedCount() == 0) {
                uploadTask.setAddedCount(successCount);
            }
            
            if (errorCount > 0) {
                uploadTask.setStatus("部分失败");
            } else if (skipCount > 0 && successCount > 0) {
                uploadTask.setStatus("部分跳过");
            } else if (successCount > 0) {
                uploadTask.setStatus("完成");
            } else {
                uploadTask.setStatus("失败");
            }
            uploadTaskService.saveTask(uploadTask);
            
            // 记录操作日志
            if (user != null) {
                operationLogService.logSuccess(
                    user.getUsername(),
                    "IMPORT",
                    "CUSTOMER",
                    "导入客户数据: " + fileName + " (成功:" + successCount + ", 跳过:" + skipCount + ", 失败:" + errorCount + ")",
                    clientIp,
                    taskId
                );
            }
            
            // 清理临时文件
            chunkUploadService.cleanup(uploadId);
            
            logger.info("异步处理完成: taskId={}, success={}, error={}, skip={}", 
                taskId, successCount, errorCount, skipCount);
                
        } catch (Exception e) {
            logger.error("异步处理文件失败: taskId=" + taskId + ", fileName=" + fileName, e);
            
            // 更新任务状态为失败
            try {
                if (uploadTask == null) {
                    uploadTask = uploadTaskService.getTaskById(taskId).orElse(null);
                }
                if (uploadTask != null) {
                    uploadTask.setStatus("失败");
                    uploadTaskService.saveTask(uploadTask);
                }
            } catch (Exception ex) {
                logger.error("更新任务状态失败", ex);
            }
            
            // 记录失败日志
            if (user != null) {
                try {
                    operationLogService.logFailure(
                        user.getUsername(),
                        "IMPORT",
                        "CUSTOMER",
                        "导入客户数据失败: " + fileName,
                        clientIp,
                        taskId,
                        e.getMessage()
                    );
                } catch (Exception ex) {
                    logger.error("记录失败日志失败", ex);
                }
            }
            
            // 清理临时文件
            try {
                chunkUploadService.cleanup(uploadId);
            } catch (Exception ex) {
                logger.error("清理临时文件失败", ex);
            }
        }
    }

    /**
     * 清理分块上传的临时文件
     */
    @PostMapping("/import/chunk/cleanup")
    public ResponseEntity<Map<String, Object>> cleanupChunkUpload(
            @RequestBody Map<String, String> request,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        String uploadId = request.get("uploadId");
        if (uploadId == null || uploadId.isEmpty()) {
            response.put("success", false);
            response.put("message", "uploadId 不能为空");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            chunkUploadService.cleanup(uploadId);
            response.put("success", true);
            response.put("message", "临时文件已清理");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("清理临时文件失败", e);
            response.put("success", false);
            response.put("message", "清理失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 下载导入模板
     * @return Excel模板文件
     */
    @GetMapping("/import/template")
    public ResponseEntity<byte[]> downloadTemplate() {
        try {
            // 创建简单的Excel模板
            org.apache.poi.ss.usermodel.Workbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("客户数据");
            
            // 创建表头
            org.apache.poi.ss.usermodel.Row headerRow = sheet.createRow(0);
            headerRow.createCell(0).setCellValue("姓名");
            headerRow.createCell(1).setCellValue("电话");
            headerRow.createCell(2).setCellValue("邮箱");
            headerRow.createCell(3).setCellValue("地址");
            
            // 设置列宽
            sheet.setColumnWidth(0, 5000);
            sheet.setColumnWidth(1, 4000);
            sheet.setColumnWidth(2, 5000);
            sheet.setColumnWidth(3, 8000);
            
            // 添加示例数据
            org.apache.poi.ss.usermodel.Row exampleRow = sheet.createRow(1);
            exampleRow.createCell(0).setCellValue("张三");
            exampleRow.createCell(1).setCellValue("13800138001");
            exampleRow.createCell(2).setCellValue("zhangsan@example.com");
            exampleRow.createCell(3).setCellValue("北京市朝阳区建国路88号");
            
            // 转换为字节数组
            java.io.ByteArrayOutputStream outputStream = new java.io.ByteArrayOutputStream();
            workbook.write(outputStream);
            workbook.close();
            
            byte[] bytes = outputStream.toByteArray();
            outputStream.close();
            
            // 设置响应头
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.setContentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDispositionFormData("attachment", "客户数据导入模板.xlsx");
            headers.setContentLength(bytes.length);
            
            return new ResponseEntity<>(bytes, headers, HttpStatus.OK);
            
        } catch (Exception e) {
            logger.error("下载模板失败", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 获取客户备注
     * @param customerId 客户ID
     * @return 备注信息
     */
    @GetMapping("/{id:[0-9]+}/remark")
    public ResponseEntity<Map<String, Object>> getCustomerRemark(@PathVariable("id") Long customerId) {
        Map<String, Object> response = new HashMap<>();
        try {
            CustomerRemark remark = customerRemarkService.getRemarkByCustomerId(customerId);
            response.put("success", true);
            if (remark != null) {
                response.put("data", remark);
                response.put("hasRemark", true);
            } else {
                response.put("hasRemark", false);
                response.put("data", null);
            }
            response.put("message", "查询成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "查询失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 保存或更新客户备注
     * @param customerId 客户ID
     * @param request 包含备注内容的请求体
     * @param session HTTP会话
     * @return 保存结果
     */
    @PostMapping("/{id}/remark")
    public ResponseEntity<Map<String, Object>> saveCustomerRemark(
            @PathVariable("id") Long customerId,
            @RequestBody Map<String, String> request,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以添加/修改备注
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以添加备注");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            String remarks = request.get("remarks");
            if (remarks == null) {
                remarks = "";
            }
            
            // 验证客户是否存在
            Optional<Customer> customer = customerService.getCustomerById(customerId);
            if (!customer.isPresent()) {
                response.put("success", false);
                response.put("message", "客户不存在");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(response);
            }
            
            CustomerRemark remark = customerRemarkService.saveOrUpdateRemark(customerId, remarks.trim());
            
            response.put("success", true);
            response.put("data", remark);
            response.put("message", "备注保存成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("保存备注失败", e);
            response.put("success", false);
            response.put("message", "保存失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 删除客户备注
     * @param customerId 客户ID
     * @param session HTTP会话
     * @return 删除结果
     */
    @DeleteMapping("/{id:[0-9]+}/remark")
    public ResponseEntity<Map<String, Object>> deleteCustomerRemark(
            @PathVariable("id") Long customerId,
            HttpSession session) {
        Map<String, Object> response = new HashMap<>();
        
        // 权限检查：只有ADMIN可以删除备注
        if (!hasAdminRole(session)) {
            response.put("success", false);
            response.put("message", "权限不足，只有管理员可以删除备注");
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(response);
        }
        
        try {
            customerRemarkService.deleteRemark(customerId);
            response.put("success", true);
            response.put("message", "备注删除成功");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "删除失败: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    /**
     * 获取客户端IP地址
     */
    private String getClientIpAddress(HttpServletRequest request) {
        String ip = request.getHeader("X-Forwarded-For");
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getHeader("WL-Proxy-Client-IP");
        }
        if (ip == null || ip.isEmpty() || "unknown".equalsIgnoreCase(ip)) {
            ip = request.getRemoteAddr();
        }
        return ip;
    }

    /**
     * 检查当前用户是否有管理员权限
     * @param session HTTP会话
     * @return true表示是管理员，false表示不是
     */
    private boolean hasAdminRole(HttpSession session) {
        if (session == null) {
            return false;
        }
        User user = (User) session.getAttribute("user");
        if (user == null) {
            return false;
        }
        String role = user.getRole();
        return "ADMIN".equals(role);
    }
}

