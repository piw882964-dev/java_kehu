package com.kehu.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class PageController {

    @GetMapping("/")
    public String index() {
        return "redirect:/pages/index.html";
    }

    @GetMapping("/pages/index")
    public String indexPage() {
        return "forward:/pages/index.html";
    }

    @GetMapping("/pages/login")
    public String loginPage() {
        return "forward:/pages/login.html";
    }

    @GetMapping("/pages/list")
    public String listPage() {
        return "forward:/pages/list.html";
    }

    @GetMapping("/pages/add")
    public String addPage() {
        return "forward:/pages/add.html";
    }

    @GetMapping("/pages/edit")
    public String editPage() {
        return "forward:/pages/edit.html";
    }

    @GetMapping("/pages/delete")
    public String deletePage() {
        return "forward:/pages/delete.html";
    }

    @GetMapping("/pages/import")
    public String importPage() {
        return "forward:/pages/import.html";
    }

    @GetMapping("/pages/upload-tasks")
    public String uploadTasksPage() {
        return "forward:/pages/upload-tasks.html";
    }

    @GetMapping("/pages/batch-query")
    public String batchQueryPage() {
        return "forward:/pages/batch-query.html";
    }
}

