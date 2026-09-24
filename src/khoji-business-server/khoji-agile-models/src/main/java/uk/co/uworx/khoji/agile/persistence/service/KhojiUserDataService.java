package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.repository.KhojiUserRepository;

import java.util.List;
import java.util.Optional;

@Service
public class KhojiUserDataService
{
  @Autowired
  private KhojiUserRepository khojiUserRepository;

  public KhojiUser createOrUpdateUser(KhojiUser khojiUser)
  {
    //TODO: provide null handling
    return khojiUserRepository.save(khojiUser);
  }

  public Optional<KhojiUser> findByEmail(String email)
  {
    return khojiUserRepository.findByEmail(email);
  }

  public List<KhojiUser> findByIds(List<Long> userIds)
  {
    return khojiUserRepository.findAllById(userIds);
  }

  public void deleteKhojiUserProfileById(Long userId) {
    khojiUserRepository.deleteUserAndRelatedData(userId);
  }
}
