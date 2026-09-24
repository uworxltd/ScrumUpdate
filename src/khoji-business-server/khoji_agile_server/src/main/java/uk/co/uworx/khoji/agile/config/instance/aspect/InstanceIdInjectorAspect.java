package uk.co.uworx.khoji.agile.config.instance.aspect;

import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.CodeSignature;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;

@Aspect
@Component
public class InstanceIdInjectorAspect
{
  @Around("execution(* uk.co.uworx.khoji.agile.persistence.repository.*.*ByInstanceId(..))")
  public Object injectInstanceId(ProceedingJoinPoint joinPoint) throws Throwable
  {
    Object[] args = joinPoint.getArgs();
    int i = getInstanceIdIndex(joinPoint);

    if (i != -1 && args[i] == null)
    {
      Long instanceId = InstanceIdContext.getInstanceId();
      if (instanceId == null)
      {
        throw new ServiceException(ServiceError.I1000);
      }

      args[i] = instanceId;
    }

    return joinPoint.proceed(args);
  }

  public int getInstanceIdIndex(ProceedingJoinPoint joinPoint)
  {
    String[] parameterNames = ((CodeSignature) joinPoint.getSignature()).getParameterNames();

    for (int i = 0; i < parameterNames.length; i++)
    {
      if ("instanceId".equals(parameterNames[i]))
      {
        return i;
      }
    }
    return -1;
  }
}
