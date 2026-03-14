package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.ProfileRequest;
import com.secure.apnastaybackend.dto.response.ApprovalStatusResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.dto.response.ProfileListItemDTO;
import com.secure.apnastaybackend.entity.*;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.ProfileRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.ProfileService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class ProfileServiceImpl implements ProfileService {

    private static final List<AppRole> PROFILE_ROLES = Arrays.asList(
            AppRole.ROLE_OWNER, AppRole.ROLE_BROKER, AppRole.ROLE_USER);

    @Autowired
    private ProfileRepository profileRepository;
    @Autowired
    private UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public AppRole getCurrentUserAppRole(String userName) {
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        if (user.getRole() == null || user.getRole().getRoleName() == null) {
            throw new BadRequestException("User has no role assigned");
        }
        return user.getRole().getRoleName();
    }

    @Override
    @Transactional
    public ProfileDTO submitForReview(String userName, ProfileRequest request) {
        validateMandatoryProfileFields(request, "submit for review");
        AppRole profileRole = request.getRole();
        if (profileRole == AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Invalid profile role for submission");
        }
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        Profile profile = profileRepository.findByUserUserIdAndProfileRole(user.getUserId(), profileRole)
                .orElseGet(() -> {
                    Profile p = new Profile();
                    p.setUser(user);
                    p.setProfileRole(profileRole);
                    return p;
                });
        if ( profile.getStatus()==ProfileStatus.IN_PROGRESS) {
            throw new BadRequestException("Profile already submitted for review. Wait for approval.");
        }
        else if (profile.getStatus() == ProfileStatus.APPROVED){
            throw new BadRequestException("Profile is already approved");
        }
        copyFromUser(user, profile);
        applyRequestToProfile(request, profile);
        profile.setStatus(ProfileStatus.IN_PROGRESS);
        profile.setSubmittedAt(LocalDateTime.now());
        Profile saved = profileRepository.save(profile);
        log.info("Profile submitted for review: user={} role={}", userName, profileRole);
        return toDTO(saved);
    }

    @Override
    @Transactional
    public ProfileDTO updateProfileDetails(String userName, AppRole profileRole, ProfileRequest request) {
        validateMandatoryProfileFields(request, "update");
        if (profileRole == null) {
            throw new BadRequestException("Invalid profile role");
        }
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        Profile profile = profileRepository.findByUserUserIdAndProfileRole(user.getUserId(), profileRole)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profile", "userId/role", "Submit for review first: " + userName + "/" + profileRole));
        applyRequestToProfile(request, profile);
        profile.setStatus(ProfileStatus.PENDING);
        Profile saved = profileRepository.save(profile);
        log.info("Profile details updated: user={} role={}", userName, profileRole);
        return toDTO(saved);
    }

    private void validateMandatoryProfileFields(ProfileRequest request, String action) {
        if (request == null) {
            throw new BadRequestException("Request body is required for " + action);
        }
        if (request.getRole() == null) {
            throw new BadRequestException("Missing mandatory parameter: role");
        }
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: fullName");
        }
        if (request.getDateOfBirth() == null) {
            throw new BadRequestException("Missing mandatory parameter: dateOfBirth");
        }
        if (request.getAadharNumber() == null || request.getAadharNumber().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: aadharNumber");
        }
        if (request.getMobile() == null || request.getMobile().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: mobile");
        }
    }

    private void copyFromUser(User user, Profile profile) {
        if (profile.getFullName() == null) {
            profile.setFullName(user.getUserName());
        }
        if (user.getEmail() != null) {
            profile.setEmail(user.getEmail());
        }
        if (user.getPhoneNumber() != null) {
            profile.setMobile(user.getPhoneNumber());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileDTO getProfile(String userName, AppRole profileRole) {
        if (profileRole == null || profileRole == AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Invalid profile role");
        }
        Profile profile = profileRepository.findByUserUserNameAndProfileRole(userName, profileRole)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profile", "username/role", userName + "/" + profileRole));
        return toDTO(profile);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProfileListItemDTO> listProfiles(AppRole roleFilter) {
        List<Profile> profiles = (roleFilter == null || roleFilter == AppRole.ROLE_ADMIN)
                ? profileRepository.findByProfileRoleIn(PROFILE_ROLES)
                : profileRepository.findAllByProfileRole(roleFilter);
        return profiles.stream().map(this::toListItemDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProfileDTO> listProfilesWithDetails(AppRole roleFilter) {
        List<Profile> profiles = (roleFilter == null || roleFilter == AppRole.ROLE_ADMIN)
                ? profileRepository.findByProfileRoleIn(PROFILE_ROLES)
                : profileRepository.findAllByProfileRole(roleFilter);
        return profiles.stream().map(this::toDTO).collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public ProfileDTO getProfileByRoleAndId(AppRole role, Long id) {
        if (role == null || role == AppRole.ROLE_ADMIN) {
            throw new BadRequestException("Invalid profile role");
        }
        Profile profile = profileRepository.findByIdAndProfileRole(id, role)
                .orElseThrow(() -> new ResourceNotFoundException("Profile", "id/role", id + "/" + role));
        return toDTO(profile);
    }

    @Override
    @Transactional
    public void approveProfile(AppRole role, Long id, String adminNote) {
        Profile profile = profileRepository.findByIdAndProfileRole(id, role)
                .orElseThrow(() -> new ResourceNotFoundException("Profile", "id/role", id + "/" + role));
        profile.setStatus(ProfileStatus.APPROVED);
        profile.setReviewedAt(LocalDateTime.now());
        profile.setAdminNote(adminNote);
        profileRepository.save(profile);
        log.info("Profile {} approved", id);
    }

    @Override
    @Transactional
    public void rejectProfile(AppRole role, Long id, String adminNote) {
        Profile profile = profileRepository.findByIdAndProfileRole(id, role)
                .orElseThrow(() -> new ResourceNotFoundException("Profile", "id/role", id + "/" + role));
        profile.setStatus(ProfileStatus.REJECTED);
        profile.setReviewedAt(LocalDateTime.now());
        profile.setAdminNote(adminNote);
        profileRepository.save(profile);
        log.info("Profile {} rejected", id);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isProfileApproved(String userName, AppRole profileRole) {
        if (userName == null || profileRole == null || profileRole == AppRole.ROLE_ADMIN) {
            return false;
        }
        return profileRepository.findByUserUserNameAndProfileRole(userName, profileRole)
                .map(p -> p.getStatus() == ProfileStatus.APPROVED)
                .orElse(false);
    }

    @Override
    @Transactional(readOnly = true)
    public ApprovalStatusResponse getApprovalStatus(String userName, AppRole profileRole) {
        ProfileStatus status = profileRepository.findByUserUserNameAndProfileRole(userName, profileRole)
                .map(Profile::getStatus)
                .orElse(null);
        boolean approved = status == ProfileStatus.APPROVED;
        return new ApprovalStatusResponse(approved, status);
    }

    private void applyRequestToProfile(ProfileRequest req, Profile profile) {
        if (req.getFullName() != null) profile.setFullName(req.getFullName());
        if (req.getGender() != null) profile.setGender(req.getGender());
        if (req.getDateOfBirth() != null) profile.setDateOfBirth(req.getDateOfBirth());
        if (req.getAadharNumber() != null) profile.setAadharNumber(req.getAadharNumber());
        if (req.getMobile() != null) profile.setMobile(req.getMobile());
        if (req.getEmail() != null) profile.setEmail(req.getEmail());
        if (req.getFirmName() != null) profile.setFirmName(req.getFirmName());
        if (req.getLicenseNumber() != null) profile.setLicenseNumber(req.getLicenseNumber());
        if (req.getIdType() != null) profile.setIdType(req.getIdType());
        if (req.getIdNumber() != null) profile.setIdNumber(req.getIdNumber());
        if (req.getAddress() != null) profile.setAddress(req.getAddress());
        if (req.getCity() != null) profile.setCity(req.getCity());
        if (req.getState() != null) profile.setState(req.getState());
        if (req.getPinCode() != null) profile.setPinCode(req.getPinCode());
    }

    private ProfileDTO toDTO(Profile p) {
        ProfileDTO dto = new ProfileDTO();
        dto.setId(p.getId());
        dto.setUserId(p.getUser().getUserId());
        dto.setUserName(p.getUser().getUserName());
        dto.setProfileRole(p.getProfileRole());
        dto.setFullName(p.getFullName());
        dto.setGender(p.getGender());
        dto.setDateOfBirth(p.getDateOfBirth());
        dto.setAadharNumber(p.getAadharNumber());
        dto.setMobile(p.getMobile());
        dto.setEmail(p.getEmail());
        dto.setFirmName(p.getFirmName());
        dto.setLicenseNumber(p.getLicenseNumber());
        dto.setIdType(p.getIdType());
        dto.setIdNumber(p.getIdNumber());
        dto.setAddress(p.getAddress());
        dto.setCity(p.getCity());
        dto.setState(p.getState());
        dto.setPinCode(p.getPinCode());
        dto.setStatus(p.getStatus());
        dto.setSubmittedAt(p.getSubmittedAt());
        dto.setReviewedAt(p.getReviewedAt());
        dto.setAdminNote(p.getAdminNote());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        return dto;
    }

    private ProfileListItemDTO toListItemDTO(Profile p) {
        ProfileListItemDTO dto = new ProfileListItemDTO();
        dto.setProfileRole(p.getProfileRole());
        dto.setId(p.getId());
        dto.setUserId(p.getUser().getUserId());
        dto.setUserName(p.getUser().getUserName());
        dto.setDisplayName(p.getFullName() != null ? p.getFullName() : p.getUser().getUserName());
        dto.setStatus(p.getStatus());
        dto.setSubmittedAt(p.getSubmittedAt());
        return dto;
    }
}

