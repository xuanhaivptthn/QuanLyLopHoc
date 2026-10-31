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
public class AuthResponse {
    private String token;
    @Builder.Default
    private String tokenType = "Bearer";
    private UUID userId;
    private String email;
    private String fullName;
    private Role role;
    private UUID activeOrganizationId;
    private String activeOrganizationName;
}
