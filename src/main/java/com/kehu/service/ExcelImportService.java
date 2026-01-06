package com.kehu.service;

import com.alibaba.excel.EasyExcel;
import com.kehu.dto.CustomerExcelDTO;
import com.kehu.entity.Customer;
import com.kehu.listener.CustomerExcelReadListener;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ExcelImportService {

    private static final Logger logger = LoggerFactory.getLogger(ExcelImportService.class);
    
    @Autowired
    private CustomerService customerService;
    
    @Autowired
    private UploadTaskService uploadTaskService;
    
    // 批次大小：增大到10000条（8核32G服务器可以处理更大批次，大幅提升入库性能）
    private static final int BATCH_SIZE = 10000;
    
    /**
     * 更新任务进度的辅助方法
     * @param uploadTaskId 任务ID
     * @param processedCount 已处理数量
     * @param totalCount 总数量
     */
    private void updateTaskProgress(Long uploadTaskId, int processedCount, int totalCount) {
        try {
            Optional<com.kehu.entity.UploadTask> taskOpt = uploadTaskService.getTaskById(uploadTaskId);
            if (taskOpt.isPresent()) {
                com.kehu.entity.UploadTask task = taskOpt.get();
                task.setAddedCount(processedCount);
                task.setTotalCount(totalCount);
                uploadTaskService.saveTask(task);
            }
        } catch (Exception e) {
            // 更新进度失败时静默处理，避免日志过多
        }
    }

    /**
     * 流式解析并导入Excel文件（使用EasyExcel，支持超大文件）
     * EasyExcel基于SAX解析，内存占用极小，支持几GB的Excel文件
     * @param file 上传的文件
     * @param uploadTaskId 上传任务ID
     * @return 导入结果
     * @throws Exception 解析异常
     */
    public Map<String, Object> parseAndImportExcelFileStream(MultipartFile file, Long uploadTaskId) throws Exception {
        String fileName = file.getOriginalFilename();
        
        if (fileName == null || fileName.isEmpty()) {
            throw new Exception("文件名不能为空");
        }
        
        // 验证文件格式
        if (!fileName.toLowerCase().endsWith(".xlsx") && !fileName.toLowerCase().endsWith(".xls")) {
            throw new Exception("不支持的文件格式，请使用 .xls 或 .xlsx 文件");
        }
        
        logger.info("开始使用EasyExcel流式导入Excel文件: {}", fileName);
        
        // 创建监听器（不使用进度回调，只在最终完成时更新进度）
        CustomerExcelReadListener listener = new CustomerExcelReadListener(
            customerService,
            uploadTaskId,
            BATCH_SIZE,
            null  // 不设置进度回调，只在最终完成时更新进度
        );
        
        try (InputStream inputStream = file.getInputStream()) {
            // 使用EasyExcel读取Excel文件
            // headRowNumber(1) 表示跳过第一行（表头）
            EasyExcel.read(inputStream, CustomerExcelDTO.class, listener)
                .sheet(0)  // 读取第一个工作表
                .headRowNumber(1)  // 跳过表头
                .doRead();
            
            // 读取完成后，获取最终统计
            int finalProcessed = listener.getProcessedCount();
            int finalTotal = listener.getTotalCount();
            int finalSkipCount = listener.getSkipCount();
            int finalErrorCount = listener.getErrorCount();
            
            // 最终进度更新（只在完成时更新一次）
            if (finalProcessed > 0) {
                logger.info("EasyExcel流式导入完成，总处理: {} 条 - 最终进度更新", finalProcessed);
                updateTaskProgress(uploadTaskId, finalProcessed, finalTotal);
            }
            
            // 返回结果
            Map<String, Object> result = new HashMap<>();
            result.put("totalCount", finalTotal);
            result.put("successCount", finalProcessed);
            result.put("skipCount", finalSkipCount);  // 返回实际跳过的数量（重复数据）
            result.put("errorCount", finalErrorCount);  // 返回实际错误数量
            result.put("errors", new ArrayList<>());
            
            logger.info("EasyExcel导入完成: 总记录数={}, 成功={}, 跳过={}（重复数据）, 错误={}", 
                finalTotal, finalProcessed, finalSkipCount, finalErrorCount);
            
            return result;
        }
    }

    /**
     * 流式解析并导入CSV文件（保持原有逻辑）
     * @param file 上传的文件
     * @param uploadTaskId 上传任务ID
     * @return 导入结果
     * @throws Exception 解析异常
     */
    public Map<String, Object> parseAndImportCsvFileStream(MultipartFile file, Long uploadTaskId) throws Exception {
        logger.info("开始流式导入CSV文件");
        
        int totalCount = 0;
        int processedCount = 0;
        int skipCount = 0;
        int errorCount = 0;
        int batchSize = 10000;  // 增大批次大小到10000条（8核32G服务器优化）
        List<Customer> batch = new ArrayList<>();
        
        // 使用BufferedReader逐行读取，避免一次性加载到内存
        try (java.io.BufferedReader reader = new java.io.BufferedReader(
                new java.io.InputStreamReader(file.getInputStream(), "UTF-8"))) {
            
            String line;
            boolean isFirstLine = true;
            
            while ((line = reader.readLine()) != null) {
                // 跳过表头
                if (isFirstLine) {
                    isFirstLine = false;
                    continue;
                }
                
                line = line.trim();
                if (line.isEmpty()) {
                    continue;
                }
                
                // 解析CSV行
                String[] values = parseCsvLine(line);
                
                if (values.length >= 1) {
                    Customer customer = new Customer();
                    customer.setName(values.length > 0 ? values[0].trim() : "");
                    customer.setPhone(values.length > 1 ? values[1].trim() : null);
                    customer.setEmail(values.length > 2 ? values[2].trim() : null);
                    customer.setAddress(values.length > 3 ? values[3].trim() : null);
                    customer.setUploadTaskId(uploadTaskId);
                    
                    if (!customer.getName().isEmpty()) {
                        batch.add(customer);
                        totalCount++;
                        
                        // 达到批次大小，立即保存
                        if (batch.size() >= batchSize) {
                            Map<String, Object> batchResult = customerService.batchImportCustomers(batch, uploadTaskId);
                            // 累加实际的统计结果
                            processedCount += (Integer) batchResult.getOrDefault("successCount", 0);
                            skipCount += (Integer) batchResult.getOrDefault("skipCount", 0);
                            errorCount += (Integer) batchResult.getOrDefault("errorCount", 0);
                            batch.clear();
                        }
                    }
                }
            }
            
            // 处理剩余的批次
            if (!batch.isEmpty()) {
                Map<String, Object> batchResult = customerService.batchImportCustomers(batch, uploadTaskId);
                // 累加实际的统计结果
                processedCount += (Integer) batchResult.getOrDefault("successCount", 0);
                skipCount += (Integer) batchResult.getOrDefault("skipCount", 0);
                errorCount += (Integer) batchResult.getOrDefault("errorCount", 0);
                batch.clear();
            }
        }
        
        // 最后更新一次进度（只在完成时更新一次）
        if (processedCount > 0) {
            logger.info("CSV流式导入完成，总处理: {} 条 - 最终进度更新", processedCount);
            updateTaskProgress(uploadTaskId, processedCount, totalCount);
        }
        
        // 返回结果
        Map<String, Object> result = new HashMap<>();
        result.put("totalCount", totalCount);
        result.put("successCount", processedCount);
        result.put("skipCount", skipCount);  // 返回实际跳过的数量（重复数据）
        result.put("errorCount", errorCount);  // 返回实际错误数量
        result.put("errors", new ArrayList<>());
        
        logger.info("CSV导入完成: 总记录数={}, 成功={}, 跳过={}（重复数据）, 错误={}", 
            totalCount, processedCount, skipCount, errorCount);
        
        return result;
    }
    
    /**
     * 解析CSV行（简单实现）
     */
    private String[] parseCsvLine(String line) {
        List<String> values = new ArrayList<>();
        boolean inQuotes = false;
        StringBuilder currentValue = new StringBuilder();
        
        for (char c : line.toCharArray()) {
            if (c == '"') {
                inQuotes = !inQuotes;
            } else if (c == ',' && !inQuotes) {
                values.add(currentValue.toString());
                currentValue = new StringBuilder();
            } else {
                currentValue.append(c);
            }
        }
        values.add(currentValue.toString());
        
        return values.toArray(new String[0]);
    }
}
