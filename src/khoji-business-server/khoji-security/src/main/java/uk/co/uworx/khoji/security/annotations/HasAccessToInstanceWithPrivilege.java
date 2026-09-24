package uk.co.uworx.khoji.security.annotations;

import uk.co.uworx.khoji.agile.internal.helper.SecurityAccessLevel;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

@Retention(RetentionPolicy.RUNTIME)
@Target(
        {
                ElementType.METHOD
        }
)
public @interface HasAccessToInstanceWithPrivilege
{
        SecurityAccessLevel[] privileges() default  {
                SecurityAccessLevel.TENANT_ADMIN,
                SecurityAccessLevel.ADMIN,
                SecurityAccessLevel.USER
        };
}
