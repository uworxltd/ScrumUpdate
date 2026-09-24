# KBS API Guide

To create a new API, please follow these steps:

---

## Pre-req
Add `copyrights` when a new file is created, add `Java docs` on all the public methods

## Controller Layer
These classes define the API endpoints in the system.

1. **Annotation**: Always annotate your controller class with `@RestController`. The `@Controller` annotation is used for returning views, not for REST APIs.
2. **Endpoint Naming**: Use kebab-case for your endpoints (e.g., `/api/teams/work-log`). Avoid camelCase.
3. **Dependency Injection**: Use `@Autowired` for injecting service or handler classes as needed.
4. **Mapping Annotations**: Use appropriate mapping annotations like `@GetMapping`, `@PostMapping`, `@PutMapping`, and `@DeleteMapping` to define your endpoints.
5. **Swagger guide**: Use `@Operation(summary = "this api does this")` to explain api in swagger. 

## Handler Layer
These classes transform the response from the service layer into models that the frontend can consume.

1. **Annotation**: Annotate handler classes with `@Component`.
2. **Dependency Injection**: You can `@Autowired` services, helper classes, and other handler classes as needed.
3. **Response Models**: Models that are specific to frontend responses should be created within the KBS package.
4. **Validation**: If necessary, perform any response validation or transformation logic within the handler.

## Service Layer
This layer contains all the business logic, including transforming the data fetched from various sources.

1. **Annotation**: Annotate service classes with `@Service`.
2. **Dependency Injection**: Services can `@Autowired` other services, helper classes, and repositories as needed.
3. **Transaction Management**: Use `@Transactional` annotation where necessary to manage database transactions otherwise avoid this.
4. **Error Handling**: Implement proper error handling and logging within the service layer.
5. **Service Error**; Define service error code in `ServiceError` and throw `ServiceException`.

## IDataClient & ClientImpl
These interfaces and classes handle communication with external data sources.

1. **Interface Definition**: Define an interface (`IDataClient`) that declares methods for interacting with the data source.
2. **Implementation**: Create a concrete implementation class (`ClientImpl`) that implements the interface and contains the actual logic for communication with the data source.
3. **Error Handling**: Implement robust error handling, including retries and fallbacks if necessary.
4. **Configuration**: Use Spring's `@ConfigurationProperties` or `@Value` annotations to manage external service URLs and credentials.

---

### Additional Recommendations
- **Exception Handling**: Use generic `ServiceException` handling class for throwing errors.
- **Logging**: Add `final static Logger logger = LogManager.getLogger(Khoji.class)` for adding logs. Use INFO logs when needed on prod environment. Use DEBUG logs on each step. Use ERROR log to print the complete error.
- **Security**: Ensure that your API endpoints are secured using Spring Security. Use the following annotations:
- 1. `@AuthorizeTenantAdminLevelAPIs` for apis that are only accessible by `Tenant Admins`.
- 2. `@AuthorizeAdminLevelAPIs` for apis that are accessible by `Admin` and `Tenant Admin`.
2. Use these annotations when defining a model class
   @Getter
   @Setter
   @ToString
   @EqualsAndHashCode
   @NoArgsConstructor
   @AllArgsConstructor
   @RequiredArgsConstructor
