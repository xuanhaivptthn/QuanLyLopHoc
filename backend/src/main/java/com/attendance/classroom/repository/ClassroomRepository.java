package com.attendance.classroom.repository;

import com.attendance.classroom.entity.Classroom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassroomRepository extends JpaRepository<Classroom, UUID> {

    @Query("SELECT c FROM Classroom c JOIN FETCH c.teacher LEFT JOIN FETCH c.organization WHERE c.organization.id = :orgId")
    List<Classroom> findAllByOrganizationIdWithDetails(@Param("orgId") UUID orgId);

    @Query("SELECT c FROM Classroom c JOIN FETCH c.teacher LEFT JOIN FETCH c.organization WHERE c.teacher.id = :teacherId AND c.organization IS NULL")
    List<Classroom> findAllSoloByTeacherIdWithDetails(@Param("teacherId") UUID teacherId);

    @Query("SELECT c FROM Classroom c JOIN FETCH c.teacher LEFT JOIN FETCH c.organization WHERE c.organization.id = :orgId AND c.teacher.id = :teacherId")
    List<Classroom> findAllByOrganizationIdAndTeacherIdWithDetails(@Param("orgId") UUID orgId, @Param("teacherId") UUID teacherId);

    @Query("SELECT c FROM Classroom c JOIN FETCH c.teacher LEFT JOIN FETCH c.organization WHERE c.id = :id")
    Optional<Classroom> findByIdWithDetails(@Param("id") UUID id);

    boolean existsByOrganizationIdAndCode(UUID organizationId, String code);

    boolean existsByTeacherIdAndOrganizationIsNullAndCode(UUID teacherId, String code);
}
