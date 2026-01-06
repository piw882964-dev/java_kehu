package com.kehu.service;

import com.kehu.entity.Customer;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.Page;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * CustomerService单元测试
 */
@SpringBootTest
@ActiveProfiles("test")
public class CustomerServiceTest {

    @Autowired
    private CustomerService customerService;

    @Test
    public void testGetTotalCount() {
        long count = customerService.getTotalCount();
        assertTrue(count >= 0, "客户总数应该大于等于0");
    }

    @Test
    public void testGetAllCustomersPaged() {
        Page<Customer> page = customerService.getAllCustomers(0, 10);
        assertNotNull(page, "分页结果不应为空");
        assertTrue(page.getSize() <= 10, "每页大小不应超过10");
    }

    @Test
    public void testSaveCustomer() {
        Customer customer = new Customer();
        customer.setName("测试客户");
        customer.setPhone("13900000000");
        customer.setEmail("test@example.com");
        customer.setAddress("测试地址");
        
        Customer saved = customerService.saveCustomer(customer);
        assertNotNull(saved.getId(), "保存后应该有ID");
        assertEquals("测试客户", saved.getName(), "姓名应该一致");
        
        // 清理测试数据
        if (saved.getId() != null) {
            customerService.deleteCustomer(saved.getId());
        }
    }

    @Test
    public void testGetCustomerById() {
        // 先创建一个测试客户
        Customer customer = new Customer();
        customer.setName("查询测试客户");
        customer.setPhone("13900000001");
        Customer saved = customerService.saveCustomer(customer);
        
        // 查询
        Optional<Customer> found = customerService.getCustomerById(saved.getId());
        assertTrue(found.isPresent(), "应该能找到客户");
        assertEquals(saved.getId(), found.get().getId(), "ID应该一致");
        
        // 清理测试数据
        customerService.deleteCustomer(saved.getId());
    }

    @Test
    public void testDeleteCustomer() {
        // 先创建一个测试客户
        Customer customer = new Customer();
        customer.setName("删除测试客户");
        customer.setPhone("13900000002");
        Customer saved = customerService.saveCustomer(customer);
        Long id = saved.getId();
        
        // 删除
        customerService.deleteCustomer(id);
        
        // 验证已删除
        Optional<Customer> deleted = customerService.getCustomerById(id);
        assertFalse(deleted.isPresent(), "客户应该已被删除");
    }
}

