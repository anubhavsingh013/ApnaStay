package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.ProfileRequest;
import com.secure.apnastaybackend.dto.response.ApprovalStatusResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.dto.response.ProfileListItemDTO;
import com.secure.apnastaybackend.dto.response.ProfilePhotoResponse;
import com.secure.apnastaybackend.entity.AppRole;
import com.secure.apnastaybackend.entity.UserProfilePicture;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface ProfileService {

    AppRole getCurrentUserAppRole(String userName);

    ProfileDTO submitForReview(String userName, ProfileRequest request);

    ProfileDTO updateProfileDetails(String userName, AppRole profileRole, ProfileRequest request);

    ProfileDTO getProfile(String userName, AppRole profileRole);

    List<ProfileListItemDTO> listProfiles(AppRole roleFilter);

    List<ProfileDTO> listProfilesWithDetails(AppRole roleFilter);

    ProfileDTO getProfileByRoleAndId(AppRole role, Long id);

    void approveProfile(AppRole role, Long id, String adminNote, String adminUsername);

    void rejectProfile(AppRole role, Long id, String adminNote, String adminUsername);

    boolean isProfileApproved(String userName, AppRole profileRole);

    ApprovalStatusResponse getApprovalStatus(String userName, AppRole profileRole);

    ProfilePhotoResponse uploadProfilePhoto(String userName, MultipartFile file);

    void deleteProfilePhoto(String userName);

    UserProfilePicture getProfilePhotoForDownload(Long userId);
}

