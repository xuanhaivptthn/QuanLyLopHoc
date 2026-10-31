package com.attendance.auth.dto;

import com.attendance.organization.dto.UserOrganizationDto;
import com.attendance.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserSummaryResponse {
    private UUID id;
    private String email;
    private String fullName;
    private Role role;
    private UUID activeOrganizationId;
    private String activeOrganizationName;
    private List<UserOrganizationDto> organizations;
    private boolean active;
}
