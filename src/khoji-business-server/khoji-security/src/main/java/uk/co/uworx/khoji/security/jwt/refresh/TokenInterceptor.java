/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.jwt.refresh;

import io.jsonwebtoken.Claims;
import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.FilterConfig;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.stereotype.Component;
import uk.co.uworx.khoji.security.jwt.JwtTokenService;

import java.io.IOException;

import static uk.co.uworx.khoji.security.jwt.JwtTokenService.updateExpiryTimeAndAuthoritiesInToken;

/**
 * This class is responsible for updating the
 * expiry time and access level in JWT token
 */
@Component
public class TokenInterceptor implements Filter
{

    private final UserDetailsService userDetailsService;

    public TokenInterceptor(UserDetailsService userDetailsService)
    {
        this.userDetailsService = userDetailsService;
    }

    @Override
    public void init(FilterConfig filterConfig) throws ServletException
    {
        Filter.super.init(filterConfig);
    }

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain filterChain) throws IOException, ServletException
    {
        handleInterception((HttpServletRequest) request, (HttpServletResponse) response);
        filterChain.doFilter(request, response);
    }

    @Override
    public void destroy()
    {
        Filter.super.destroy();
    }

    private void handleInterception(HttpServletRequest request, HttpServletResponse response)
    {

        String token = request.getHeader("Authorization");

        if (token == null || !token.startsWith("Bearer ") || JwtTokenService.isUrlAWhiteListUrl(request.getRequestURI())) {
            return;
        }

        Claims claims = JwtTokenService.getClaimsFromToken(token);
        UserDetails userDetails = userDetailsService.loadUserByUsername(claims.getSubject());
        String newToken = updateExpiryTimeAndAuthoritiesInToken(claims, userDetails);
        response.setHeader("Authorization", newToken);
    }
}
