package uk.co.uworx.khoji.agile.controller.dev;

import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

@Component
@Profile("dev")
public class SqlScriptExecutor {
    
    private final JdbcTemplate jdbcTemplate;

    public SqlScriptExecutor(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public void executeSqlFromFile(List<String> filePaths) throws Exception
    {
      StringBuilder sql = new StringBuilder();

      for (String filePath : filePaths)
      {
        ClassPathResource resource = new ClassPathResource(filePath);
        try (InputStream inputStream = resource.getInputStream())
        {
          sql
                  .append(new String(inputStream.readAllBytes()))
                  .append("\n");
        }
        catch (IOException e)
        {
          throw new RuntimeException("Error reading file: " + filePath, e);
        }
      }

      jdbcTemplate.execute(sql.toString());
    }
}
