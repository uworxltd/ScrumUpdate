package uk.co.uworx.khoji.agile.controller.dev;

import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/invalidate")
@Profile("dev")
public class Reset
{
  private final SqlScriptExecutor sqlScriptExecutor;

  public Reset(
          SqlScriptExecutor sqlScriptExecutor
  )
  {
    this.sqlScriptExecutor = sqlScriptExecutor;
  }

  @GetMapping("/db/rebuild")
  public ResponseEntity<Map<String, String>> resetDbToDefaultState() throws Exception
  {
    sqlScriptExecutor.executeSqlFromFile(
            List.of("drop-schema.sql", "schema-self-onboarding.sql", "data-self-onboarding.sql")
    );
    return new ResponseEntity<>(
            Map.of("message", "success"),
            HttpStatus.OK
    );
  }
}
