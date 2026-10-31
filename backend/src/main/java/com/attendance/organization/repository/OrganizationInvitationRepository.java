package com.attendance.organization.repository;

import com.attendance.organization.entity.InvitationStatus;
import com.attendance.organization.entity.OrganizationInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationInvitationRepository extends JpaRepository<OrganizationInvitation, UUID> {
    Optional<OrganizationInvitation> findByToken(String token);
    List<OrganizationInvitation> findAllByOrganizationIdAndStatus(UUID organizationId, InvitationStatus status);
    List<OrganizationInvitation> findAllByEmailAndStatus(String email, InvitationStatus status);
    boolean existsByOrganizationIdAndEmailAndStatus(UUID organizationId, String email, InvitationStatus status);
}
