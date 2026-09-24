/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.security.jwt;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;
import org.springframework.util.AntPathMatcher;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.Principal;
import java.security.SecureRandom;
import java.util.Arrays;
import java.util.Base64;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.regex.PatternSyntaxException;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.security.helper.SecurityConstants.COLON;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.PASSWORD;
import static uk.co.uworx.khoji.security.helper.SecurityConstants.USERNAME;

@Service
public class JwtTokenService
{
  private static int tokenExpirationTimeStatic = 1440; //24 hours - default time.
  private static final SecretKey secretKey = Keys.hmacShaKeyFor(
          Objects.requireNonNull(
                  BootApplicationContextProviderAgileConfig
                          .getContext()
                          .getEnvironment()
                          .getProperty("jwt.secure.random")
          ).getBytes(StandardCharsets.UTF_8)
  );

  //!!IMPORTANT: DON'T EXPOSE THESE URLS AS CONFIGS. SECURITY BREACH. Otherwise, we can configure any URL to be open.
  public static final String[] WHITELIST_URLS = {
          "*.html",
          "/signup",
          "/khoji-ws",
          "/validate/*",
          "/actuator/**",
          "/invalidate/**", // make sure you wrap it inside the dev profile like Reset controller
          "/swagger-ui/**",
          "/systemConfigs",
          "/v3/api-docs/**",
          "/request/access",
          "/signup/validate",
          "/angular/appConfig",
          "/wrapper/appConfig",
          "/recaptcha/validate",
          "/user/against-token",
          "/user/forgot-password",
          "/wrapper/reportConfig",
          "/user/update-password",
          "/update-password/validate",
          "/payment/signup/hosted-page",
          "/signup/validateUserInformation"
  };

  @Value("${jwtTokenExpiryMinutes:1440}")
  public void setTokenExpirationTime(int expirationTime)
  {
    JwtTokenService.tokenExpirationTimeStatic = expirationTime;
  }

  public static String generateToken(String username, Map<String, ?> claims)
  {
    return Jwts
            .builder()
            .header()
            .add("typ", "JWT")
            .and()
            .claims(claims)
            .subject(username)
            .expiration(new Date(System.currentTimeMillis() + getTokenExpirationTime()))
            .signWith(secretKey)
            .compact();
  }

  private static long getTokenExpirationTime()
  {
    return (long) tokenExpirationTimeStatic * 60 * 1000;
  }

  public static void verifyToken(String token) throws JwtException
  {
    Jwts
            .parser()
            .verifyWith(secretKey)
            .build()
            .parse(getTokenWithoutBearerText(token));
  }

  public static Claims getClaimsFromToken(String token)
  {
    return Jwts
            .parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(getTokenWithoutBearerText(token))
            .getPayload();
  }

  /**
   * This method updates the expiry minutes in the token
   * and also the authorities (USER/ADMIN/TENANT ADMIN)
   *
   * @param claims
   * @param userDetails
   * @return
   */
  public static String updateExpiryTimeAndAuthoritiesInToken(Map<String, Object> claims, UserDetails userDetails)
  {
    List<String> authorities = userDetails
            .getAuthorities()
            .stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.toList());

    Map<String, Object> mutableClaims = new HashMap<>(claims);
    mutableClaims.put("authorities", authorities);

    return Jwts
            .builder()
            .header()
            .add("typ", "JWT")
            .and()
            .claims(mutableClaims)
            .expiration(new Date(System.currentTimeMillis() + getTokenExpirationTime()))
            .signWith(secretKey)
            .compact();
  }

  /**
   * Fetches claim for the receivedToken,
   * returns new expired JWT token
   *
   * @param receivedToken to be refreshed
   * @return expired JWT token
   */
  public static String getNewExpiredToken(String receivedToken)
  {
    Claims claims = getClaimsFromToken(receivedToken);
    return Jwts
            .builder()
            .header()
            .add("typ", "JWT")
            .and()
            .claims(claims)
            .expiration(new Date(System.currentTimeMillis() - 1000))
            .signWith(secretKey)
            .compact();
  }

  private static String decodeBasicAuthToken(String token) throws IllegalArgumentException, IndexOutOfBoundsException
  {
    return new String(Base64.getDecoder().decode(token.substring(6)));
  }

  /**
   * Decodes the token and returns
   * username or password. Accepted
   * key values are USERNAME or PASSWORD.
   *
   * @param token to decrypt
   * @param key   to find "USERNAME" or "PASSWORD"
   * @return null if key is invalid, else username or password
   * @throws NullPointerException   if token is invalid
   * @throws PatternSyntaxException if decrypted token pattern is incorrect
   */
  public static String extractKeyFromDecodedToken(String token, String key) throws NullPointerException, PatternSyntaxException
  {
    if (Objects.equals(key, USERNAME))
    {
      return Arrays.asList(decodeBasicAuthToken(token).split(COLON)).get(0);
    }
    else if (Objects.equals(key, PASSWORD))
    {
      return Arrays.asList(decodeBasicAuthToken(token).split(COLON)).get(1);
    }
    else
    {
      return null;
    }
  }

  /**
   * This method extracts the authorities of
   * logged-in user
   *
   * @param principal
   * @return
   */
  public static String getAccessLevelForLoggedInUser(Principal principal)
  {
    if (principal == null)
    {
      return null;
    }
    Authentication authentication = (Authentication) principal;
    return authentication.getAuthorities().iterator().next().getAuthority();
  }

  /**
   * This method returns true if the
   * WHITE LIST URL is passed in param
   *
   * @param url
   * @return boolean
   */
  public static boolean isUrlAWhiteListUrl(String url) {
    AntPathMatcher matcher = new AntPathMatcher();
    for (String pattern : WHITELIST_URLS) {
      if (matcher.match(pattern, url)) {
        return true;
      }
    }
    return false;
  }

  private static String getTokenWithoutBearerText(String token)
  {
    return token.replace("Bearer ", "");
  }
}
