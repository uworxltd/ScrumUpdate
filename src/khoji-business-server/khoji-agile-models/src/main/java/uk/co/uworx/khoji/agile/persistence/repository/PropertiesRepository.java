package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.Properties;

import java.util.Optional;

@Repository
public interface PropertiesRepository extends JpaRepository<Properties, Long>
{
  Optional<Properties> findByKey(String key);
}
