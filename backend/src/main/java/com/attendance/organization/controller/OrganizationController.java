package com.attendance.organization.controller;

import com.attendance.common.security.UserPrincipal;
import com.attendance.organization.dto.InvitationResponse;
import com.attendance.organization.dto.InviteTeacherRequest;
import com.attendance.organization.dto.OrganizationMemberResponse;
import com.attendance.organization.dto.OrganizationResponse;
import com.attendance.organization.service.OrganizationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/organization")
@RequiredArgsConstructor
@PreAuthorize("hasRole('CENTER_ADMIN')")
@Tag(name = "Center / Organization Management", description = "Endpoints for Center Administrators to manage teachers and center configuration")
@SecurityRequirement(name = "bearerAuth")
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    @Operation(summary = "Get current organization details")
    public ResponseEntity<OrganizationResponse> getOrganization(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(organizationService.getOrganization(principal));
    }

    @GetMapping("/members")
    @Operation(summary = "Get list of instructors/staff in the organization")
    public ResponseEntity<List<OrganizationMemberResponse>> getMembers(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(organizationService.getMembers(principal));
    }

    @PostMapping("/invitations")
    @Operation(summary = "Send an invitation to a teacher to join the center")
    public ResponseEntity<InvitationResponse> inviteTeacher(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody InviteTeacherRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(organizationService.inviteTeacher(principal, request));
    }

    @GetMapping("/invitations")
    @Operation(summary = "Get list of pending invitations")
    public ResponseEntity<List<InvitationResponse>> getPendingInvitations(@AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(organizationService.getPendingInvitations(principal));
    }

    @DeleteMapping("/invitations/{id}")
    @Operation(summary = "Revoke a pending teacher invitation")
    public ResponseEntity<Void> revokeInvitation(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        organizationService.revokeInvitation(principal, id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/members/{id}")
    @Operation(summary = "Remove a teacher/member from the center")
    public ResponseEntity<Void> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        organizationService.removeMember(principal, id);
        return ResponseEntity.noContent().build();
    }
}
