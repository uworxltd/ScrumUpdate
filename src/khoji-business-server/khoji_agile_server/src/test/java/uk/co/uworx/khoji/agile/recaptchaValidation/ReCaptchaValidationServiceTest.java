package uk.co.uworx.khoji.agile.recaptchaValidation;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;

public class ReCaptchaValidationServiceTest
{
  private Fixture fixture;

  @BeforeEach
  void setUp()
  {
    fixture = new Fixture();
  }

  @Test
  void blankSecret_returnsFalse()
  {
    fixture.givenRecaptchaSecret("");
    fixture.whenValidateCaptchaIsCalled();
    fixture.thenResultIsFalse();
  }

  @Test
  void nullSecret_returnsFalse()
  {
    fixture.givenRecaptchaSecret(null);
    fixture.whenValidateCaptchaIsCalled();
    fixture.thenResultIsFalse();
  }

  @Test
  void swarmFallbackSecret_returnsFalse()
  {
    fixture.givenRecaptchaSecret("/run/secrets/recaptcha-secret");
    fixture.whenValidateCaptchaIsCalled();
    fixture.thenResultIsFalse();
  }

  private static class Fixture
  {
    private final ReCaptchaValidationService service;
    private boolean result;

    Fixture()
    {
      service = new ReCaptchaValidationService();
      service.googleRecaptchaEndpoint = "https://www.google.com/recaptcha/api/siteverify";
    }

    private void givenRecaptchaSecret(String secret)
    {
      service.recaptchaSecret = secret;
    }

    private void whenValidateCaptchaIsCalled()
    {
      result = service.validateCaptcha("test-captcha-response");
    }

    private void thenResultIsFalse()
    {
      assertFalse(result);
    }
  }
}
