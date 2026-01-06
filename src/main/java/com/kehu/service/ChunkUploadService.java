package com.kehu.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.*;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardOpenOption;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ChunkUploadService {
    
    private static final Logger logger = LoggerFactory.getLogger(ChunkUploadService.class);
    
    // 临时文件目录
    private static final String TEMP_DIR = System.getProperty("java.io.tmpdir") + "/chunk_uploads/";
    
    // 存储上传信息：uploadId -> UploadInfo
    private final Map<String, UploadInfo> uploadInfos = new ConcurrentHashMap<>();
    
    static {
        // 创建临时目录
        try {
            Path tempPath = Paths.get(TEMP_DIR);
            if (!Files.exists(tempPath)) {
                Files.createDirectories(tempPath);
            }
        } catch (IOException e) {
            System.err.println("无法创建临时目录: " + TEMP_DIR);
        }
    }
    
    /**
     * 保存文件块
     */
    public void saveChunk(String uploadId, int chunkIndex, MultipartFile chunk, String fileName, long totalSize, int totalChunks) throws IOException {
        // 获取或创建上传信息
        UploadInfo info = uploadInfos.computeIfAbsent(uploadId, k -> new UploadInfo(fileName, totalSize, totalChunks));
        
        // 保存chunk到临时文件
        Path chunkPath = Paths.get(TEMP_DIR, uploadId + "_" + chunkIndex);
        Files.write(chunkPath, chunk.getBytes(), StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        
        info.receivedChunks.incrementAndGet();
        
        logger.info("接收文件块: uploadId={}, chunkIndex={}/{}, fileName={}", uploadId, chunkIndex + 1, totalChunks, fileName);
    }
    
    /**
     * 检查所有块是否都已接收
     */
    public boolean isAllChunksReceived(String uploadId) {
        UploadInfo info = uploadInfos.get(uploadId);
        if (info == null) {
            return false;
        }
        return info.receivedChunks.get() == info.totalChunks;
    }
    
    /**
     * 合并所有块为完整文件
     */
    public File mergeChunks(String uploadId) throws IOException {
        UploadInfo info = uploadInfos.get(uploadId);
        if (info == null) {
            throw new IOException("上传信息不存在: " + uploadId);
        }
        
        if (!isAllChunksReceived(uploadId)) {
            throw new IOException("还有块未接收完成: " + uploadId);
        }
        
        // 创建合并后的文件
        Path mergedPath = Paths.get(TEMP_DIR, uploadId + "_merged_" + info.fileName);
        try (OutputStream out = Files.newOutputStream(mergedPath, StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING)) {
            // 按顺序读取所有块并写入
            for (int i = 0; i < info.totalChunks; i++) {
                Path chunkPath = Paths.get(TEMP_DIR, uploadId + "_" + i);
                if (!Files.exists(chunkPath)) {
                    throw new IOException("块文件不存在: " + chunkPath);
                }
                
                Files.copy(chunkPath, out);
                
                // 删除块文件（可选，可以保留用于调试）
                try {
                    Files.delete(chunkPath);
                } catch (IOException e) {
                    logger.warn("无法删除块文件: " + chunkPath, e);
                }
            }
        }
        
        logger.info("合并文件完成: uploadId={}, fileName={}, size={}", uploadId, info.fileName, mergedPath.toFile().length());
        
        return mergedPath.toFile();
    }
    
    /**
     * 清理上传信息（合并后或失败后调用）
     */
    public void cleanup(String uploadId) {
        UploadInfo info = uploadInfos.remove(uploadId);
        if (info != null) {
            // 删除所有块文件和合并文件
            try {
                for (int i = 0; i < info.totalChunks; i++) {
                    Path chunkPath = Paths.get(TEMP_DIR, uploadId + "_" + i);
                    Files.deleteIfExists(chunkPath);
                }
                
                Path mergedPath = Paths.get(TEMP_DIR, uploadId + "_merged_" + info.fileName);
                Files.deleteIfExists(mergedPath);
            } catch (IOException e) {
                logger.warn("清理临时文件失败: " + uploadId, e);
            }
        }
    }
    
    /**
     * 获取上传信息
     */
    public UploadInfo getUploadInfo(String uploadId) {
        return uploadInfos.get(uploadId);
    }
    
    /**
     * 上传信息类
     */
    public static class UploadInfo {
        public final String fileName;
        public final long totalSize;
        public final int totalChunks;
        public final java.util.concurrent.atomic.AtomicInteger receivedChunks = new java.util.concurrent.atomic.AtomicInteger(0);
        
        public UploadInfo(String fileName, long totalSize, int totalChunks) {
            this.fileName = fileName;
            this.totalSize = totalSize;
            this.totalChunks = totalChunks;
        }
    }
}

