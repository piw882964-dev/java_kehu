package com.kehu.service;

import com.kehu.entity.CustomerRemark;
import com.kehu.repository.CustomerRemarkRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class CustomerRemarkService {

    @Autowired
    private CustomerRemarkRepository customerRemarkRepository;

    /**
     * 获取客户的备注
     * @param customerId 客户ID
     * @return 备注信息，如果不存在返回null
     */
    public CustomerRemark getRemarkByCustomerId(Long customerId) {
        Optional<CustomerRemark> remarkOpt = customerRemarkRepository.findByCustomerId(customerId);
        return remarkOpt.orElse(null);
    }

    /**
     * 保存或更新客户备注
     * @param customerId 客户ID
     * @param remarks 备注内容
     * @return 保存后的备注对象
     */
    public CustomerRemark saveOrUpdateRemark(Long customerId, String remarks) {
        Optional<CustomerRemark> existingRemarkOpt = customerRemarkRepository.findByCustomerId(customerId);
        
        CustomerRemark remark;
        if (existingRemarkOpt.isPresent()) {
            // 更新现有备注
            remark = existingRemarkOpt.get();
            remark.setRemarks(remarks);
        } else {
            // 创建新备注
            remark = new CustomerRemark();
            remark.setCustomerId(customerId);
            remark.setRemarks(remarks);
        }
        
        return customerRemarkRepository.save(remark);
    }

    /**
     * 删除客户备注
     * @param customerId 客户ID
     */
    public void deleteRemark(Long customerId) {
        Optional<CustomerRemark> remarkOpt = customerRemarkRepository.findByCustomerId(customerId);
        if (remarkOpt.isPresent()) {
            customerRemarkRepository.delete(remarkOpt.get());
        }
    }
}

