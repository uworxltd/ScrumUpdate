package uk.co.uworx.khoji.agile.internal.logging;

import org.apache.logging.log4j.Logger;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.reflect.MethodSignature;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.MockitoAnnotations;
import uk.co.uworx.khoji.agile.internal.model.User;

import java.util.ArrayList;

import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

public class LoggingTest
{
  private Fixture fixture;

  @BeforeEach
  public void setUp() throws Exception
  {
    fixture = new Fixture();
  }

  @Test
  public void logAllmethodsTest() throws Throwable
  {
    fixture.givenAspectsMocked();
    fixture.whenServicesRequested();
    fixture.thenAssert();
  }

  private static class Fixture
  {
    @Mock
    private ProceedingJoinPoint joinPoint;
    @Mock
    private MethodSignature signature;
    @Mock
    private Logger logger;

    private ArrayList<Object> objects;
    private Logging logging;

    private Fixture()
    {
      MockitoAnnotations.openMocks(this);
    }

    private void givenAspectsMocked()
    {
      User user = new User();
      user.setUsername("LoggingTest");
      objects = new ArrayList<>();
      objects.add(user);
      objects.add("LoggingTest");
      logging = new Logging();
      Logging.log = logger;
    }

    private void whenServicesRequested()
    {
      when(joinPoint.getSignature()).thenReturn(signature);
      when(signature.getDeclaringType()).thenReturn(MethodSignature.class);
      when(joinPoint.getArgs()).thenReturn(objects.toArray());
    }

    private void thenAssert() throws Throwable
    {
      logging.logAllMethods(this.joinPoint);
      verify(logger, times(1)).debug("User: \"LoggingTest\" MethodSignature null {\"id\":null,\"username\":\"LoggingTest\",\"email\":null,\"currentMenuCode\":null,\"member\":null,\"teams\":null,\"activationCode\":null,\"userAgreement\":false,\"privacyPolicy\":false,\"createdAt\":null,\"updatedAt\":null,\"userStatuses\":null,\"accountId\":null,\"accessLevel\":null,\"emailWorkLog\":null,\"isFirstTenantAdmin\":null,\"avatarURL\":null,\"userProfileImage\":null,\"activeInSourceSystem\":false,\"emailFrequency\":null,\"tenantId\":null,\"status\":null,\"lastSeen\":null}");
    }

  }

}
