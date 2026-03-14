package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.Property;
import com.secure.apnastaybackend.entity.PropertyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {

    List<Property> findByOwnerUserName(String ownerUserName);

    List<Property> findByStatus(PropertyStatus status);

    List<Property> findByStatusAndIsFeatured(PropertyStatus status, Boolean isFeatured);
}

