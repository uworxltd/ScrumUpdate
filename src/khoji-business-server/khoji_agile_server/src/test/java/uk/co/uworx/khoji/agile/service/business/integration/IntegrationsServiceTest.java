package uk.co.uworx.khoji.agile.service.business.integration;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

public class IntegrationsServiceTest
{
  private Fixture fixture;

  @BeforeEach
  void setUp()
  {
    fixture = new Fixture();
  }

  @Test
  void blankOauth_isNotConfiguredAndIntegrationIsIgnored()
  {
    fixture.givenOauth("", "", "");
    fixture.whenConfigurationIsChecked();
    fixture.thenCalendarIsNotConfigured();
    fixture.whenIntegrationIsRead();
    fixture.thenIntegrationIsEmpty();
  }

  @Test
  void nullOauth_isNotConfiguredAndIntegrationIsIgnored()
  {
    fixture.givenOauth(null, null, null);
    fixture.whenConfigurationIsChecked();
    fixture.thenCalendarIsNotConfigured();
    fixture.whenIntegrationIsRead();
    fixture.thenIntegrationIsEmpty();
  }

  @Test
  void whitespaceOauth_isNotConfigured()
  {
    fixture.givenOauth("  ", "secret", "http://localhost/callback");
    fixture.whenConfigurationIsChecked();
    fixture.thenCalendarIsNotConfigured();
  }

  @Test
  void clientIdOnly_isNotConfigured()
  {
    fixture.givenOauth("client-id", "", "");
    fixture.whenConfigurationIsChecked();
    fixture.thenCalendarIsNotConfigured();
  }

  @Test
  void fullOauth_isConfigured()
  {
    fixture.givenOauth("client-id", "client-secret", "http://localhost/callback");
    fixture.whenConfigurationIsChecked();
    fixture.thenCalendarIsConfigured();
  }

  private static class Fixture
  {
    private final IntegrationsService service;
    private boolean configured;
    private Optional<?> integration;

    Fixture()
    {
      service = new IntegrationsService();
    }

    private void givenOauth(String clientId, String clientSecret, String redirectUri)
    {
      service.msClientId = clientId;
      service.msClientSecret = clientSecret;
      service.msRedirectUri = redirectUri;
    }

    private void whenConfigurationIsChecked()
    {
      configured = service.isMsCalendarConfigured();
    }

    private void whenIntegrationIsRead()
    {
      integration = service.getIntegration(null);
    }

    private void thenCalendarIsNotConfigured()
    {
      assertFalse(configured);
    }

    private void thenCalendarIsConfigured()
    {
      assertTrue(configured);
    }

    private void thenIntegrationIsEmpty()
    {
      assertTrue(integration.isEmpty());
    }
  }
}
