/*
 * Copyright 2026 UWorx Services.
 * Licensed under the Apache License, Version 2.0.
 * See LICENSE for the full license text.
 */

package uk.co.uworx.khoji.agile.service;

import jakarta.transaction.Transactional;
import lombok.extern.log4j.Log4j2;
import org.apache.camel.ProducerTemplate;
import org.apache.commons.lang3.ObjectUtils;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import uk.co.uworx.khoji.agile.BootApplicationContextProviderAgileConfig;
import uk.co.uworx.khoji.agile.config.EmailConfig;
import uk.co.uworx.khoji.agile.config.PaymentSubscriptionConfig;
import uk.co.uworx.khoji.agile.context.BootApplicationContextProvider;
import uk.co.uworx.khoji.agile.handler.ConfigHandler;
import uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler;
import uk.co.uworx.khoji.agile.internal.error.ServiceError;
import uk.co.uworx.khoji.agile.internal.error.ServiceException;
import uk.co.uworx.khoji.agile.internal.model.EmailModel;
import uk.co.uworx.khoji.agile.internal.model.ProjectSourceUser;
import uk.co.uworx.khoji.agile.internal.model.User;
import uk.co.uworx.khoji.agile.internal.service.AccessLevelDataService;
import uk.co.uworx.khoji.agile.internal.service.RoleService;
import uk.co.uworx.khoji.agile.internal.service.UserService;
import uk.co.uworx.khoji.agile.internal.service.UserSettingsService;
import uk.co.uworx.khoji.agile.persistence.model.AccessLevel;
import uk.co.uworx.khoji.agile.persistence.model.Instance;
import uk.co.uworx.khoji.agile.persistence.model.InstanceUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUser;
import uk.co.uworx.khoji.agile.persistence.model.KhojiUserStatus;
import uk.co.uworx.khoji.agile.persistence.model.UserSettings;
import uk.co.uworx.khoji.agile.persistence.service.InstanceDataService;
import uk.co.uworx.khoji.agile.persistence.service.InstanceUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.KhojiUserDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserAccessDataService;
import uk.co.uworx.khoji.agile.persistence.service.UserSettingsDataService;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

import static uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler.KHOJI_LOGO_WITHOUT_TEXT;
import static uk.co.uworx.khoji.agile.handler.VelocityTemplateHandler.KHOJI_LOGO_WITH_TEXT;

/**
 * Service for admin
 */
@Service
@Log4j2
public class AdminService
{
  public static final String USER_INVITE_SUBJECT = "ScrumUpdate Invitation";
  public static final String REJOIN_SCRUM_UPDATE_AFTER_ACCESS_IS_ENABLED = "Re-join ScrumUpdate";
  public static final String WELCOME_TO_SCRUM_UPDATE = "Welcome to ScrumUpdate";
  public static final String USER_HAS_BEEN_REVOKED_FROM_SCRUM_UPDATE_SUBJECT = "%s has been revoked from ScrumUpdate";
  public static final String USER_REQUEST_ACCESS = "ScrumUpdate access requested";
  private static final String CRON_JOB = "cron";

  @Autowired
  private VelocityTemplateHandler velocityTemplateHandler;
  @Autowired
  private EmailConfig emailConfig;
  @Autowired
  private AdminService adminService;
  @Autowired
  private SubscriptionService subscriptionService;
  @Autowired
  private ProducerTemplate producerTemplate;
  @Autowired
  private KhojiUserDataService khojiUserDataService;
  @Autowired
  private UserAccessDataService userAccessDataService;
  @Autowired
  private AccessLevelDataService accessLevelDataService;
  @Autowired
  private RoleService rolesDataService;
  @Autowired
  private InstanceUserDataService instanceUserDataService;
  @Autowired
  private InstanceDataService instanceDataService;
  @Autowired
  private UserSettingsDataService userSettingsDataService;

  private ConfigHandler configHandler;
  private UserSettingsService userSettingsService;
  private UserService userService;
  private PaymentSubscriptionConfig paymentSubscriptionConfig;

  /**
   * send user an invitation email again
   *
   * @param username  username
   * @param clientIp  ip
   * @param usernameIdentifier Identify user
   */
  @Transactional
  public User inviteUserAgain(String username, final String clientIp, final String usernameIdentifier)
  {
    Optional<User> OptionalUser = userService.findByEmail(usernameIdentifier);
    if (OptionalUser.isPresent())
    {
      User user = OptionalUser.get();
      sendEmailToUser(user.getEmail(), username, null);
      return user;
    }
    throw new ServiceException(ServiceError.U0100);
  }

  private InstanceUser inviteOrSaveUser(
          String username,
          String clientIp,
          ProjectSourceUser user,
          Instance instance
  )
  {
    boolean userHasEmail = StringUtils.isNotEmpty(user.getEmail());
    InstanceUser inviteUser = new InstanceUser(
            user.getName(),
            user.getAccountId(),
            instance,
            rolesDataService
                    .getRoleById(user.getUserRole().getId())
                    .orElseThrow(() -> new ServiceException(ServiceError.R0404)),
            userHasEmail ? KhojiUserStatus.PENDING : KhojiUserStatus.INCOMPLETE,
            user.getEmail(),
            user.getAvatarURL(),
            accessLevelDataService.findByCode(
                    StringUtils.isNotEmpty(user.getAccessLevel()) ?
                    user.getAccessLevel() :
                    "USER"
            ),
            // TODO: get userSettings from DB and set here once the invite story is done
            //       this will cause issue when this is used for update, for now it is not
            userSettingsDataService.saveOrUpdate(
                    new UserSettings(
                            false,
                            "DAILY"
                    )
            ),
            null,
            null
    );

    InstanceUser instanceUser = instanceUserDataService.saveOrUpdate(inviteUser);
    if (userHasEmail)
    {
      sendEmailToUser(instanceUser.getEmail(), username, null);
    }
    return instanceUser;
  }

  /**
   * TODO: This method can be merged with the above one
   * once project source users refactoring is done
   *
   * Method creates or updates a source user model.
   * If email is provided it sends the email otherwise
   * it creates and INCOMPLETE user
   * @param users
   * @param username
   * @param clientIp
   * @return
   */
  @Transactional
  public List<InstanceUser> createOrUpdateSourceUsers(List<ProjectSourceUser> users, String username, String clientIp)
  {
    log.debug("About to fetch already existing instance users for onboarding");
    List<InstanceUser> instanceUsers = instanceUserDataService.findInstanceUsersByInstanceId(null);

    Map<String, List<InstanceUser>> map = instanceUsers
            .stream()
            .collect(
                    Collectors.groupingBy(
                            InstanceUser::getAccountId
                    )
            );

    log.debug("Already existing users fetched: {}", instanceUsers.size());
    Instance instance = instanceDataService
            .findById(null, true)
            .orElseThrow(() -> new ServiceException(ServiceError.G0100));

    log.debug("Instance fetched: {}", instance.getId());

    List<InstanceUser> addedUsers = new ArrayList<>();

    users.forEach(user -> {
      if (map.containsKey(user.getAccountId()))
      {
        log.debug("About to add: {}", user.getAccountId());
        addedUsers.add(
                updateSourceUser(
                        user,
                        username,
                        clientIp,
                        instance,
                        map.get(user.getAccountId()).get(0)

                )
        );
      }
      else
      {
        addedUsers.add(inviteOrSaveUser(username, clientIp, user, instance));
        log.debug("User added in database against account id: {}", user.getAccountId());
      }
    });

    return addedUsers;
  }

  private InstanceUser updateSourceUser(
          ProjectSourceUser user,
          String username,
          String clientIp,
          Instance instance,
          InstanceUser existingUser
  )
  {
    boolean userHasEmail = StringUtils.isNotEmpty(user.getEmail());
    boolean updateEmail =  userHasEmail && !Objects.equals(existingUser.getEmail(), user.getEmail());

    InstanceUser instanceUser = instanceUserDataService.saveOrUpdate(
            new InstanceUser(
                    existingUser.getId(),
                    user.getName(),
                    user.getAccountId(),
                    existingUser.getTimeZone(),
                    updateEmail ? user.getEmail() : existingUser.getEmail(),
                    rolesDataService
                            .getRoleById(user.getUserRole().getId())
                            .orElseThrow(() -> new ServiceException(ServiceError.R0404)),
                    getAccessLevelForUser(user, existingUser),
                    existingUser.getUserSettings(),
                    existingUser.getStatus().equalsIgnoreCase(KhojiUserStatus.JOINED.name())
                    ? KhojiUserStatus.JOINED.name()
                    : userHasEmail
                      ? KhojiUserStatus.PENDING.name()
                      : KhojiUserStatus.INCOMPLETE.name(),
                    instance,
                    user.getAvatarURL(),
                    existingUser.getLastSeen()
            )
    );

    if (userHasEmail && updateEmail)
    {
      sendEmailToUser(instanceUser.getEmail(), username, null);
    }

    return instanceUser;
  }

  private AccessLevel getAccessLevelForUser(ProjectSourceUser user, InstanceUser existingUser)
  {
    return accessLevelDataService.findByCode(
            StringUtils.isEmpty(user.getAccessLevel())
            ? ObjectUtils.isNotEmpty(existingUser.getAccessLevel())
              ? existingUser.getAccessLevel().getLevelCode()
              : "USER"
            : user.getAccessLevel()
    );
  }

  /**
   * Sends the emailModel in email
   *
   * @param emailQueue       to be used
   * @param emailModel       to be sent
   * @param exceptionMessage to be logged
   */
  public void sendEmail(String emailQueue, EmailModel emailModel, String exceptionMessage)
  {
    if (!emailConfig.isConfigured())
    {
      log.warn("Email not configured (EMAIL_FROM/EMAIL_HOST/EMAIL_USERNAME/EMAIL_PASSWORD missing) — skipping send to {}", emailQueue);
      return;
    }
    try
    {
      producerTemplate.setDefaultEndpointUri(emailQueue);
      producerTemplate.sendBody(emailModel);
    }
    catch (Exception exception)
    {
      log.error(exceptionMessage, exception);
    }
  }

  public void sendEmailToUser(final String email, final String inviteeUsername, String customerId)
  {
    emailConfig = BootApplicationContextProvider
            .getContext()
            .getBean("emailConfig", EmailConfig.class);

    configHandler = BootApplicationContextProvider
            .getContext()
            .getBean("configHandler", ConfigHandler.class);

    Optional<KhojiUser> inviteeUser = khojiUserDataService.findByEmail(inviteeUsername);
    String invitee = inviteeUser.isPresent() ? inviteeUser.get().getFullName() : inviteeUsername;
    String supportEmail = String.format(configHandler.supportEmail);
    boolean isUserTenantAdmin = !StringUtils.isEmpty(customerId);
    Optional<KhojiUser> invitedUser = khojiUserDataService.findByEmail(email);
    String invitedUserName = invitedUser.isPresent() ? invitedUser.get().getFullName() : email;

    Instance invitedInstance = null;
    try
    {
      invitedInstance = instanceDataService
              .findById(null, true)
              .orElseThrow(() -> new ServiceException(ServiceError.I0404));
    }
    catch (Exception exception)
    {
      // this check ensures that if it was invite email for other user and instance is not found
      // then don't send the welcome email instead of invite email because instance is not found
      if (exception instanceof ServiceException serviceException)
      {
        if (serviceException.getResponseCode().equals(ServiceError.I0404.name()))
        {
          throw serviceException;
        }
      }
      log.debug("Skipping instance check for welcome email");
    }

    String signUpUrl = ObjectUtils.isNotEmpty(invitedInstance) ?
                       emailConfig.khojiUrl + "?tab=invitations&instanceId=" + invitedInstance.getId():
                       emailConfig.khojiUrl;

    String html = velocityTemplateHandler.convertInviteUserToEmailHTML(
            invitedUserName,
            invitee,
            signUpUrl,
            isUserTenantAdmin,
            supportEmail,
            ObjectUtils.isNotEmpty(invitedInstance) ? invitedInstance.getInstanceName() : null
    );

    EmailModel emailModel = new EmailModel(
            email,
            isUserTenantAdmin ? WELCOME_TO_SCRUM_UPDATE : USER_INVITE_SUBJECT,
            html,
            LocalDate.now().toString(),
            false,
            getKhojiLogoImages()
    );

    sendEmail(configHandler.jmsEmailQueue, emailModel, "Exception occured while generating user invite email notification for queue");
  }

  /**
   * Sends user revoked email
   * to all the admins
   *
   * @param user revoked
   */
  public void sendUserRevokedEmailToAllAdmins(User user)
  {
    configHandler = BootApplicationContextProvider.getContext().getBean("configHandler", ConfigHandler.class);
    paymentSubscriptionConfig = BootApplicationContextProviderAgileConfig.getContext().getBean("paymentSubscriptionConfig", PaymentSubscriptionConfig.class);
    String fullName = user.getMember().getFullName();
    String html = velocityTemplateHandler.convertRevokedUserToEmailHTML(fullName, user.getMember().getAccountId(), emailConfig.khojiUrl);
    List<User> adminUsers = userSettingsService.getAllTenantAdmins(true, null);
    adminUsers.removeIf(adminUser -> !StringUtils.isEmpty(adminUser.getEmail()) && paymentSubscriptionConfig.exclusionNotifyAdminEmailList.stream().anyMatch(email -> Objects.equals(email, adminUser.getEmail())));
    adminUsers.forEach(adminUser -> {
      EmailModel emailModel = new EmailModel(adminUser.getEmail(), String.format(USER_HAS_BEEN_REVOKED_FROM_SCRUM_UPDATE_SUBJECT, fullName), html, LocalDate.now().toString(), false, getKhojiLogoImages());
      sendEmail(configHandler.jmsEmailQueue, emailModel, "Exception occurred while generating user revoked email notification for queue");
    });
  }

  public List<String> getKhojiLogoImages()
  {
    List<String> images = new ArrayList<>();
    images.add(KHOJI_LOGO_WITHOUT_TEXT);
    return images;
  }
}
