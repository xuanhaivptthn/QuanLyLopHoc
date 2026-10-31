package com.attendance.organization.dto;

import com.attendance.organization.entity.OrganizationRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserOrganizationDto {
    private UUID id;
    private String code;
    private String name;
    private OrganizationRole role;
}
