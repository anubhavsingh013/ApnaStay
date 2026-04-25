package com.secure.apnastaybackend.services.impl;

import com.secure.apnastaybackend.dto.request.ProfileRequest;
import com.secure.apnastaybackend.dto.response.ApprovalStatusResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.dto.response.ProfileListItemDTO;
import com.secure.apnastaybackend.dto.response.ProfilePhotoResponse;
import com.secure.apnastaybackend.entity.*;
import com.secure.apnastaybackend.exceptions.BadRequestException;
import com.secure.apnastaybackend.exceptions.ResourceNotFoundException;
import com.secure.apnastaybackend.repositories.ProfileRepository;
import com.secure.apnastaybackend.repositories.UserProfilePictureRepository;
import com.secure.apnastaybackend.repositories.UserRepository;
import com.secure.apnastaybackend.services.AuditLogService;
import com.secure.apnastaybackend.services.ProfileService;
import com.secure.apnastaybackend.services.PropertyImageUploadValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
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
    @Autowired
    private AuditLogService auditLogService;
    @Autowired
    private UserProfilePictureRepository userProfilePictureRepository;
    @Autowired
    private PropertyImageUploadValidator propertyImageUploadValidator;

    @Value("${app.public-base-url:}")
    private String publicBaseUrl;

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
    public ProfileDTO updateProfileDetails(String userName, AppRole profileRole, ProfileRequest request) {
        validateMandatoryProfileFields(request, "update");
        if (profileRole == null) {
            throw new BadRequestException("Invalid profile role");
        }
        User user = userRepository.findByUserName(userName)
            .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
            Profile profile = profileRepository.findByUserUserIdAndProfileRole(user.getUserId(), profileRole)
            .orElseGet(() -> {
                Profile p = new Profile();
                p.setUser(user);
                p.setProfileRole(profileRole);
//                p.setStatus(ProfileStatus.PENDING);
                return p;
            });
        profile.setStatus(ProfileStatus.PENDING);
        applyRequestToProfile(request, profile);

        Profile saved = profileRepository.save(profile);
        log.info("Profile details updated: user={} role={}", userName, profileRole);
        auditLogService.logAction("PROFILE_UPDATE", userName, null,
                "profileId=" + saved.getId() + " role=" + profileRole + " status=" + saved.getStatus());
        return toDTO(saved);
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
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Profile", "userId/role", "Update your profile first: " + userName + "/" + profileRole));
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
        auditLogService.logAction("PROFILE_SUBMIT_REVIEW", userName, null,
                "profileId=" + saved.getId() + " role=" + profileRole);
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
        if (request.getState() == null || request.getState().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: state");
        }
        if (request.getCity() == null || request.getCity().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: city");
        }
        if (request.getDistrict() == null || request.getDistrict().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: district");
        }
        if (request.getPinCode() == null || request.getPinCode().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: pinCode");
        }
        String pc = request.getPinCode().trim();
        if (!pc.matches("^[0-9]{6}$")) {
            throw new BadRequestException("pinCode must be exactly 6 digits");
        }
        if (request.getAddress() == null || request.getAddress().trim().isEmpty()) {
            throw new BadRequestException("Missing mandatory parameter: address (village / street / house)");
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
    public void approveProfile(AppRole role, Long id, String adminNote, String adminUsername) {
        Profile profile = profileRepository.findByIdAndProfileRole(id, role)
                .orElseThrow(() -> new ResourceNotFoundException("Profile", "id/role", id + "/" + role));
        profile.setStatus(ProfileStatus.APPROVED);
        profile.setReviewedAt(LocalDateTime.now());
        profile.setAdminNote(adminNote);
        profileRepository.save(profile);
        log.info("Profile {} approved", id);
        String subject = profile.getUser() != null ? profile.getUser().getUserName() : "?";
        auditLogService.logAction("PROFILE_APPROVE", adminUsername, null,
                "profileId=" + id + " role=" + role + " user=" + subject + auditNoteSuffix(adminNote));
    }

    @Override
    @Transactional
    public void rejectProfile(AppRole role, Long id, String adminNote, String adminUsername) {
        Profile profile = profileRepository.findByIdAndProfileRole(id, role)
                .orElseThrow(() -> new ResourceNotFoundException("Profile", "id/role", id + "/" + role));
        profile.setStatus(ProfileStatus.REJECTED);
        profile.setReviewedAt(LocalDateTime.now());
        profile.setAdminNote(adminNote);
        profileRepository.save(profile);
        log.info("Profile {} rejected", id);
        String subject = profile.getUser() != null ? profile.getUser().getUserName() : "?";
        auditLogService.logAction("PROFILE_REJECT", adminUsername, null,
                "profileId=" + id + " role=" + role + " user=" + subject + auditNoteSuffix(adminNote));
    }

    private static String auditNoteSuffix(String adminNote) {
        if (adminNote == null || adminNote.isBlank()) {
            return "";
        }
        String t = adminNote.trim();
        if (t.length() > 200) {
            t = t.substring(0, 197) + "...";
        }
        return " note=" + t.replace('\n', ' ');
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

    @Override
    @Transactional
    public ProfilePhotoResponse uploadProfilePhoto(String userName, MultipartFile file) {
        propertyImageUploadValidator.validateFile(file);
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        byte[] data;
        try {
            data = file.getBytes();
        } catch (IOException e) {
            throw new BadRequestException("Could not read uploaded image.");
        }
        if (data.length == 0) {
            throw new BadRequestException("Image file is empty.");
        }
        String ct = normalizeImageContentType(file.getContentType());
        UserProfilePicture row = userProfilePictureRepository.findByUser_UserId(user.getUserId())
                .orElseGet(() -> {
                    UserProfilePicture p = new UserProfilePicture();
                    p.setUser(user);
                    return p;
                });
        row.setContentType(ct);
        row.setData(data);
        userProfilePictureRepository.save(row);
        log.info("Profile photo saved: userId={}", user.getUserId());
        auditLogService.logAction("PROFILE_PHOTO_UPLOAD", userName, null, "userId=" + user.getUserId());
        return new ProfilePhotoResponse(user.getUserId(), buildProfilePhotoUrl(user.getUserId()));
    }

    @Override
    @Transactional
    public void deleteProfilePhoto(String userName) {
        User user = userRepository.findByUserName(userName)
                .orElseThrow(() -> new ResourceNotFoundException("User", "username", userName));
        userProfilePictureRepository.deleteByUser_UserId(user.getUserId());
        log.info("Profile photo removed: userId={}", user.getUserId());
        auditLogService.logAction("PROFILE_PHOTO_DELETE", userName, null, "userId=" + user.getUserId());
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfilePicture getProfilePhotoForDownload(Long userId) {
        return userProfilePictureRepository.findByUser_UserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Profile photo", "userId", userId));
    }

    private static String normalizeImageContentType(String raw) {
        String d = raw != null ? raw.toLowerCase(Locale.ROOT).trim().replace(" ", "") : "";
        if ("image/jpg".equals(d)) {
            return "image/jpeg";
        }
        if (d.isBlank()) {
            return "image/jpeg";
        }
        return d;
    }

    private String buildProfilePhotoUrl(Long userId) {
        String path = "/api/profile/photo/" + userId;
        if (publicBaseUrl == null || publicBaseUrl.isBlank()) {
            return path;
        }
        String base = publicBaseUrl.endsWith("/")
                ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
                : publicBaseUrl;
        return base + path;
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
        if (req.getDistrict() != null) profile.setDistrict(req.getDistrict());
        if (req.getState() != null) profile.setState(req.getState());
        if (req.getPinCode() != null) profile.setPinCode(req.getPinCode());
        if (req.getVillage() != null) profile.setVillage(req.getVillage());
        if (req.getPostOffice() != null) profile.setPostOffice(req.getPostOffice());
        if (req.getPoliceStation() != null) profile.setPoliceStation(req.getPoliceStation());
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
        dto.setDistrict(p.getDistrict());
        dto.setState(p.getState());
        dto.setPinCode(p.getPinCode());
        dto.setVillage(p.getVillage());
        dto.setPostOffice(p.getPostOffice());
        dto.setPoliceStation(p.getPoliceStation());
        dto.setStatus(p.getStatus());
        dto.setSubmittedAt(p.getSubmittedAt());
        dto.setReviewedAt(p.getReviewedAt());
        dto.setAdminNote(p.getAdminNote());
        dto.setCreatedAt(p.getCreatedAt());
        dto.setUpdatedAt(p.getUpdatedAt());
        Long uid = p.getUser().getUserId();
        if (userProfilePictureRepository.existsByUser_UserId(uid)) {
            dto.setProfilePictureUrl(buildProfilePhotoUrl(uid));
        }
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
        Long uid = p.getUser().getUserId();
        if (userProfilePictureRepository.existsByUser_UserId(uid)) {
            dto.setProfilePictureUrl(buildProfilePhotoUrl(uid));
        }
        return dto;
    }
}

