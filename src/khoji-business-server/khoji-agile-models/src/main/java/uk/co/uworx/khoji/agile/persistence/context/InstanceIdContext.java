package uk.co.uworx.khoji.agile.persistence.context;

import org.springframework.stereotype.Component;

@Component
public class InstanceIdContext {
    private static final ThreadLocal<Long> instanceIdHolder = new ThreadLocal<>();

    public static void setInstanceId(String instanceId) {
        instanceIdHolder.set(Long.parseLong(instanceId));
    }

    public static Long getInstanceId() {
        return instanceIdHolder.get();
    }

    public static void clear() {
        instanceIdHolder.remove();
    }
}
