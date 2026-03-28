package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.PropertyReview;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PropertyReviewRepository extends JpaRepository<PropertyReview, Long> {
    List<PropertyReview> findByProperty_IdAndVisibleTrueOrderByCreatedAtDesc(Long propertyId);
}
