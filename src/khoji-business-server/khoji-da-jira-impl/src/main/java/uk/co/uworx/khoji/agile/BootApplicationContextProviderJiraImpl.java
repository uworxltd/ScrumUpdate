package uk.co.uworx.khoji.agile;

import lombok.Getter;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import javax.annotation.Nonnull;

@Component
public class BootApplicationContextProviderJiraImpl implements ApplicationContextAware
{
  @Getter private static ApplicationContext context;

  public static void setContext(ApplicationContext context)
  {
    BootApplicationContextProviderJiraImpl.context = context;
  }

  @Override
  public void setApplicationContext(@Nonnull ApplicationContext ctx)
  {
    context = ctx;
  }

}
