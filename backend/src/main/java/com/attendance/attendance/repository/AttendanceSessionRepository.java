package com.attendance.attendance.repository;

import com.attendance.attendance.entity.AttendanceSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, UUID> {

    @Query("SELECT s FROM AttendanceSession s WHERE s.classroom.id = :classroomId ORDER BY s.sessionDate DESC, s.startTime DESC")
    List<AttendanceSession> findAllByClassroomIdOrderByDateDesc(@Param("classroomId") UUID classroomId);

    @Query("SELECT s FROM AttendanceSession s JOIN FETCH s.classroom c LEFT JOIN FETCH c.organization WHERE s.id = :id")
    Optional<AttendanceSession> findByIdWithClassroom(@Param("id") UUID id);
}
