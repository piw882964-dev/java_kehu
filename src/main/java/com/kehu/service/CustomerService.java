package com.kehu.service;

import com.kehu.entity.Customer;
import com.kehu.repository.CustomerRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class CustomerService {

    private static final Logger logger = LoggerFactory.getLogger(CustomerService.class);

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    // 缓存客户总数（5分钟过期）
    private static final Map<String, CacheEntry> countCache = new ConcurrentHashMap<>();
    private static final long CACHE_EXPIRE_TIME = 5 * 60 * 1000; // 5分钟

    static {
        // 定期清理过期缓存
        ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(1);
        scheduler.scheduleAtFixedRate(() -> {
            long currentTime = System.currentTimeMillis();
            countCache.entrySet().removeIf(entry -> 
                currentTime - entry.getValue().getTimestamp() > CACHE_EXPIRE_TIME
            );
        }, 1, 1, TimeUnit.MINUTES);
    }

    private static class CacheEntry {
        private final long value;
        private final long timestamp;

        public CacheEntry(long value) {
            this.value = value;
            this.timestamp = System.currentTimeMillis();
        }

        public long getValue() {
            return value;
        }

        public long getTimestamp() {
            return timestamp;
        }
    }

    public List<Customer> getAllCustomers() {
        return customerRepository.findAll();
    }

    /**
     * 分页查询所有客户（支持大数据量）
     * @param page 页码（从0开始）
     * @param size 每页大小
     * @return 分页结果
     */
    public Page<Customer> getAllCustomers(int page, int size) {
        // 按ID升序排列，保持数据库插入顺序
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"));
        return customerRepository.findAll(pageable);
    }

    public Optional<Customer> getCustomerById(Long id) {
        return customerRepository.findById(id);
    }

    public Customer saveCustomer(Customer customer) {
        // 保存后清除缓存
        invalidateCountCache();
        return customerRepository.save(customer);
    }

    /**
     * 批量保存客户（支持大数据量）
     * @param customers 客户列表
     * @return 保存后的客户列表
     */
    @Transactional
    public List<Customer> saveAllCustomers(List<Customer> customers) {
        List<Customer> saved = customerRepository.saveAll(customers);
        // 保存后清除缓存
        invalidateCountCache();
        return saved;
    }

    @Transactional
    public void deleteCustomer(Long id) {
        customerRepository.deleteById(id);
        // 删除后清除缓存
        invalidateCountCache();
    }
    
    /**
     * 批量删除客户（优化性能）
     * @param ids 客户ID列表
     * @return 删除的数量
     */
    @Transactional
    public int batchDeleteCustomers(List<Long> ids) {
        if (ids == null || ids.isEmpty()) {
            return 0;
        }
        
        // 使用批量删除，性能更好
        int deletedCount = 0;
        // 分批删除，每批500条，避免SQL语句过长
        int batchSize = 500;
        for (int i = 0; i < ids.size(); i += batchSize) {
            int end = Math.min(i + batchSize, ids.size());
            List<Long> batch = ids.subList(i, end);
            customerRepository.deleteAllById(batch);
            deletedCount += batch.size();
        }
        
        // 删除后清除缓存
        invalidateCountCache();
        
        return deletedCount;
    }

    @Transactional(readOnly = true)
    public List<Customer> searchCustomersByName(String name) {
        return customerRepository.findByNameContaining(name);
    }

    /**
     * 分页搜索客户（支持大数据量）
     * @param name 搜索关键词
     * @param page 页码
     * @param size 每页大小
     * @return 分页结果
     */
    @Transactional(readOnly = true)
    public Page<Customer> searchCustomersByName(String name, int page, int size) {
        // 按ID升序排列，保持数据库插入顺序
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"));
        return customerRepository.findByNameContaining(name, pageable);
    }

    /**
     * 获取客户总数（优化：使用缓存 + 快速近似值查询）
     * @return 总数
     */
    @Transactional(readOnly = true)
    public long getTotalCount() {
        try {
            // 检查缓存
            CacheEntry cached = countCache.get("total");
            if (cached != null && (System.currentTimeMillis() - cached.getTimestamp()) < CACHE_EXPIRE_TIME) {
                logger.debug("使用缓存的客户总数: {}", cached.getValue());
                return cached.getValue();
            }

            // 缓存过期或不存在，查询数据库
            // 优先尝试快速近似值查询（使用information_schema，很快但可能不准确）
            long count = queryApproximateCount();
            
            // 如果近似值查询失败或返回0，使用精确查询
            if (count == 0 && jdbcTemplate != null) {
                try {
                    count = customerRepository.count();
                    logger.debug("使用精确COUNT查询: {}", count);
                } catch (Exception e) {
                    logger.warn("精确COUNT查询失败，使用近似值: {}", count, e);
                }
            } else {
                logger.debug("使用近似值查询: {}", count);
            }
            
            // 更新缓存
            countCache.put("total", new CacheEntry(count));
            logger.debug("查询并缓存客户总数: {}", count);
            
            return count;
        } catch (Exception e) {
            logger.error("获取客户总数失败", e);
            // 如果查询失败，尝试返回缓存值（即使过期）
            CacheEntry cached = countCache.get("total");
            if (cached != null) {
                logger.warn("查询失败，使用过期缓存值: {}", cached.getValue());
                return cached.getValue();
            }
            // 最后尝试精确查询
            try {
                return customerRepository.count();
            } catch (Exception ex) {
                logger.error("所有查询方法都失败", ex);
                throw ex;
            }
        }
    }

    /**
     * 使用information_schema快速获取近似行数（非常快，但可能不准确）
     * 适用于数据量很大，不需要精确值的场景
     */
    private long queryApproximateCount() {
        if (jdbcTemplate == null) {
            return 0;
        }
        try {
            Long count = jdbcTemplate.queryForObject(
                "SELECT table_rows FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'customers'",
                Long.class
            );
            return count != null ? count : 0;
        } catch (Exception e) {
            logger.debug("近似值查询失败，将使用精确查询", e);
            return 0;
        }
    }

    /**
     * 清除总数缓存
     */
    public void invalidateCountCache() {
        countCache.remove("total");
    }

    /**
     * 获取今日新增客户数量
     * @return 今日新增数量
     */
    @Transactional(readOnly = true)
    public long getTodayNewCount() {
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);
        
        return customerRepository.countByCreateTimeBetween(startOfDay, endOfDay);
    }

    /**
     * 搜索客户（支持姓名、电话、邮箱）
     * @param keyword 搜索关键词
     * @param page 页码
     * @param size 每页大小
     * @return 分页结果
     */
    @Transactional(readOnly = true)
    public Page<Customer> searchCustomers(String keyword, int page, int size) {
        // 按ID升序排列，保持数据库插入顺序
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"));
        
        // 如果关键词为空，返回所有
        if (keyword == null || keyword.trim().isEmpty()) {
            return customerRepository.findAll(pageable);
        }
        
        // 搜索姓名包含关键词的客户
        return customerRepository.findByNameContaining(keyword.trim(), pageable);
    }

    /**
     * 批量查询客户
     * @param queryItems 查询项列表，每个项包含name、phone、address等字段
     * @return 查询结果列表，每个结果包含queryItem和匹配的customer（如果找到）
     */
    @Transactional(readOnly = true)
    public List<Map<String, Object>> batchQueryCustomers(List<Map<String, String>> queryItems) {
        List<Map<String, Object>> results = new ArrayList<>();
        
        for (Map<String, String> queryItem : queryItems) {
            Map<String, Object> result = new HashMap<>();
            result.put("queryItem", queryItem);
            
            String phone = queryItem.get("phone");
            String name = queryItem.get("name");
            
            Customer matchedCustomer = null;
            
            // 优先按电话精确匹配
            if (phone != null && !phone.trim().isEmpty()) {
                Optional<Customer> customerOpt = customerRepository.findByPhone(phone.trim());
                if (customerOpt.isPresent()) {
                    matchedCustomer = customerOpt.get();
                }
            }
            
            // 如果电话没找到，尝试按姓名匹配
            if (matchedCustomer == null && name != null && !name.trim().isEmpty()) {
                List<Customer> customersByName = customerRepository.findByNameContaining(name.trim());
                if (!customersByName.isEmpty()) {
                    matchedCustomer = customersByName.get(0);
                }
            }
            
            result.put("customer", matchedCustomer);
            result.put("matched", matchedCustomer != null);
            results.add(result);
        }
        
        return results;
    }

    /**
     * 批量保存客户（用于导入）- 高性能优化版
     * 注意：这个方法可能被多次调用（流式导入时），每次只保存一部分数据
     * @param customers 客户列表（通常是批次，如5000条）
     * @param uploadTaskId 上传任务ID（关联的文件名）
     * @return 保存结果统计
     */
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> batchImportCustomers(List<Customer> customers, Long uploadTaskId) {
        Map<String, Object> result = new HashMap<>();
        int successCount = 0;
        int skipCount = 0;
        List<String> errors = new ArrayList<>();
        
        long startTime = System.currentTimeMillis();
        
        // 第一步：批量收集所有非空电话，一次性查询数据库中已存在的电话
        Set<String> existingPhones = new HashSet<>();
        List<String> phoneList = new ArrayList<>();
        for (Customer customer : customers) {
            if (customer.getPhone() != null && !customer.getPhone().trim().isEmpty()) {
                phoneList.add(customer.getPhone().trim());
            }
        }
        
        // 批量查询已存在的电话（避免逐条查询，降低批次大小减少内存占用）
        if (!phoneList.isEmpty()) {
            try {
                // 分批查询（增大批次大小，提升查询性能，每批最多1000个）
                int phoneBatchSize = 1000;
                for (int i = 0; i < phoneList.size(); i += phoneBatchSize) {
                    int end = Math.min(i + phoneBatchSize, phoneList.size());
                    List<String> phoneBatch = phoneList.subList(i, end);
                    List<String> foundPhones = customerRepository.findPhonesByPhoneIn(phoneBatch);
                    existingPhones.addAll(foundPhones);
                }
                logger.debug("批量查询重复电话: 检查{}个，找到{}个重复", phoneList.size(), existingPhones.size());
            } catch (Exception e) {
                logger.warn("批量查询重复电话失败，将跳过重复检查", e);
                // 如果批量查询失败，existingPhones保持为空，后续会跳过重复检查
            }
        }
        
        // 第二步：验证和过滤数据，收集所有有效的客户
        List<Customer> validCustomers = new ArrayList<>();
        for (int i = 0; i < customers.size(); i++) {
            Customer customer = customers.get(i);
            try {
                // 验证必填字段
                if (customer.getName() == null || customer.getName().trim().isEmpty()) {
                    if (errors.size() < 100) { // 最多记录100个错误，避免错误信息过多
                        errors.add("姓名为空");
                    }
                    continue;
                }
                
                // 检查电话是否重复（使用内存中的Set，避免数据库查询）
                // 重复验证规则：如果电话已存在，则跳过该条记录（避免重复导入）
                String phone = customer.getPhone() != null ? customer.getPhone().trim() : null;
                if (phone != null && !phone.isEmpty()) {
                    if (existingPhones.contains(phone)) {
                        skipCount++;
                        logger.debug("跳过重复数据: 电话={}, 姓名={}", phone, customer.getName());
                        continue; // 跳过重复数据，不记录错误信息，避免内存溢出
                    }
                    // 将当前批次中的电话也加入Set，避免同批次内重复
                    existingPhones.add(phone);
                }
                
                // uploadTaskId应该在调用前已设置，这里确保已设置
                if (customer.getUploadTaskId() == null) {
                    customer.setUploadTaskId(uploadTaskId);
                }
                
                // 添加到有效客户数组
                validCustomers.add(customer);
            } catch (Exception e) {
                if (errors.size() < 100) {
                    errors.add("数据验证失败: " + e.getMessage());
                }
            }
        }
        
        
        // 第三步：保存有效客户（流式导入时，validCustomers已经是小批次，直接保存）
        if (!validCustomers.isEmpty()) {
            try {
                // 进一步分批保存，每批最多200条（大幅减少内存占用）
                int saveBatchSize = 10000; // 增大到10000条（8核32G服务器优化，与JPA batch_size保持一致，大幅提升入库速度）
                for (int i = 0; i < validCustomers.size(); i += saveBatchSize) {
                    int end = Math.min(i + saveBatchSize, validCustomers.size());
                    List<Customer> saveBatch = validCustomers.subList(i, end);
                    customerRepository.saveAll(saveBatch);
                    successCount += saveBatch.size();
                }
            } catch (Exception batchError) {
                logger.error("批次保存失败", batchError);
                if (errors.size() < 100) {
                    errors.add("批量保存失败: " + batchError.getMessage());
                }
            }
        }
        
        // 注意：流式导入时，不要频繁清除缓存，只在最后清除
        // invalidateCountCache(); // 注释掉，由调用方决定何时清除缓存
        
        long endTime = System.currentTimeMillis();
        long duration = endTime - startTime;
        
        result.put("successCount", successCount);
        result.put("skipCount", skipCount);
        result.put("errorCount", errors.size());
        result.put("errors", errors);
        result.put("duration", duration); // 添加耗时信息
        
        // 记录导入统计日志
        if (skipCount > 0) {
            logger.info("批量导入完成: 成功={}, 跳过={}（重复数据）, 错误={}, 耗时={}ms", 
                successCount, skipCount, errors.size(), duration);
        } else {
            logger.debug("批量导入完成: 成功={}, 跳过={}, 错误={}, 耗时={}ms", 
                successCount, skipCount, errors.size(), duration);
        }
        
        return result;
    }

    /**
     * 高级搜索：多条件组合查询
     * @param name 姓名（模糊匹配）
     * @param phone 电话（模糊匹配）
     * @param email 邮箱（模糊匹配）
     * @param address 地址（模糊匹配）
     * @param startTime 创建时间起始（可选）
     * @param endTime 创建时间结束（可选）
     * @param uploadTaskId 上传任务ID（可选）
     * @param page 页码
     * @param size 每页大小
     * @return 分页结果
     */
    @Transactional(readOnly = true)
    public Page<Customer> advancedSearch(String name, String phone, String email, String address,
                                        LocalDateTime startTime, LocalDateTime endTime, Long uploadTaskId,
                                        int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.ASC, "id"));
        
        // 处理空字符串，转为null以便查询条件生效
        if (name != null && name.trim().isEmpty()) name = null;
        if (phone != null && phone.trim().isEmpty()) phone = null;
        if (email != null && email.trim().isEmpty()) email = null;
        if (address != null && address.trim().isEmpty()) address = null;
        
        return customerRepository.advancedSearch(name, phone, email, address, 
                                                startTime, endTime, uploadTaskId, pageable);
    }
}
