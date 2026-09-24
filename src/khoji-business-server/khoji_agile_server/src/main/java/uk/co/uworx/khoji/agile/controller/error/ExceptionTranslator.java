package uk.co.uworx.khoji.agile.controller.error;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.dao.ConcurrencyFailureException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.BindException;
import org.springframework.validation.BindingResult;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.ServletRequestBindingException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.NativeWebRequest;
import org.zalando.problem.Problem;
import org.zalando.problem.spring.web.advice.ProblemHandling;
import org.zalando.problem.spring.web.advice.security.SecurityAdviceTrait;
import org.zalando.problem.violations.ConstraintViolationProblem;
import org.zalando.problem.violations.Violation;
import uk.co.uworx.khoji.agile.internal.error.FieldError;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.stats.provider.jira.exception.SourceSystemServiceException;

import javax.annotation.Nonnull;
import javax.annotation.Nullable;
import java.net.SocketTimeoutException;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Controller advice to translate the server side exceptions to client-friendly json structures. The
 * error response follows RFC7807 - Problem Details for HTTP APIs
 * (https://tools.ietf.org/html/rfc7807).
 */
@RestControllerAdvice
public class ExceptionTranslator implements ProblemHandling, SecurityAdviceTrait
{

  private static final Logger LOG = LoggerFactory.getLogger(ExceptionTranslator.class);

  private static final String FIELD_ERRORS_KEY = "fieldErrors";
  private static final String VIOLATIONS_KEY = "violations";
  public static final String APP_NOT_INSTALLED_FOR_INSTANCE = "The app is not installed on this instance";


  @Override
  public ResponseEntity<Problem> process(@Nullable ResponseEntity<Problem> entity, NativeWebRequest request)
  {

    if (entity == null)
    {
      // last resort
      final ResponseEntity<Problem> problemResponseEntity = new ResponseEntity<Problem>(new ServiceException(ServiceError.G0000), ServiceError.G0000.getHttpStatus());
      return problemResponseEntity;
    }
    Problem problem = entity.getBody();
    // already formatted
    if (problem instanceof ServiceException)
    {
      return entity;
    }

    String message = problem.getDetail() == null ? problem.getTitle() : problem.getDetail();
    ServiceException se = new ServiceException(ServiceError.G0400, message, null);
    Object obj = problem.getParameters().get(VIOLATIONS_KEY);
    if (obj instanceof List<?>)
    {
      ((List<Violation>) obj).forEach(v -> {
        se.addFieldErrorsItem(new FieldError("request", v.getField(), v.getMessage()));
      });
    }
    obj = problem.getParameters().get(FIELD_ERRORS_KEY);
    if (obj instanceof List<?>)
    {
      ((List<FieldError>) obj).forEach(fe -> se.addFieldErrorsItem(fe));
    }
    setFieldErrorsForConstraintViolation(problem, se);
    return new ResponseEntity<>(se, entity.getHeaders(), entity.getStatusCode());
  }

  private void setFieldErrorsForConstraintViolation(Problem problem, ServiceException se) {
    if(problem instanceof ConstraintViolationProblem)
    {
      for (Violation violation : ((ConstraintViolationProblem) problem).getViolations()) {
        FieldError error = new FieldError("", violation.getField(), violation.getMessage());
        se.addFieldErrorsItem(error);
      }
    }
  }

  @ExceptionHandler(ServiceException.class)
  public ResponseEntity<Problem> handleServiceException(ServiceException ex, NativeWebRequest request)
  {
    return create(ex, request);
  }

  @Override
  public ResponseEntity<Problem> handleMethodArgumentNotValid(MethodArgumentNotValidException ex, @Nonnull NativeWebRequest request) {

    BindingResult result = ex.getBindingResult();

    List<FieldError> fieldErrors =
        result.getFieldErrors().stream()
            .map(f -> new FieldError(f.getObjectName(), f.getField(), f.getDefaultMessage()))
            .collect(Collectors.toList());

    Problem problem =
        Problem.builder()
            .withTitle("Method argument not valid")
            .withStatus(defaultConstraintViolationStatus())
            .with(FIELD_ERRORS_KEY, fieldErrors)
            .build();
    return create(ex, problem, request);
  }


  @ExceptionHandler
  public ResponseEntity<Problem> handleConcurrencyFailure(ConcurrencyFailureException ex, NativeWebRequest request) {
    ServiceException exception =null;
    return create(exception, request);
  }


  @Override
  public ResponseEntity<Problem> handleRequestMethodNotSupportedException(HttpRequestMethodNotSupportedException ex,
                                                                          NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0402, "Invalid Request Method"), request);
  }

  @Override
  public ResponseEntity<Problem> handleServletRequestBinding(ServletRequestBindingException ex, NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0400, ex.getMessage()), request);
  }

  @Override
  public ResponseEntity<Problem> handleMissingServletRequestParameter(MissingServletRequestParameterException ex,
                                                                      NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0400), request);
  }

  @Override
  public ResponseEntity<Problem> handleBindingResult(BindException ex, NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0400), request);
  }

  @Override
  public ResponseEntity<Problem> handleMessageNotReadableException(HttpMessageNotReadableException ex,
                                                                   NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0400), request);
  }

  @Override
  public ResponseEntity<Problem> handleMediaTypeNotSupportedException(HttpMediaTypeNotSupportedException ex,
                                                                      NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0403), request);
  }

  @Override
  public ResponseEntity<Problem> handleTypeMismatch(TypeMismatchException ex, NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0400), request);
  }

  @Override
  public ResponseEntity<Problem> handleSocketTimeout(SocketTimeoutException ex, NativeWebRequest request) {
    return create(new ServiceException(ServiceError.G0100), request);
  }

  @ExceptionHandler(value = SourceSystemServiceException.class)
  public ResponseEntity<Problem> handleSourceSystemServiceException(SourceSystemServiceException exception, final NativeWebRequest request)
  {
    if (exception.isConnectionException())
    {
      return create(
              new ServiceException(
                      ServiceError.GO503,
                      ServiceError.GO503.getMessageForTargetSystem(exception.getSystemCode().getSystemName()),
                      null
              ),
              request
      );
    }

    if (exception.isUnauthorizedException())
    {
      return create(new ServiceException(ServiceError.SE003), request);
    }

    if (exception.isForbiddenRequestException(APP_NOT_INSTALLED_FOR_INSTANCE))
    {
      return create(new ServiceException(ServiceError.SE001), request);
    }

    if (exception.isForbiddenRequestException())
    {
      return create(new ServiceException(ServiceError.SE002), request);
    }

    return create(new ServiceException(ServiceError.G0000, "Unknown Please contact support.", null), request);
  }

  /**
   * This Exception Handler catches the unhandled
   * exceptions and throw INTERNAL SERVER ERROR
   * If a user is unauthorized it throws 401
   * @param throwable
   * @param request
   * @return
   */
  @ExceptionHandler(Throwable.class)
  @Override
  public ResponseEntity<Problem> handleThrowable(Throwable throwable, NativeWebRequest request) {
    LOG.error("Last resort exception handler used for: {}", throwable.getClass().getName(), throwable);
    if(throwable instanceof AccessDeniedException)
    {
      return create(new ServiceException(ServiceError.UA001), request);
    }
    return create(new ServiceException(ServiceError.G0000, "Unknown Please contact support.", null), request);
  }

}
