package com.secure.homefinitybackend.services;

import com.secure.homefinitybackend.dtos.PropertyDTO;
import com.secure.homefinitybackend.dtos.PropertyRequest;

import java.util.List;

public interface PropertyService {
    PropertyDTO createPropertyForUser(String userName, PropertyRequest request);

    PropertyDTO updatePropertyForUser(Long propertyId, PropertyRequest request, String userName);

    List<PropertyDTO> getPropertyByOwnerUserName(String ownerUserName);
    
    PropertyDTO getPropertyById(Long propertyId, String userName);
    
    void deletePropertyForUser(Long propertyId, String userName);
}
