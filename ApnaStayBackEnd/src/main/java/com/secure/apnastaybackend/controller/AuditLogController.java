package com.secure.apnastaybackend.controller;

import com.secure.apnastaybackend.entity.AuditLog;
import com.secure.apnastaybackend.services.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping ("/api/audit")
public class AuditLogController {

    @Autowired
    AuditLogService auditLogService;

    @GetMapping
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getAuditLogs() {
        return auditLogService.getAllAuditLogs();
    }

    @GetMapping("/property/{id}")
    @PreAuthorize("hasRole('ROLE_ADMIN')")
    public List<AuditLog> getPropertyAuditLogs(@PathVariable Long id) {
        return auditLogService.getAuditLogsForPropertyId(id);
    }
}

