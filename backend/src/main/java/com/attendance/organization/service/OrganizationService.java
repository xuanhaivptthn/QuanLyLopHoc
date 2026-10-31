package com.attendance.organization.service;

import com.attendance.common.exception.BadRequestException;
import com.attendance.common.exception.ForbiddenException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.UserPrincipal;
import com.attendance.organization.dto.InvitationResponse;
import com.attendance.organization.dto.InviteTeacherRequest;
import com.attendance.organization.dto.OrganizationMemberResponse;
import com.attendance.organization.dto.OrganizationResponse;
import com.attendance.organization.entity.InvitationStatus;
import com.attendance.organization.entity.Organization;
import com.attendance.organization.entity.OrganizationInvitation;
import com.attendance.organization.entity.OrganizationMember;
import com.attendance.organization.repository.OrganizationInvitationRepository;
import com.attendance.organization.repository.OrganizationMemberRepository;
import com.attendance.organization.repository.OrganizationRepository;
import com.attendance.user.entity.User;
import com.attendance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository memberRepository;
    private final OrganizationInvitationRepository invitationRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public OrganizationResponse getOrganization(UserPrincipal principal) {
        Organization org = getOrganizationOrThrow(principal);
        return mapToResponse(org);
    }

    @Transactional(readOnly = true)
    public List<OrganizationMemberResponse> getMembers(UserPrincipal principal) {
        Organization org = getOrganizationOrThrow(principal);
        List<OrganizationMember> members = memberRepository.findAllByOrganizationIdWithUser(org.getId());

        return members.stream()
                .map(m -> OrganizationMemberResponse.builder()
                        .id(m.getId())
                        .userId(m.getUser().getId())
                        .email(m.getUser().getEmail())
                        .fullName(m.getUser().getFullName())
                        .role(m.getRole())
                        .status(m.getStatus())
                        .joinedAt(m.getCreatedAt())
                        .build())
                .toList();
    }

    @Transactional
    public InvitationResponse inviteTeacher(UserPrincipal principal, InviteTeacherRequest request) {
        Organization org = getOrganizationOrThrow(principal);
        String email = request.getEmail().toLowerCase().trim();

        User inviter = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));

        var existingUser = userRepository.findByEmail(email);
        if (existingUser.isPresent() && memberRepository.existsByOrganizationIdAndUserId(org.getId(), existingUser.get().getId())) {
            throw new BadRequestException("This teacher is already a member of your center.");
        }

        if (invitationRepository.existsByOrganizationIdAndEmailAndStatus(org.getId(), email, InvitationStatus.PENDING)) {
            throw new BadRequestException("A pending invitation has already been sent to: " + email);
        }

        OrganizationInvitation invitation = OrganizationInvitation.builder()
                .organization(org)
                .email(email)
                .role(request.getRole())
                .token(UUID.randomUUID().toString())
                .expiresAt(Instant.now().plus(7, ChronoUnit.DAYS))
                .status(InvitationStatus.PENDING)
                .invitedBy(inviter)
                .build();

        invitation = invitationRepository.save(invitation);
        log.info("Teacher invitation generated for {} in organization {}", email, org.getName());

        return mapToInvitationResponse(invitation);
    }

    @Transactional(readOnly = true)
    public List<InvitationResponse> getPendingInvitations(UserPrincipal principal) {
        Organization org = getOrganizationOrThrow(principal);
        return invitationRepository.findAllByOrganizationIdAndStatus(org.getId(), InvitationStatus.PENDING).stream()
                .map(this::mapToInvitationResponse)
                .toList();
    }

    @Transactional
    public void revokeInvitation(UserPrincipal principal, UUID invitationId) {
        Organization org = getOrganizationOrThrow(principal);
        OrganizationInvitation invitation = invitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation", "id", invitationId));

        if (!invitation.getOrganization().getId().equals(org.getId())) {
            throw new ForbiddenException("Cannot revoke invitations from another organization.");
        }

        invitation.setStatus(InvitationStatus.REVOKED);
        invitationRepository.save(invitation);
    }

    @Transactional
    public void removeMember(UserPrincipal principal, UUID memberId) {
        Organization org = getOrganizationOrThrow(principal);
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new ResourceNotFoundException("Member", "id", memberId));

        if (!member.getOrganization().getId().equals(org.getId())) {
            throw new ForbiddenException("Cannot remove member from another organization.");
        }

        if (member.getUser().getId().equals(principal.getId())) {
            throw new BadRequestException("An administrator cannot remove themselves from the organization.");
        }

        memberRepository.delete(member);
        log.info("Removed member {} from organization {}", memberId, org.getName());
    }

    private Organization getOrganizationOrThrow(UserPrincipal principal) {
        if (principal.getActiveOrganizationId() == null) {
            throw new ForbiddenException("Current user is not associated with any organization.");
        }
        return organizationRepository.findById(principal.getActiveOrganizationId())
                .orElseThrow(() -> new ResourceNotFoundException("Organization", "id", principal.getActiveOrganizationId()));
    }

    private OrganizationResponse mapToResponse(Organization org) {
        return OrganizationResponse.builder()
                .id(org.getId())
                .code(org.getCode())
                .name(org.getName())
                .logoUrl(org.getLogoUrl())
                .contactEmail(org.getContactEmail())
                .contactPhone(org.getContactPhone())
                .settings(org.getSettings())
                .createdAt(org.getCreatedAt())
                .build();
    }

    private InvitationResponse mapToInvitationResponse(OrganizationInvitation inv) {
        return InvitationResponse.builder()
                .id(inv.getId())
                .email(inv.getEmail())
                .role(inv.getRole())
                .token(inv.getToken())
                .expiresAt(inv.getExpiresAt())
                .status(inv.getStatus())
                .createdAt(inv.getCreatedAt())
                .build();
    }
}
