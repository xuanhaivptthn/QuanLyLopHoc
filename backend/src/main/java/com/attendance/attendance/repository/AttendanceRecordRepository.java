package com.attendance.attendance.repository;

import com.attendance.attendance.entity.AttendanceRecord;
import com.attendance.attendance.entity.AttendanceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, UUID> {

    @Query("SELECT r FROM AttendanceRecord r JOIN FETCH r.student WHERE r.session.id = :sessionId ORDER BY r.student.studentCode ASC")
    List<AttendanceRecord> findAllBySessionIdWithStudent(@Param("sessionId") UUID sessionId);

    @Query("SELECT r FROM AttendanceRecord r JOIN FETCH r.session s JOIN FETCH s.classroom WHERE r.student.id = :studentId ORDER BY s.sessionDate DESC")
    List<AttendanceRecord> findAllByStudentIdWithSessionAndClass(@Param("studentId") UUID studentId);

    Optional<AttendanceRecord> findBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    boolean existsBySessionIdAndStudentId(UUID sessionId, UUID studentId);

    long countBySessionIdAndStatus(UUID sessionId, AttendanceStatus status);

    @Query("SELECT r.session.id, r.status, COUNT(r.id) FROM AttendanceRecord r WHERE r.session.id IN :sessionIds GROUP BY r.session.id, r.status")
    List<Object[]> countRecordsBySessionIdsAndStatus(@Param("sessionIds") Collection<UUID> sessionIds);
}
