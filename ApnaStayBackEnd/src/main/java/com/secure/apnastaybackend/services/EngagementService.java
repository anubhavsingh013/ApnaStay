package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.SavedSearchRequest;
import com.secure.apnastaybackend.dto.response.SavedPropertyDTO;
import com.secure.apnastaybackend.dto.response.SavedSearchDTO;

import java.util.List;

public interface EngagementService {
    SavedPropertyDTO saveProperty(String userName, Long propertyId);
    List<SavedPropertyDTO> listSavedProperties(String userName);
    void removeSavedProperty(String userName, Long propertyId);

    SavedSearchDTO createSavedSearch(String userName, SavedSearchRequest request);
    List<SavedSearchDTO> listSavedSearches(String userName);
    SavedSearchDTO updateSavedSearch(String userName, Long searchId, SavedSearchRequest request);
    void deleteSavedSearch(String userName, Long searchId);

    int runAlertsForSearch(String userName, Long searchId);
    int runAlertsForAllEnabledSavedSearches();
}
