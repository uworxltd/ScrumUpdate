package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.ScrumUpdate;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ScrumUpdatesRepository extends JpaRepository<ScrumUpdate, Long>
{
    Optional<ScrumUpdate> findByRequestedDate(LocalDate requestedDate);

    List<ScrumUpdate> findByInstanceUser_InstanceIdAndRequestedDateBetween(
        Long instanceId, LocalDate startDate, LocalDate endDate);

    List<ScrumUpdate> findByInstanceUser_InstanceIdAndUser_IdAndRequestedDateBetween(
        Long instanceId, Long userId, LocalDate startDate, LocalDate endDate);
}
