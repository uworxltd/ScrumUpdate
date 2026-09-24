/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.filter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.log4j.Log4j2;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingRequestWrapper;
import org.springframework.web.util.ContentCachingResponseWrapper;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.persistence.context.InstanceIdContext;
import uk.co.uworx.khoji.agile.persistence.context.TenantIdContext;
import uk.co.uworx.khoji.security.helper.SecurityConstants;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 11)
@Log4j2
public class LoggingPerRequestFilter extends OncePerRequestFilter
{

  private static ContentCachingRequestWrapper wrapRequest(HttpServletRequest request)
  {
    if (request instanceof ContentCachingRequestWrapper)
    {
      return (ContentCachingRequestWrapper) request;
    }
    return new ContentCachingRequestWrapper(request);
  }

  private static ContentCachingResponseWrapper wrapResponse(HttpServletResponse response)
  {
    if (response instanceof ContentCachingResponseWrapper)
    {
      return (ContentCachingResponseWrapper) response;
    }
    return new ContentCachingResponseWrapper(response);
  }

  protected void doFilterWrapped(
          ContentCachingRequestWrapper request,
          ContentCachingResponseWrapper response,
          FilterChain filterChain
  ) throws IOException, ServletException
  {
    try
    {
      filterChain.doFilter(request, response);
    }
    catch (Exception exception)
    {
      log.error("An error occurred: {}", exception.getMessage(), exception);
      // this is specifically to handle the error when it comes out of the authorization/authentication chain
      // from this chain exception is caught here and not in problem support(ExceptionTranslator.java)
      if (exception instanceof ServiceException serviceException)
      {
        if (serviceException.getResponseCode().equals("SE003"))
        {
          response.setStatus(serviceException.getStatus().getStatusCode());
          // handling for this code is already done on FE in case of an error so instead of throwing SE003
          // we are throwing this so that we can ask the user to login again through code.
          response.setHeader(SecurityConstants.CUSTOM_ERROR, "SE008");
          return;
        }
      }
      throw exception;
    }
    response.copyBodyToResponse();
  }

  @Override
  protected void doFilterInternal(
          HttpServletRequest request,
          HttpServletResponse response,
          FilterChain filterChain
  ) throws jakarta.servlet.ServletException, IOException
  {
    doFilterWrapped(wrapRequest(request), wrapResponse(response), filterChain);
    InstanceIdContext.clear();
    TenantIdContext.clear();
  }
}
