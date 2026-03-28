package com.secure.apnastaybackend.services.impl;


import com.secure.apnastaybackend.dto.response.PropertyDTO;
import com.secure.apnastaybackend.entity.AuditLog;
import com.secure.apnastaybackend.repositories.AuditLogRepository;
import com.secure.apnastaybackend.services.AuditLogService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class AuditLogServiceImpl implements AuditLogService {

    @Autowired
    AuditLogRepository auditLogRepository;
    @Override
    public void logPropertyCreation(String username, PropertyDTO Property){
        AuditLog log = new AuditLog();
        log.setAction("CREATE");
        log.setUsername(username);
        log.setPropertyId(Property.getId());
        log.setPropertyContent(Property.getTitle());
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    @Override
    public void logPropertyUpdate(String username, PropertyDTO Property){
        AuditLog log = new AuditLog();
        log.setAction("UPDATE");
        log.setUsername(username);
        log.setPropertyId(Property.getId());
        log.setPropertyContent(Property.getTitle());
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    @Override
    public void logPropertyDeletion(String username, Long PropertyId){
        AuditLog log = new AuditLog();
        log.setAction("DELETE");
        log.setUsername(username);
        log.setPropertyId(PropertyId);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }

    @Override
    public List<AuditLog> getAllAuditLogs() {
        return auditLogRepository.findAll();
    }

    @Override
    public List<AuditLog> getAuditLogsForPropertyId(Long id) {
        return auditLogRepository.findByPropertyId(id);
    }

    @Override
    public void logAction(String action, String username, Long propertyId, String content) {
        AuditLog log = new AuditLog();
        log.setAction(action);
        log.setUsername(username);
        log.setPropertyId(propertyId);
        log.setPropertyContent(content);
        log.setTimestamp(LocalDateTime.now());
        auditLogRepository.save(log);
    }
}

