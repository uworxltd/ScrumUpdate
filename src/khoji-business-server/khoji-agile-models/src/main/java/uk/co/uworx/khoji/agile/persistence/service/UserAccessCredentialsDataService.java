package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.persistence.model.UserAccessCredentials;
import uk.co.uworx.khoji.agile.persistence.repository.UserAccessCredentialsRepository;

import java.util.Optional;

@Service
public class UserAccessCredentialsDataService
{
  @Autowired
  private UserAccessCredentialsRepository userAccessCredentialsRepository;

  public Optional<UserAccessCredentials> findByEmail(String email) {
    return userAccessCredentialsRepository.findById(email);
  }

  public UserAccessCredentials createOrUpdate(UserAccessCredentials userAccessCredentials)
  {
    return userAccessCredentialsRepository.save(userAccessCredentials);
  }
}
