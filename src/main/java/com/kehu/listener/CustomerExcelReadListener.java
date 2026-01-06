package com.kehu.listener;

import com.alibaba.excel.context.AnalysisContext;
import com.alibaba.excel.read.listener.ReadListener;
import com.kehu.dto.CustomerExcelDTO;
import com.kehu.entity.Customer;
import com.kehu.service.CustomerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

/**
 * EasyExcel读取监听器（用于流式读取Excel文件）
 * 逐行读取，达到批次大小后批量入库
 */
public class CustomerExcelReadListener implements ReadListener<CustomerExcelDTO> {
    
    private static final Logger logger = LoggerFactory.getLogger(CustomerExcelReadListener.class);
    
    private final CustomerService customerService;
    private final Long uploadTaskId;
    private final int batchSize;  // 批次大小
    private final Consumer<ProgressInfo> progressCallback;  // 进度回调
    
    private List<Customer> batch = new ArrayList<>();  // 当前批次
    private int totalCount = 0;  // 总记录数
    private int processedCount = 0;  // 已处理数量（成功入库的数量）
    private int skipCount = 0;  // 跳过的数量（重复数据）
    private int errorCount = 0;  // 错误数量
    
    // 进度信息类
    public static class ProgressInfo {
        public int processedCount;
        public int totalCount;
        
        public ProgressInfo(int processedCount, int totalCount) {
            this.processedCount = processedCount;
            this.totalCount = totalCount;
        }
    }
    
    public CustomerExcelReadListener(CustomerService customerService, Long uploadTaskId, 
                                     int batchSize, Consumer<ProgressInfo> progressCallback) {
        this.customerService = customerService;
        this.uploadTaskId = uploadTaskId;
        this.batchSize = batchSize;
        this.progressCallback = progressCallback;
    }
    
    /**
     * 每读取一行数据时调用
     */
    @Override
    public void invoke(CustomerExcelDTO data, AnalysisContext context) {
        // 跳过空行（姓名为空）
        if (data.getName() == null || data.getName().trim().isEmpty()) {
            return;
        }
        
        // 转换为Customer实体
        Customer customer = new Customer();
        customer.setName(data.getName().trim());
        customer.setPhone(data.getPhone() != null && !data.getPhone().trim().isEmpty() ? data.getPhone().trim() : null);
        customer.setEmail(data.getEmail() != null && !data.getEmail().trim().isEmpty() ? data.getEmail().trim() : null);
        customer.setAddress(data.getAddress() != null && !data.getAddress().trim().isEmpty() ? data.getAddress().trim() : null);
        customer.setUploadTaskId(uploadTaskId);
        
        batch.add(customer);
        totalCount++;
        
        // 达到批次大小，立即批量入库
        if (batch.size() >= batchSize) {
            flushBatch();
        }
    }
    
    /**
     * 所有数据读取完成后调用
     */
    @Override
    public void doAfterAllAnalysed(AnalysisContext context) {
        // 处理剩余的批次
        if (!batch.isEmpty()) {
            flushBatch();
        }
        
        // 最终进度回调（只在完成时调用一次）
        if (progressCallback != null) {
            progressCallback.accept(new ProgressInfo(processedCount, totalCount));
        }
    }
    
    /**
     * 批量入库并清空批次
     */
    private void flushBatch() {
        if (batch.isEmpty()) {
            return;
        }
        
        try {
            // 批量入库（会返回成功、跳过、错误的数量）
            Map<String, Object> result = customerService.batchImportCustomers(batch, uploadTaskId);
            
            // 更新统计数据（使用实际返回的数量，而不是批次大小）
            Integer success = (Integer) result.get("successCount");
            Integer skip = (Integer) result.get("skipCount");
            Integer error = (Integer) result.get("errorCount");
            
            if (success != null) {
                processedCount += success;
            }
            if (skip != null) {
                skipCount += skip;
            }
            if (error != null) {
                errorCount += error;
            }
            
            // 清空批次，释放内存
            batch.clear();
            
            // 注意：不在批量入库时调用进度回调，只在最终完成时更新进度
        } catch (Exception e) {
            logger.error("批量入库失败", e);
            // 记录错误，继续处理下一批
            errorCount += batch.size();
            batch.clear();
        }
    }
    
    /**
     * 获取总记录数
     */
    public int getTotalCount() {
        return totalCount;
    }
    
    /**
     * 获取已处理数量（成功入库的数量）
     */
    public int getProcessedCount() {
        return processedCount;
    }
    
    /**
     * 获取跳过的数量（重复数据）
     */
    public int getSkipCount() {
        return skipCount;
    }
    
    /**
     * 获取错误数量
     */
    public int getErrorCount() {
        return errorCount;
    }
}

