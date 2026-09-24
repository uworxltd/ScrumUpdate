/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */


package uk.co.uworx.khoji.agile.internal.exception;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Mockito;
import org.mockito.MockitoAnnotations;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.HttpStatusCodeException;

/**
 * Test cases for {@link TargetSystemServiceException}
 */
public class TargetSystemServiceExceptionTest
{
  private Fixture fixture;

  @BeforeEach
  public void setUp() throws Exception
  {
    fixture = new Fixture();
  }

  @Test
  public void test_isConnectionException_true()
  {
    fixture.givenResponseStatusIs(HttpStatus.NOT_FOUND);
    fixture.whenCheckedForConnectionException();
    fixture.thenReturnedValueIs(true);
  }

  @Test
  public void test_isConnectionException_false()
  {
    fixture.givenResponseStatusIs(HttpStatus.INTERNAL_SERVER_ERROR);
    fixture.whenCheckedForConnectionException();
    fixture.thenReturnedValueIs(false);
  }

  @Test
  public void test_isServerException_true()
  {
    fixture.givenResponseStatusIs(HttpStatus.INTERNAL_SERVER_ERROR);
    fixture.whenCheckedForServerException();
    fixture.thenReturnedValueIs(true);
  }

  @Test
  public void test_isServerException_false()
  {
    fixture.givenResponseStatusIs(HttpStatus.BAD_REQUEST);
    fixture.whenCheckedForServerException();
    fixture.thenReturnedValueIs(false);
  }

  @Test
  public void test_isValidationException_true()
  {
    fixture.givenResponseStatusIs(HttpStatus.BAD_REQUEST);
    fixture.whenCheckedForValidationException();
    fixture.thenReturnedValueIs(true);
  }

  @Test
  public void test_isValidationException_false()
  {
    fixture.givenResponseStatusIs(HttpStatus.NOT_FOUND);
    fixture.whenCheckedForValidationException();
    fixture.thenReturnedValueIs(false);
  }


  private static class Fixture
  {
    @Mock
    private HttpStatusCodeException responseException;
    @InjectMocks
    private TargetSystemServiceException targetSystemServiceException;

    private boolean actualValue;

    private Fixture()
    {
      MockitoAnnotations.openMocks(this);
    }


    private void givenResponseStatusIs(HttpStatus status)
    {
      Mockito.when(responseException.getStatusCode()).thenReturn(status);
    }

    private void whenCheckedForConnectionException()
    {
      actualValue = targetSystemServiceException.isConnectionException();
    }

    private void whenCheckedForServerException()
    {
      actualValue = targetSystemServiceException.isServerException();
    }

    private void whenCheckedForValidationException()
    {
      actualValue = targetSystemServiceException.isValidationException();
    }

    private void thenReturnedValueIs(boolean expectedValue)
    {
      Assertions.assertEquals(actualValue, expectedValue);
    }

  }

}
