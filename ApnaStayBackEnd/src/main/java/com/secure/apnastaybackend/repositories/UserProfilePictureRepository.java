package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.UserProfilePicture;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface UserProfilePictureRepository extends JpaRepository<UserProfilePicture, Long> {

    Optional<UserProfilePicture> findByUser_UserId(Long userId);

    boolean existsByUser_UserId(Long userId);

    void deleteByUser_UserId(Long userId);
}
