package uk.co.uworx.khoji.agile;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Component;

import javax.annotation.Nonnull;

@Component
public class BootApplicationContextProviderAgileConfig implements ApplicationContextAware {
    private static ApplicationContext context;

    public static ApplicationContext getContext() {
        return context;
    }

    public static void setContext(ApplicationContext context) {
        BootApplicationContextProviderAgileConfig.context = context;
    }

    @Override
    public void setApplicationContext(@Nonnull ApplicationContext ctx) {
        context = ctx;
    }
}
