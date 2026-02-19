package com.secure.homefinitybackend.services.impl;


import com.secure.homefinitybackend.dtos.PropertyDTO;
import com.secure.homefinitybackend.models.AuditLog;
import com.secure.homefinitybackend.models.Property;
import com.secure.homefinitybackend.repositories.AuditLogRepository;
import com.secure.homefinitybackend.services.AuditLogService;
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
}
