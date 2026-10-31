package com.attendance.classroom.repository;

import com.attendance.classroom.entity.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface EnrollmentRepository extends JpaRepository<Enrollment, UUID> {

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.student WHERE e.classroom.id = :classroomId")
    List<Enrollment> findAllByClassroomIdWithStudent(@Param("classroomId") UUID classroomId);

    @Query("SELECT e FROM Enrollment e JOIN FETCH e.classroom c LEFT JOIN FETCH c.organization LEFT JOIN FETCH c.teacher WHERE e.student.id = :studentId")
    List<Enrollment> findAllByStudentIdWithClassroom(@Param("studentId") UUID studentId);

    Optional<Enrollment> findByClassroomIdAndStudentId(UUID classroomId, UUID studentId);

    boolean existsByClassroomIdAndStudentId(UUID classroomId, UUID studentId);

    long countByClassroomId(UUID classroomId);

    void deleteByClassroomIdAndStudentId(UUID classroomId, UUID studentId);
}
