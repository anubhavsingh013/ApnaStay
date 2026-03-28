package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.SavedSearch;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SavedSearchRepository extends JpaRepository<SavedSearch, Long> {
    List<SavedSearch> findByUser_UserIdOrderByCreatedAtDesc(Long userId);
    List<SavedSearch> findByAlertsEnabledTrue();
}
