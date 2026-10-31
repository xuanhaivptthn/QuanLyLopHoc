package com.attendance.organization.repository;

import com.attendance.organization.entity.OrganizationMember;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {

    @Query("SELECT m FROM OrganizationMember m JOIN FETCH m.user WHERE m.organization.id = :orgId")
    List<OrganizationMember> findAllByOrganizationIdWithUser(@Param("orgId") UUID orgId);

    @Query("SELECT m FROM OrganizationMember m JOIN FETCH m.organization WHERE m.user.id = :userId")
    List<OrganizationMember> findAllByUserIdWithOrganization(@Param("userId") UUID userId);

    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);

    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);
}
