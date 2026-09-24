package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.MsCalendarIntegration;

@Repository
public interface MsCalendarIntegrationRepository extends JpaRepository<MsCalendarIntegration, Long>
{
}
