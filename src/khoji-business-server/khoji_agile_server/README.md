# Khoji Agile Server
This service serves as the central backend for Khoji for Agile, providing a unified platform for managing and processing business data. Built with Spring Boot, it integrates various Khoji sub-modules to facilitate efficient business operations.

Core responsibilities include receiving and responding to API calls, fetching data from source, performing necessary business logic on retrieved data, and returning structured and informative API responses for consumption by external applications.

## High Level Overview:

[//]: # (![Role of Khoji Agile Server]&#40;kbs_diagram_readme.png&#41; )

Khoji Agile Server acts as a first class middleware which receives requests from the front-end and uses its various interfaces to other service dependencies to fulfil such requests. Service dependencies can be external systems or embedded submodules alike.

## Technical Specifications:
#### Programming Language + Framework: 
Java - Spring Boot
#### Deployment Environment:
Docker Compose
#### Deployment Process:
Application code is packaged in Docker container and deployed on the various khoji servers using docker compose. A CI/CD pipeline on Bitbucket is responsible to create images and upload them to Khoji Docker Registry.

### External Dependencies & Integrations
#### Data Source:
Represents the source of all the data on which Khoji runs. Can be Jira or ES (ES is not supported in cloud version). Once configured, all data required upon user interaction with Khoji is fetched from this source.
#### MySQL Database:
Stores all customer facing data, members info, project source configuration info, teams etc.
#### ❌ Evaluator (not supported in cloud version):
Property store used for externalized dynamic configuration in Khoji Agile Server. Stores key-value properties inside a redis instance and returns property values upon request.
#### Khoji Billing Processor:
Custom Khoji application to track user subscriptions. Khoji Agile Server queries the billing processor to figure out if a customer has an active subscription and appropriately controls the authentication flow.
#### ❌ Elasticsearch (not supported in cloud version):
Although not always required, ES can be configured as the primary data source to fetch all data along with storing QuickSearch info for Khoji's homepage.
#### ActiveMQ:
Message Broker used to co-ordinate disparate operations in the Khoji Stack. Primarily used in Khoji Agile Server in combination with Apache Camel to generate emails. 


## Build & Run

### Checkout KBS to develop-cloud branch

### Windows:
-> Rename the `set-khoji-env.bat.sample` to `set-khoji-env.bat` and update the passwords/values if needed
-> In `run-cloud-dev.bat` set `-Dspring.sql.init.mode=always` to create khoji admin schema in MySQL and apply dump. (Only for the 1st time to create & populate schema)  
-> Run `buildNoTest.bat` to build the application without running tests.  
-> Run with `run-cloud-dev.bat`

### Linux:
-> In `application.properties` set `-Dspring.datasource.initialization-mode=always` to create khoji schema in MySQL and apply dump. (Only for the 1st time to create & populate schema)   
-> Run `mvn clean install -DskipTests=true` to build the application without running tests.  
-> Run with `run-cloud-dev.sh`
### Running unit tests:
To run all unit tests, running `build.bat` should build the application and run all unit tests also. Alternatively, to selectively run specific unit tests only, use the `run-test-debug.bat`

## Further Help
Explore the sharepoint documentation for specific features etc in Khoji Agile Server.

## Entity Relationship Diagram of Database Schema:
https://dbdiagram.io/d/ERD-diagram-6729b46de9daa85aca54bc12