package uk.co.uworx.khoji.agile.config.instance.filter;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.apache.commons.collections4.CollectionUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.HandlerInterceptor;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.security.jwt.JwtTokenService;

import java.security.Principal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.SECURITY_ROLE_APP;

@Component
@Log4j2
public class InstanceIdFromRequestInterceptor implements HandlerInterceptor
{
  @Autowired
  private InstanceUserDataService instanceUserDataService;
  @Autowired
  private InstanceDataService instanceDataService;
  // FIRST: instanceId, SECOND: username/email, THIRD: day
  private final Map<String, Map<String, LocalDate>> lastSeenMap = new ConcurrentHashMap<>();

  @Override
  public boolean preHandle(
          HttpServletRequest request,
          HttpServletResponse response,
          Object handler
  )
  {
    List<SimpleGrantedAuthority> roles = (List<SimpleGrantedAuthority>) SecurityContextHolder
            .getContext()
            .getAuthentication()
            .getAuthorities()
            .stream()
            .toList();

    try
    {
      if (JwtTokenService.isUrlAWhiteListUrl(request.getRequestURI()))
      {
        return true;
      }

      if (CollectionUtils.isNotEmpty(roles) &&
          roles
                  .get(0)
                  .getAuthority()
                  .equals(SECURITY_ROLE_APP)
      )
      {
        return true;
      }

      String instanceId = request.getHeader("instance_id");

      if (StringUtils.hasLength(instanceId))
      {
        updateUserLastSeen(instanceId);

        Instance instance = instanceDataService
                .findById(Long.parseLong(instanceId), false)
                .orElseThrow(() -> new ServiceException(ServiceError.I0404));

        InstanceIdContext.setInstanceId(instanceId);
        TenantIdContext.setTenantId(instance.getTenantId());
      }

      return true;
    }
    catch (ServiceException serviceException)
    {
      log.error(serviceException.getMessage());
      throw serviceException;
    }
    catch (Exception ex)
    {
      log.error(ex.getMessage());
      return false;
    }
  }

  private void updateUserLastSeen(String instanceId)
  {
    var userOnRequest = SecurityContextHolder.getContext().getAuthentication().getName();
    var todayDate = LocalDate.now();

    var userDateMap = lastSeenMap.computeIfAbsent(instanceId, key -> new ConcurrentHashMap<>());

    var lastSeenDate = userDateMap.get(userOnRequest);
    if (lastSeenDate == null || todayDate.isAfter(lastSeenDate)) {
      updateUserLastSeenInDbAndMap(instanceId, userOnRequest, todayDate);
    }
  }

  private void updateUserLastSeenInDbAndMap(String instanceId, String userOnRequest, LocalDate todayDate)
  {
    lastSeenMap.get(instanceId).put(userOnRequest, todayDate);
    // update in db asynchronously
    instanceUserDataService.updateLastSeenOfInstanceUser(
            userOnRequest,
            Long.parseLong(instanceId),
            Instant.now()
    );
  }

  @Override
  public void afterCompletion(
          HttpServletRequest request,
          HttpServletResponse response,
          Object handler,
          Exception ex
  ) throws Exception
  {
    InstanceIdContext.clear();
    TenantIdContext.clear();
    HandlerInterceptor.super.afterCompletion(request, response, handler, ex);
  }

  public static String getPrincipalName()
  {
    Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    if (principal instanceof Principal springPrincipal)
    {
      return springPrincipal.getName();
    }
    else
    {
      return principal.toString();
    }
  }
}

