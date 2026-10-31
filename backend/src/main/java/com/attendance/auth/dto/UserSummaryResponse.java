package com.attendance.auth.dto;

import com.attendance.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private boolean active;
}
