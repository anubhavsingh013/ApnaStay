package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.PropertyImageFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PropertyImageFileRepository extends JpaRepository<PropertyImageFile, Long> {

    List<PropertyImageFile> findByProperty_IdOrderBySortOrderAsc(Long propertyId);

    @Query("SELECT f FROM PropertyImageFile f JOIN FETCH f.property WHERE f.id = :id")
    Optional<PropertyImageFile> findByIdWithProperty(@Param("id") Long id);
}
