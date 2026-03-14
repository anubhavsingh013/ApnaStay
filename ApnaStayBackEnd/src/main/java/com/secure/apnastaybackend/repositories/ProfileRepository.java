package com.secure.apnastaybackend.repositories;

import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.Profile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ProfileRepository extends JpaRepository<Profile, Long> {

    Optional<Profile> findByUserUserIdAndProfileRole(Long userId, AppRole profileRole);

    Optional<Profile> findByUserUserNameAndProfileRole(String userName, AppRole profileRole);

    Optional<Profile> findByIdAndProfileRole(Long id, AppRole profileRole);

    List<Profile> findAllByProfileRole(AppRole profileRole);

    List<Profile> findByProfileRoleIn(List<AppRole> profileRoles);

}

