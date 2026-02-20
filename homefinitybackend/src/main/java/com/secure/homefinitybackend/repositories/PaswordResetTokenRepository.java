package com.secure.homefinitybackend.repositories;

import com.secure.homefinitybackend.models.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaswordResetTokenRepository extends JpaRepository<PasswordResetToken,Long> {

}
