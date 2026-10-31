package com.attendance.student.repository;

import com.attendance.student.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRepository extends JpaRepository<Student, UUID> {

    List<Student> findAllByOrganizationId(UUID organizationId);

    List<Student> findAllByOwnerTeacherIdAndOrganizationIsNull(UUID ownerTeacherId);

    Optional<Student> findByOrganizationIdAndStudentCode(UUID organizationId, String studentCode);

    Optional<Student> findByOwnerTeacherIdAndOrganizationIsNullAndStudentCode(UUID ownerTeacherId, String studentCode);

    Optional<Student> findByUserId(UUID userId);

    boolean existsByOrganizationIdAndStudentCode(UUID organizationId, String studentCode);

    boolean existsByOwnerTeacherIdAndOrganizationIsNullAndStudentCode(UUID ownerTeacherId, String studentCode);
}
