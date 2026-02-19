package com.secure.homefinitybackend.services;

import com.secure.homefinitybackend.dtos.PropertyDTO;
import com.secure.homefinitybackend.models.AuditLog;

import java.util.List;

public interface AuditLogService {
    void logPropertyCreation(String username, PropertyDTO property);

    void logPropertyUpdate(String username, PropertyDTO property);

    void logPropertyDeletion(String username, Long Propertyid);

    List<AuditLog> getAllAuditLogs();

    List<AuditLog> getAuditLogsForPropertyId(Long id);

}
