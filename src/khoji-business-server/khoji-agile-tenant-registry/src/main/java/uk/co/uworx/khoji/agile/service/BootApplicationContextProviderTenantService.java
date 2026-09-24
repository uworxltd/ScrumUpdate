package uk.co.uworx.khoji.agile.service;

import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import javax.annotation.Nonnull;

@Component
public class BootApplicationContextProviderTenantService implements ApplicationContextAware {
    private static ApplicationContext context;

    public static ApplicationContext getContext() {
        return context;
    }

    public static void setContext(ApplicationContext context) {
        BootApplicationContextProviderTenantService.context = context;
    }

    @Override
    public void setApplicationContext(@Nonnull ApplicationContext ctx) {
        context = ctx;
    }
}
