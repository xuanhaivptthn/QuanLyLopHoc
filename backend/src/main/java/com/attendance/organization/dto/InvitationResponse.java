package com.attendance.organization.dto;

import com.attendance.organization.entity.InvitationStatus;
import com.attendance.organization.entity.OrganizationRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InvitationResponse {
    private UUID id;
    private String email;
    private OrganizationRole role;
    private String token;
    private Instant expiresAt;
    private InvitationStatus status;
    private Instant createdAt;
}
