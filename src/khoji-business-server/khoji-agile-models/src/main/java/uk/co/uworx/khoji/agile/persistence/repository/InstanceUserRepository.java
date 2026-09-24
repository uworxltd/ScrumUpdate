package uk.co.uworx.khoji.agile.persistence.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;

import java.util.List;

@Repository
public interface InstanceUserRepository extends JpaRepository<InstanceUser, Long>
{
  List<InstanceUser> findInstanceUsersByInstanceId(Long instanceId);

  @Query(
          value = "SELECT iu FROM InstanceUser iu WHERE iu.accountId = :accountId AND iu.instance.id = :instanceId"
  )
  InstanceUser findWithAccountIdAndByInstanceId(String accountId, Long instanceId);

  @Query(
          value = "SELECT iu FROM InstanceUser iu WHERE iu.email = :email AND iu.instance.id = :instanceId"
  )
  InstanceUser findWithEmailAndByInstanceId(String email, Long instanceId);

  @Query(
          value = "SELECT iu FROM InstanceUser iu WHERE iu.accountId IN :accountId AND iu.instance.id = :instanceId"
  )
  List<InstanceUser> findWithAccountIdAndByInstanceId(List<String> accountId, Long instanceId);

  @Query(
          value = "SELECT iu FROM InstanceUser iu WHERE iu.id IN :ids AND iu.instance.id = :instanceId"
  )
  List<InstanceUser> findWithIdsAndByInstanceId(List<Long> ids, Long instanceId);

  @Query(
          """
          SELECT iu
          FROM InstanceUser iu
          WHERE iu.email = :email
          """
  )
  List<InstanceUser> findAllByInstanceUserEmail(String email);
}
