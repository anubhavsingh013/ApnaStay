package com.secure.apnastaybackend.services;

import com.secure.apnastaybackend.dto.request.ProfileRequest;
import com.secure.apnastaybackend.dto.response.ApprovalStatusResponse;
import com.secure.apnastaybackend.dto.response.ProfileDTO;
import com.secure.apnastaybackend.dto.response.ProfileListItemDTO;
import com.secure.apnastaybackend.entity.AppRole;

import java.util.List;

public interface ProfileService {

    AppRole getCurrentUserAppRole(String userName);

    ProfileDTO submitForReview(String userName, ProfileRequest request);

    ProfileDTO updateProfileDetails(String userName, AppRole profileRole, ProfileRequest request);

    ProfileDTO getProfile(String userName, AppRole profileRole);

    List<ProfileListItemDTO> listProfiles(AppRole roleFilter);

    List<ProfileDTO> listProfilesWithDetails(AppRole roleFilter);

    ProfileDTO getProfileByRoleAndId(AppRole role, Long id);

    void approveProfile(AppRole role, Long id, String adminNote);

    void rejectProfile(AppRole role, Long id, String adminNote);

    boolean isProfileApproved(String userName, AppRole profileRole);

    ApprovalStatusResponse getApprovalStatus(String userName, AppRole profileRole);
}

