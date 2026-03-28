package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.SavedSearchRequest;
import com.secure.apnastaybackend.dto.response.PagedResponse;
import com.secure.apnastaybackend.dto.response.SavedPropertyDTO;
import com.secure.apnastaybackend.dto.response.SavedSearchDTO;
import com.secure.apnastaybackend.entity.Property;
import com.secure.apnastaybackend.entity.PropertyStatus;
import com.secure.apnastaybackend.entity.SavedProperty;
import com.secure.apnastaybackend.entity.SavedSearch;
import com.secure.apnastaybackend.entity.User;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.PropertyRepository;
import com.secure.apnastaybackend.repositories.SavedPropertyRepository;
import com.secure.apnastaybackend.repositories.SavedSearchRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.EngagementService;
import com.secure.apnastaybackend.services.PropertyService;
import com.secure.apnastaybackend.utils.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class EngagementServiceImpl implements EngagementService {
    private final SavedPropertyRepository savedPropertyRepository;
    private final SavedSearchRepository savedSearchRepository;
    private final UserRepository userRepository;
    private final PropertyRepository propertyRepository;
    private final PropertyService propertyService;
    private final EmailService emailService;

    @Override
    @Transactional
    public SavedPropertyDTO saveProperty(String userName, Long propertyId) {
        User user = getUser(userName);
        Property property = propertyRepository.findById(propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("Property", "id", propertyId));
        if (property.getStatus() != PropertyStatus.AVAILABLE) {
            throw new BadRequestException("Only available properties can be saved");
        }
        if (savedPropertyRepository.existsByUser_UserIdAndProperty_Id(user.getUserId(), propertyId)) {
            throw new BadRequestException("Property already saved");
        }
        SavedProperty saved = new SavedProperty();
        saved.setUser(user);
        saved.setProperty(property);
        return toSavedPropertyDTO(savedPropertyRepository.save(saved));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedPropertyDTO> listSavedProperties(String userName) {
        User user = getUser(userName);
        return savedPropertyRepository.findByUser_UserIdOrderByCreatedAtDesc(user.getUserId()).stream()
                .map(this::toSavedPropertyDTO)
                .toList();
    }

    @Override
    @Transactional
    public void removeSavedProperty(String userName, Long propertyId) {
        User user = getUser(userName);
        SavedProperty saved = savedPropertyRepository.findByUser_UserIdAndProperty_Id(user.getUserId(), propertyId)
                .orElseThrow(() -> new ResourceNotFoundException("SavedProperty", "propertyId", propertyId));
        savedPropertyRepository.delete(saved);
    }

    @Override
    @Transactional
    public SavedSearchDTO createSavedSearch(String userName, SavedSearchRequest request) {
        User user = getUser(userName);
        SavedSearch search = new SavedSearch();
        search.setUser(user);
        applyRequest(search, request);
        return toSavedSearchDTO(savedSearchRepository.save(search));
    }

    @Override
    @Transactional(readOnly = true)
    public List<SavedSearchDTO> listSavedSearches(String userName) {
        User user = getUser(userName);
        return savedSearchRepository.findByUser_UserIdOrderByCreatedAtDesc(user.getUserId()).stream()
                .map(this::toSavedSearchDTO)
                .toList();
    }

    @Override
    @Transactional
    public SavedSearchDTO updateSavedSearch(String userName, Long searchId, SavedSearchRequest request) {
        User user = getUser(userName);
        SavedSearch savedSearch = savedSearchRepository.findById(searchId)
                .orElseThrow(() -> new ResourceNotFoundException("SavedSearch", "id", searchId));
        if (!savedSearch.getUser().getUserId().equals(user.getUserId())) {
            throw new BadRequestException("You do not have access to this saved search");
        }
        applyRequest(savedSearch, request);
        return toSavedSearchDTO(savedSearchRepository.save(savedSearch));
    }

    @Override
    @Transactional
    public void deleteSavedSearch(String userName, Long searchId) {
        User user = getUser(userName);
        SavedSearch savedSearch = savedSearchRepository.findById(searchId)
                .orElseThrow(() -> new ResourceNotFoundException("SavedSearch", "id", searchId));
        if (!savedSearch.getUser().getUserId().equals(user.getUserId())) {
            throw new BadRequestException("You do not have access to this saved search");
        }
        savedSearchRepository.delete(savedSearch);
    }

    @Override
    @Transactional
    public int runAlertsForSearch(String userName, Long searchId) {
        User user = getUser(userName);
        SavedSearch savedSearch = savedSearchRepository.findById(searchId)
                .orElseThrow(() -> new ResourceNotFoundException("SavedSearch", "id", searchId));
        if (!savedSearch.getUser().getUserId().equals(user.getUserId())) {
            throw new BadRequestException("You do not have access to this saved search");
        }
        return runAlertForSavedSearch(savedSearch);
    }

    @Override
    @Transactional
    public int runAlertsForAllEnabledSavedSearches() {
        int total = 0;
        for (SavedSearch search : savedSearchRepository.findByAlertsEnabledTrue()) {
            total += runAlertForSavedSearch(search);
        }
        return total;
    }

    private int runAlertForSavedSearch(SavedSearch search) {
        PagedResponse<com.secure.apnastaybackend.dto.response.PropertyPublicDTO> matches = propertyService.searchPublicProperties(
                search.getCity(), search.getPinCode(), search.getMinBedrooms(), search.getMinBathrooms(),
                search.getMinPrice(), search.getMaxPrice(), List.of(), search.getFurnishing(),
                null, null, null, null, "newest", "desc", 0, 20
        );
        LocalDateTime lastCheck = search.getLastAlertCheckedAt() != null ? search.getLastAlertCheckedAt() : LocalDateTime.MIN;
        int fresh = (int) matches.getItems().stream()
                .filter(p -> propertyRepository.findById(p.getId()).map(Property::getCreatedAt).orElse(LocalDateTime.MIN).isAfter(lastCheck))
                .count();
        if (fresh > 0 && search.getUser().getEmail() != null && !search.getUser().getEmail().isBlank()) {
            emailService.sendGenericEmail(
                    search.getUser().getEmail(),
                    "ApnaStay alert: " + fresh + " new listing(s)",
                    "Your saved search \"" + search.getName() + "\" has " + fresh + " new matching properties."
            );
        }
        search.setLastAlertCheckedAt(LocalDateTime.now());
        savedSearchRepository.save(search);
        return fresh;
    }

    private User getUser(String userName) {
        return userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
    }

    private void applyRequest(SavedSearch target, SavedSearchRequest request) {
        target.setName(request.getName().trim());
        target.setCity(request.getCity());
        target.setPinCode(request.getPinCode());
        target.setMinBedrooms(request.getMinBedrooms());
        target.setMinBathrooms(request.getMinBathrooms());
        target.setMinPrice(request.getMinPrice());
        target.setMaxPrice(request.getMaxPrice());
        target.setFurnishing(request.getFurnishing());
        target.setAlertsEnabled(request.isAlertsEnabled());
    }

    private SavedPropertyDTO toSavedPropertyDTO(SavedProperty sp) {
        return new SavedPropertyDTO(
                sp.getId(),
                sp.getProperty().getId(),
                sp.getProperty().getTitle(),
                sp.getProperty().getPrice(),
                sp.getProperty().getCity(),
                sp.getProperty().getState(),
                sp.getCreatedAt()
        );
    }

    private SavedSearchDTO toSavedSearchDTO(SavedSearch s) {
        return new SavedSearchDTO(
                s.getId(),
                s.getName(),
                s.getCity(),
                s.getPinCode(),
                s.getMinBedrooms(),
                s.getMinBathrooms(),
                s.getMinPrice(),
                s.getMaxPrice(),
                s.getFurnishing(),
                s.isAlertsEnabled(),
                s.getLastAlertCheckedAt(),
                s.getCreatedAt()
        );
    }
}
