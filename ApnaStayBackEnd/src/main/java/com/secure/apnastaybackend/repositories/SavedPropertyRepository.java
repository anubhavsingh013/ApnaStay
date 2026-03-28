package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.SavedProperty;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface SavedPropertyRepository extends JpaRepository<SavedProperty, Long> {
    List<SavedProperty> findByUser_UserIdOrderByCreatedAtDesc(Long userId);
    Optional<SavedProperty> findByUser_UserIdAndProperty_Id(Long userId, Long propertyId);
    boolean existsByUser_UserIdAndProperty_Id(Long userId, Long propertyId);
}
