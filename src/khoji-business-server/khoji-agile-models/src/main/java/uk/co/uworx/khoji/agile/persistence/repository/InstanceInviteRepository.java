package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.InstanceInvite;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;

@Repository
public interface InstanceInviteRepository extends JpaRepository<InstanceInvite, Long>
{
  InstanceInvite findByInstanceUser(InstanceUser instanceUser);
}
