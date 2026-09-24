/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.internal.logging;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.apache.commons.lang3.StringUtils;
import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;

import java.util.ArrayList;

@Aspect
@Component
public class Logging
{
  public static Logger log = LogManager.getLogger(Logging.class);

  @Around("execution(* uk.co.uworx.khoji.agile.internal.service..*(..)))")
  public Object logAllMethods(ProceedingJoinPoint proceedingJoinPoint) throws Throwable
  {
    MethodSignature methodSignature = (MethodSignature) proceedingJoinPoint.getSignature();
    String className = methodSignature.getDeclaringType().getSimpleName();
    String methodName = methodSignature.getName();
    Object result = proceedingJoinPoint.proceed();
    if (proceedingJoinPoint.getArgs().length >= 2)
    {
      ObjectMapper objectMapper = new ObjectMapper();
      objectMapper.registerModule(new JavaTimeModule());
      if (proceedingJoinPoint.getArgs().length >= 2)
      {
        ArrayList<String> args = new ArrayList<>();
        for (Object object : proceedingJoinPoint.getArgs())
        {
          args.add(objectMapper.writeValueAsString(object));
        }
        String ip = proceedingJoinPoint.getArgs().length > 2 && args.get(2) != null ? args.get(2) : "";
        log.debug(getLogMessage(args, className, methodName, ip));
      }
      else
      {
        log.trace("Executed {} {}", className, methodName);
      }
    }
    return result;
  }

  private String getLogMessage(ArrayList<String> args, String className, String methodName, String ip)
  {
    String message = "";

    if (StringUtils.isNotEmpty(args.get(1)))
    {
      message += "User: " + args.get(1);
    }

    message += " " + className + " " + methodName + " " + args.get(0);

    if (StringUtils.isNotEmpty(ip))
    {
      message += " User IP: " + ip;
    }

    return message;
  }
}
