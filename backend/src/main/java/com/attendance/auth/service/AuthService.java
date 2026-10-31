package com.attendance.auth.service;

import com.attendance.auth.dto.*;
import com.attendance.common.exception.BadRequestException;
import com.attendance.common.exception.ResourceNotFoundException;
import com.attendance.common.security.JwtTokenProvider;
import com.attendance.common.security.UserPrincipal;
import com.attendance.organization.entity.*;
import com.attendance.organization.repository.OrganizationInvitationRepository;
import com.attendance.organization.repository.OrganizationMemberRepository;
import com.attendance.organization.repository.OrganizationRepository;
import com.attendance.user.entity.Role;
import com.attendance.user.entity.User;
import com.attendance.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final OrganizationRepository organizationRepository;
    private final OrganizationMemberRepository organizationMemberRepository;
    private final OrganizationInvitationRepository invitationRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider tokenProvider;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail().toLowerCase().trim(), request.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = tokenProvider.generateToken(principal);

        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));

        String orgName = user.getActiveOrganization() != null ? user.getActiveOrganization().getName() : null;

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .activeOrganizationId(principal.getActiveOrganizationId())
                .activeOrganizationName(orgName)
                .build();
    }

    @Transactional
    public AuthResponse registerSoloTeacher(RegisterSoloTeacherRequest request) {
        String email = request.getEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Email is already registered: " + email);
        }

        User user = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role(Role.TEACHER)
                .activeOrganization(null)
                .active(true)
                .build();

        user = userRepository.save(user);
        UserPrincipal principal = UserPrincipal.create(user);
        String token = tokenProvider.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .activeOrganizationId(null)
                .activeOrganizationName(null)
                .build();
    }

    @Transactional
    public AuthResponse registerCenter(RegisterCenterRequest request) {
        String slug = request.getCenterCode().toLowerCase().trim();
        if (organizationRepository.existsByCode(slug)) {
            throw new BadRequestException("Center code/slug is already taken: " + slug);
        }

        String email = request.getAdminEmail().toLowerCase().trim();
        if (userRepository.existsByEmail(email)) {
            throw new BadRequestException("Admin email is already registered: " + email);
        }

        Organization org = Organization.builder()
                .code(slug)
                .name(request.getCenterName().trim())
                .contactEmail(request.getContactEmail())
                .contactPhone(request.getContactPhone())
                .build();
        org = organizationRepository.save(org);

        User adminUser = User.builder()
                .email(email)
                .passwordHash(passwordEncoder.encode(request.getAdminPassword()))
                .fullName(request.getAdminFullName().trim())
                .role(Role.CENTER_ADMIN)
                .activeOrganization(org)
                .active(true)
                .build();
        adminUser = userRepository.save(adminUser);

        OrganizationMember member = OrganizationMember.builder()
                .organization(org)
                .user(adminUser)
                .role(OrganizationRole.ADMIN)
                .status(MemberStatus.ACTIVE)
                .build();
        organizationMemberRepository.save(member);

        UserPrincipal principal = UserPrincipal.create(adminUser);
        String token = tokenProvider.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(adminUser.getId())
                .email(adminUser.getEmail())
                .fullName(adminUser.getFullName())
                .role(adminUser.getRole())
                .activeOrganizationId(org.getId())
                .activeOrganizationName(org.getName())
                .build();
    }

    @Transactional
    public AuthResponse acceptInvitation(AcceptInviteRequest request) {
        OrganizationInvitation invitation = invitationRepository.findByToken(request.getToken())
                .orElseThrow(() -> new BadRequestException("Invalid or expired invitation token"));

        if (invitation.getStatus() != InvitationStatus.PENDING || invitation.isExpired()) {
            throw new BadRequestException("Invitation is no longer valid or has expired");
        }

        Organization org = invitation.getOrganization();
        String email = invitation.getEmail().toLowerCase().trim();

        User user = userRepository.findByEmail(email).orElse(null);
        if (user == null) {
            user = User.builder()
                    .email(email)
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .fullName(request.getFullName().trim())
                    .role(Role.TEACHER)
                    .activeOrganization(org)
                    .active(true)
                    .build();
            user = userRepository.save(user);
        } else {
            if (user.getActiveOrganization() == null) {
                user.setActiveOrganization(org);
                user = userRepository.save(user);
            }
        }

        if (!organizationMemberRepository.existsByOrganizationIdAndUserId(org.getId(), user.getId())) {
            OrganizationMember member = OrganizationMember.builder()
                    .organization(org)
                    .user(user)
                    .role(invitation.getRole())
                    .status(MemberStatus.ACTIVE)
                    .build();
            organizationMemberRepository.save(member);
        }

        invitation.setStatus(InvitationStatus.ACCEPTED);
        invitationRepository.save(invitation);

        UserPrincipal principal = UserPrincipal.create(user);
        String token = tokenProvider.generateToken(principal);

        return AuthResponse.builder()
                .token(token)
                .userId(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .activeOrganizationId(org.getId())
                .activeOrganizationName(org.getName())
                .build();
    }

    @Transactional(readOnly = true)
    public UserSummaryResponse getCurrentUser(UserPrincipal principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResourceNotFoundException("User", "id", principal.getId()));

        String orgName = user.getActiveOrganization() != null ? user.getActiveOrganization().getName() : null;
        var orgId = user.getActiveOrganization() != null ? user.getActiveOrganization().getId() : null;

        return UserSummaryResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .activeOrganizationId(orgId)
                .activeOrganizationName(orgName)
                .active(user.isActive())
                .build();
    }
}
