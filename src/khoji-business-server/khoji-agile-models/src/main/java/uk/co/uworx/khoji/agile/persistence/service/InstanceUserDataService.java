package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.repository.InstanceUserRepository;

import java.time.Instant;
import java.util.List;

@Service
public class InstanceUserDataService
{

  @Autowired
  private InstanceUserRepository instanceUserRepository;

  public InstanceUser saveOrUpdate(InstanceUser instanceUser)
  {
    return instanceUserRepository.save(instanceUser);
  }

  public List<InstanceUser> saveOrUpdateAll(List<InstanceUser> instanceUsers)
  {
    return instanceUserRepository.saveAll(instanceUsers);
  }

  public List<InstanceUser> findInstanceUsersByInstanceId(Long instanceId)
  {
    return instanceUserRepository.findInstanceUsersByInstanceId(instanceId);
  }

  public List<InstanceUser> findActiveInstanceUsersByInstanceId(Long instanceId)
  {
    return this
            .findInstanceUsersByInstanceId(instanceId)
            .stream()
            .filter(iu -> !KhojiUserStatus.REVOKED.name().equalsIgnoreCase(iu.getStatus()))
            .toList();
  }

  public InstanceUser findInstanceUserUsingAccountAndInstanceId(String accountId, Long instanceId)
  {
    return instanceUserRepository.findWithAccountIdAndByInstanceId(accountId, instanceId);
  }

  public InstanceUser findInstanceUserUsingEmailAndInstanceId(String email, Long instanceId)
  {
    return instanceUserRepository.findWithEmailAndByInstanceId(email, instanceId);
  }

  public List<InstanceUser> findInstanceUserUsingAccountListAndInstanceId(List<String> accountId, Long instanceId)
  {
    return instanceUserRepository.findWithAccountIdAndByInstanceId(accountId, instanceId);
  }

  public InstanceUser findInstanceUserById(Long instanceId)
  {
    return instanceUserRepository.findById(instanceId).orElseThrow(
            ()-> new ServiceException(ServiceError.IU001)
    );
  }

  public List<InstanceUser> findInstanceUserUsingIdsListAndInstanceId(List<Long> ids, Long instanceId)
  {
    return instanceUserRepository.findWithIdsAndByInstanceId(ids, instanceId);
  }

  public List<InstanceUser> findAllInstanceUsersByInstanceUserEmail(String email)
  {
    return instanceUserRepository.findAllByInstanceUserEmail(email);
  }

  @Async
  public void updateLastSeenOfInstanceUser(String email, Long instanceId, Instant instant)
  {
    InstanceUser instanceUser = this.findInstanceUserUsingEmailAndInstanceId(email, instanceId);
    instanceUser.setLastSeen(instant);
    this.saveOrUpdate(instanceUser);
  }
}
