package com.secure.homefinitybackend.repositories;

import com.secure.homefinitybackend.models.Property;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PropertyRepository extends JpaRepository<Property, Long> {
    
    List<Property> findByOwnerUserName(String ownerUserName);
}
