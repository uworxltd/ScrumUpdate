# Development
### mvn except https and our artifacotry is not offoicialy so bypassing maven flag here and forcing our settings.xml so correct one is picked regardless of your system settings.
 mvn clean install -DskipTests "-Djdk.tls.client.enableSNIExtension=false" -s settings.xml
 
## Building
`mvn clean install` in the root of the `khoji-business-server` 

### Updating versions.
 `<revision>cloud-1.2.1-KFA-26030-SNAPSHOT</revision>`
or
`mvn -Drevision=<version> clean install`

## Inter Module dependencies
    + Bussiness Server Boot (parent module)
    |--- + Bussiness Server Main(main bussiness server)
    |    |--- Bussiness Server Security (Models excluded. Security for Bussiness server)
    |    |--- Bussiness Server Email Processor(email functionality for bussiness server)
    |    |--- + Bussiness Server API Jira Impl(Jira implementations of Bussiness Server API)
    |         |--- + Bussiness Server Tenant Registry(provides beans for transformers and impls if multiple)
    |              |--- + Bussiness Server API(holds API definitions to be used by source Impls)
    |                   |--- + Bussiness Server Models(holds models used for proccessing)
    |                        |--- Bussiness Server config(holds configurations used in khoji)

## How to Run Server
-  `mvn spring-boot:run` into `khoji_agile_server`
-  Intellij , Import -> `KhojiServerApplication.java` -> Play.
