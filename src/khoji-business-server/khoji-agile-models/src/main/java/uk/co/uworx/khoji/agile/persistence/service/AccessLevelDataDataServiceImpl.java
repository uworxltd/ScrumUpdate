package uk.co.uworx.khoji.agile.persistence.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.internal.service.AccessLevelDataService;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;
import uk.co.uworx.khoji.agile.persistence.repository.AccessLevelRepository;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
public class AccessLevelDataDataServiceImpl implements AccessLevelDataService
{
  @Autowired
  private AccessLevelRepository accessLevelRepository;

  /**
   * Method to find an Access Level
   * with a code
   * @param code
   * @return
   */
  @Override
  public AccessLevel findByCode(String code)
  {
    AccessLevel accessLevel = accessLevelRepository.findByLevelCode(code);
    if (accessLevel == null)
    {
      return getDefaultAccess();
    }
    return accessLevel;
  }

  /**
   * Method returns list of access level codes which
   * are the child of that access level
   * @param userCode
   * @return
   */
  public List<String> getAllowedActionsExpensiveOp(String userCode)
  {
    List<String> childAccessLevels = new ArrayList<>();

    // Find the access level
    AccessLevel accessLevel = accessLevelRepository.findByLevelCode(userCode);

    if (accessLevel == null)
    {
      return new ArrayList<>();
    }

    // Add the current access level to the list of child access levels
    childAccessLevels.add(accessLevel.getLevelCode());

    // Fetch all records from the access_levels table
    List<AccessLevel> allAccessLevels = accessLevelRepository.findAll();

    // Filter the results to only include child access levels for the current access level
    List<AccessLevel> children = allAccessLevels.stream()
            .filter(accessLevels -> {
              String parentCode = accessLevels.getParentCode();
              String levelCode = accessLevel.getLevelCode();
              return parentCode != null && parentCode.equals(levelCode);
            })
            .toList();

    // Recursively call the method for each child access level
    for (AccessLevel child : children)
    {
      childAccessLevels.addAll(this.getAllowedActionsExpensiveOp(child.getLevelCode()));
    }
    return childAccessLevels;
  }

  @Override
  public List<String> getAllowedActions(String userCode)
  {
    return accessLevelRepository.findAllAccessibleLevels(userCode);
  }

  /**
   * This returns the default access which is not
   * the parent of any access level (USER)
   * @return
   */
  @Override
  public AccessLevel getDefaultAccess()
  {
    List<AccessLevel> accessLevels = accessLevelRepository.findAll();
    List<String> parentIds = accessLevels.stream().map(AccessLevel::getParentCode).filter(Objects::nonNull).collect(Collectors.toList());

    for (AccessLevel accessLevel : accessLevels)
    {
      if (!parentIds.contains(accessLevel.getLevelCode()))
      {
        return accessLevel;
      }
    }

    return null;
  }

  /**
   * Method to fetch all the access levels from the database
   * @return
   */
  @Override
  public List<AccessLevel> getAllAccessLevels()
  {
    return accessLevelRepository.findAll();
  }

}
