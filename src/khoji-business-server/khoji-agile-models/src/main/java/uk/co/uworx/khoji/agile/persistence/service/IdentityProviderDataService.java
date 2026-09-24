package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.ObjectUtils;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.model.IdentityProvider;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.repository.IdentityProviderRepository;
import uk.co.uworx.khoji.agile.response.UserAccountModel;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class IdentityProviderDataService
{
  @Autowired
  private IdentityProviderRepository identityProviderRepository;

  public IdentityProvider createOrUpdateIdentityProvider(IdentityProvider identityProvider)
  {
    //TODO: null handling
    return identityProviderRepository.save(identityProvider);
  }

  public IdentityProvider getIdentityProviderByUserId(Long userId)
  {
    //TODO: update this to get value against the provider
    List<IdentityProvider> identityProviderList = identityProviderRepository.findByUserId(userId);
    if (CollectionUtils.isEmpty(identityProviderList))
    {
      throw new ServiceException(ServiceError.G0000);
    }
    return identityProviderList.getFirst();
  }

  public IdentityProvider getIdentityProviderByLoginCode(String loginCode)
  {
    return identityProviderRepository.findByLoginCode(loginCode);
  }

  public Optional<IdentityProvider> getIdentityProviderByUserEmail(String email)
  {
    return identityProviderRepository.findByUserEmail(email);
  }

  public UserAccountModel getUserDetailsAndInvalidTokens(List<String> loginCodes) {
    Map<String, IdentityProvider> identityProviderMap = identityProviderRepository
            .findAllByLoginCodeIn(loginCodes)
            .stream()
            .collect(Collectors.toMap(IdentityProvider::getLoginCode, ip -> ip));

    List<String> invalidEntries = new ArrayList<>();

    List<UserAccountModel.Info> orderedUsers = loginCodes
            .stream()
            .map(code -> {
              IdentityProvider ip = identityProviderMap.get(code);
              if (ObjectUtils.isEmpty(ip)) {
                invalidEntries.add(code);
                return null;
              }
              KhojiUser ku = ip.getUser();
              return new UserAccountModel.Info(
                      ku.getFullName(),
                      ku.getEmail(),
                      ku.getImageUrl()
              );
            })
            .filter(Objects::nonNull)
            .toList();

    return new UserAccountModel(
            invalidEntries,
            orderedUsers
    );
  }
}
