package com.attendance.organization.dto;

import com.attendance.organization.entity.MemberStatus;
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
public class OrganizationMemberResponse {
    private UUID id;
    private UUID userId;
    private String email;
    private String fullName;
    private OrganizationRole role;
    private MemberStatus status;
    private Instant joinedAt;
}
