package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;

@Repository
public interface UserSettingsRepository extends JpaRepository<UserSettings, Long>
{
}
