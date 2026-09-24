package uk.co.uworx.khoji.agile.config.instance.aspect;

import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.service.AccessLevelDataService;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.model.UserAccess;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.security.annotations.HasAccessToInstanceWithPrivilege;

import java.security.Principal;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Aspect
@Component
public class HasAccessToInstanceWithPrivilegeAspect
{
  private final UserAccessDataService userAccessDataService;
  private final AccessLevelDataService accessLevelDataService;

  public HasAccessToInstanceWithPrivilegeAspect(
          UserAccessDataService userAccessDataService,
          AccessLevelDataService accessLevelDataService
  )
  {
    this.userAccessDataService = userAccessDataService;
    this.accessLevelDataService = accessLevelDataService;
  }

  @Around("@annotation(hasAccessToInstanceWithPrivilege)")
  public Object accessCheck(
          ProceedingJoinPoint joinPoint,
          final HasAccessToInstanceWithPrivilege hasAccessToInstanceWithPrivilege
  ) throws Throwable
  {
    // gathering information to validate against
    List<String> requiredPrivileges = Arrays
            .stream(hasAccessToInstanceWithPrivilege.privileges())
            .map(Enum::name)
            .toList();

    Principal principal = getPrincipalFromArgs(joinPoint.getArgs());
    String userEmail = principal.getName();

    // check if the user has access to the resource
    UserAccess userAccess = userAccessDataService
            .findByEmailAndInstanceId(userEmail, null)
            .orElseThrow(() -> new ServiceException(ServiceError.I0401));

    if (userAccess.getInstanceUser().getStatus().equals(KhojiUserStatus.REVOKED.name()))
    {
      throw new ServiceException(ServiceError.U0401);
    }

    // check if the user has necessary privileges to access the resource
    if (!(requiredPrivileges.size() == 3))
    {
      checkUserPrivilege(userAccess, requiredPrivileges);
    }

    return joinPoint.proceed();
  }

  private Principal getPrincipalFromArgs(Object[] args)
  {
    for (Object arg : args)
    {
      if (arg instanceof Principal) return (Principal) arg;
    }

    // fallback mechanism in case principal is not part of the method
    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    if (principal instanceof Principal) return (Principal) principal;
    // TODO: check if this check is really required: MUHAMMAD AHMAD
    else if (principal instanceof String) return () -> (String) principal;

    throw new ServiceException(ServiceError.PR0404);
  }

  private void checkUserPrivilege(UserAccess userAccess, List<String> requiredPrivileges)
  {
    // this method can be updated for more fine-grained control over the privileges
    // for now it just checks that actual privileges contains any required privilege
    Set<String> actualPrivileges = new HashSet<>(
            this
                    .accessLevelDataService
                    .getAllowedActions(
                            userAccess
                                    .getInstanceUser()
                                    .getAccessLevel()
                                    .getLevelCode()
                    )
    );

    if (Collections.disjoint(actualPrivileges, requiredPrivileges))
    {
      throw new ServiceException(ServiceError.I1401);
    }
  }
}
